// ─── AI Engine ───────────────────────────────────────────────────────────────
// Pure service layer — no React hooks.
// Uses Supabase directly + optional AI API enhancement.

import {
  format, subDays, addDays, getDay,
  differenceInCalendarDays, parseISO,
} from 'date-fns'
import { supabase }            from '../lib/supabase'
import { generateAIResponse }  from './aiProvider'

// ─── Public types ──────────────────────────────────────────────────────────────

export interface SubjectBehavior {
  subjectId:         string
  subjectName:       string
  color:             string
  totalSeconds:      number
  percentage:        number
  sessionCount:      number
  avgSessionSeconds: number
  lastStudied:       string | null
}

export interface BehaviorProfile {
  userId:               string
  periodDays:           number
  totalStudySeconds:    number
  avgDailySeconds:      number
  peakHour:             number       // 0-23
  consistencyScore:     number       // 0-100
  subjectBreakdown:     SubjectBehavior[]
  avgBreaksPerSession:  number
  avgBreakSeconds:      number
  commonBreakType:      string
  avgSessionSeconds:    number
  longestStreak:        number
  currentStreak:        number
  weekdaySeconds:       number[]     // [Mon=0 .. Sun=6] avg seconds per day
}

export interface BehaviorScores {
  adherence:    number   // 0-100
  productivity: number
  focus:        number
  overall:      number
  trend:        'improving' | 'declining' | 'stable'
  labels: {
    adherence:    string
    productivity: string
    focus:        string
    overall:      string
  }
}

export interface WeakArea {
  subjectId:       string | null
  subjectName:     string
  color:           string
  reason:          string
  severity:        'low' | 'medium' | 'high'
  recommendation:  string
  daysSinceStudied: number | null
}

export interface GeneratedTask {
  subjectId:          string | null
  subjectName:        string
  color:              string
  title:              string
  description:        string
  scheduledDate:      string          // yyyy-MM-dd
  scheduledStartTime: string | null   // HH:mm
  durationMinutes:    number
  priority:           1 | 2 | 3
  orderIndex:         number
}

export interface PlanComparison {
  date:             string
  plannedMinutes:   number
  actualMinutes:    number
  adherenceScore:   number
  completedTasks:   number
  totalTasks:       number
  missedSubjects:   string[]
  surplus:          boolean
}

export interface AIFeedback {
  summary:      string
  tips:         string[]
  encouragement: string
  generatedAt:  string
}

export interface StudyPlanInput {
  userId:        string
  title:         string
  goalDeadline:  string   // yyyy-MM-dd
  hoursPerDay:   number
  subjectIds:    string[]
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function scoreLabel(n: number): string {
  if (n >= 90) return 'Excellent'
  if (n >= 75) return 'Good'
  if (n >= 60) return 'Fair'
  if (n >= 40) return 'Needs Work'
  return 'Low'
}

function mostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>()
  for (const x of arr) counts.set(x, (counts.get(x) ?? 0) + 1)
  let max = 0; let best = arr[0]
  counts.forEach((c, v) => { if (c > max) { max = c; best = v } })
  return best
}

function calcStreaks(days: Set<string>): { longest: number; current: number } {
  const sorted = [...days].sort()
  if (!sorted.length) return { longest: 0, current: 0 }
  let longest = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]))
    run = diff === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  const daysSinceLast = differenceInCalendarDays(new Date(), parseISO(sorted[sorted.length - 1]))
  return { longest, current: daysSinceLast <= 1 ? run : 0 }
}

function emptyProfile(userId: string): BehaviorProfile {
  return {
    userId, periodDays: 30, totalStudySeconds: 0, avgDailySeconds: 0,
    peakHour: 9, consistencyScore: 0, subjectBreakdown: [],
    avgBreaksPerSession: 0, avgBreakSeconds: 0, commonBreakType: 'rest',
    avgSessionSeconds: 0, longestStreak: 0, currentStreak: 0,
    weekdaySeconds: Array(7).fill(0),
  }
}

function heuristicSummary(s: BehaviorScores): string {
  if (s.overall >= 80) return 'Excellent week! Your consistency and focus are paying off — you\'re right on track to meet your goals.'
  if (s.overall >= 60) return 'Solid progress this week. Your study habits are developing well with some room to push higher.'
  if (s.overall >= 40) return 'You\'ve made a start, but there\'s significant room for improvement. Focus on building a regular daily routine.'
  return 'This week was challenging for staying on track. Let\'s reset and build better habits — small consistent sessions daily make a huge difference.'
}

function heuristicTips(s: BehaviorScores, weak: WeakArea[]): string[] {
  const tips: string[] = []
  if (s.adherence < 70)    tips.push('Set specific study times and use phone reminders to stay on schedule.')
  if (s.focus < 70)        tips.push('Try 45-minute Pomodoro blocks — focused bursts beat long unfocused sessions.')
  if (s.productivity < 70) tips.push('Aim for at least 3 quality hours daily — protect that time like an appointment.')
  if (weak.length > 0)     tips.push(`Prioritise ${weak[0].subjectName} this week — ${weak[0].reason.toLowerCase()}.`)
  if (tips.length < 3)     tips.push('Review yesterday\'s material for 10 minutes before starting new content.')
  if (tips.length < 3)     tips.push('After each session, write 3 things you learned — active recall beats re-reading.')
  return tips.slice(0, 3)
}

function heuristicEncouragement(s: BehaviorScores): string {
  if (s.overall >= 80) return 'You\'re doing brilliantly — keep this momentum going!'
  if (s.overall >= 60) return 'Every session counts. Stay consistent and the results will come!'
  return 'One focused session today is better than none. You\'ve got this — start small and build!'
}

// ─── analyzeBehavior ─────────────────────────────────────────────────────────

export async function analyzeBehavior(
  userId: string,
  periodDays = 30,
): Promise<BehaviorProfile> {
  const since = subDays(new Date(), periodDays).toISOString()

  const [{ data: sessions }, { data: breaks }, { data: subjects }] = await Promise.all([
    supabase.from('sessions')
      .select('id, subject_id, started_at, duration_seconds')
      .eq('user_id', userId).eq('status', 'completed').gte('started_at', since),
    supabase.from('breaks')
      .select('break_type, duration_seconds')
      .eq('user_id', userId).gte('started_at', since),
    supabase.from('subjects')
      .select('id, name, color')
      .eq('user_id', userId),
  ])

  if (!sessions?.length) return emptyProfile(userId)

  const subjectMap = new Map(subjects?.map(s => [s.id, { name: s.name, color: s.color }]) ?? [])
  const totalStudySeconds = sessions.reduce((s, r) => s + (r.duration_seconds ?? 0), 0)

  // Unique study days & streaks
  const studyDays = new Set(sessions.map(s => format(new Date(s.started_at), 'yyyy-MM-dd')))
  const consistencyScore = Math.min(100, Math.round((studyDays.size / periodDays) * 100))
  const { longest: longestStreak, current: currentStreak } = calcStreaks(studyDays)

  // Peak hour (by total seconds studied)
  const hourSecs = Array<number>(24).fill(0)
  sessions.forEach(s => { hourSecs[new Date(s.started_at).getHours()] += s.duration_seconds ?? 0 })
  const peakHour = hourSecs.indexOf(Math.max(...hourSecs))

  // Per-subject breakdown
  const sMap = new Map<string, { sec: number; cnt: number; last: string }>()
  sessions.forEach(s => {
    const dt  = format(new Date(s.started_at), 'yyyy-MM-dd')
    const cur = sMap.get(s.subject_id) ?? { sec: 0, cnt: 0, last: dt }
    sMap.set(s.subject_id, {
      sec:  cur.sec + (s.duration_seconds ?? 0),
      cnt:  cur.cnt + 1,
      last: dt > cur.last ? dt : cur.last,
    })
  })
  const subjectBreakdown: SubjectBehavior[] = [...sMap.entries()].map(([id, v]) => ({
    subjectId:         id,
    subjectName:       subjectMap.get(id)?.name  ?? 'Unknown',
    color:             subjectMap.get(id)?.color ?? '#6366f1',
    totalSeconds:      v.sec,
    percentage:        totalStudySeconds > 0 ? Math.round((v.sec / totalStudySeconds) * 100) : 0,
    sessionCount:      v.cnt,
    avgSessionSeconds: Math.round(v.sec / v.cnt),
    lastStudied:       v.last,
  })).sort((a, b) => b.totalSeconds - a.totalSeconds)

  // Break patterns
  const breakArr = (breaks ?? []) as Array<{ break_type: string; duration_seconds: number }>
  const totalBreakSecs = breakArr.reduce((s, b) => s + b.duration_seconds, 0)

  // Weekday distribution  [Mon=0 .. Sun=6]
  const wdTotals = Array(7).fill(0), wdCounts = Array(7).fill(0)
  sessions.forEach(s => {
    const dow = getDay(new Date(s.started_at))          // 0=Sun
    const idx = dow === 0 ? 6 : dow - 1                // Mon=0..Sun=6
    wdTotals[idx] += s.duration_seconds ?? 0
    wdCounts[idx]++
  })
  const weekdaySeconds = wdTotals.map((t, i) => wdCounts[i] > 0 ? Math.round(t / wdCounts[i]) : 0)

  return {
    userId, periodDays, totalStudySeconds,
    avgDailySeconds:      Math.round(totalStudySeconds / periodDays),
    peakHour, consistencyScore, subjectBreakdown,
    avgBreaksPerSession:  sessions.length > 0 ? Math.round((breakArr.length / sessions.length) * 10) / 10 : 0,
    avgBreakSeconds:      breakArr.length > 0 ? Math.round(totalBreakSecs / breakArr.length) : 0,
    commonBreakType:      breakArr.length > 0 ? mostCommon(breakArr.map(b => b.break_type)) : 'rest',
    avgSessionSeconds:    Math.round(totalStudySeconds / sessions.length),
    longestStreak, currentStreak, weekdaySeconds,
  }
}

// ─── calculateScores ─────────────────────────────────────────────────────────

export async function calculateScores(userId: string): Promise<BehaviorScores> {
  const weekAgo = subDays(new Date(), 7).toISOString()
  const today   = format(new Date(), 'yyyy-MM-dd')
  const weekAgoDate = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  const [{ data: tasks }, { data: sessions }, { data: breaks }] = await Promise.all([
    supabase.from('plan_tasks')
      .select('status, duration_minutes')
      .eq('user_id', userId).gte('scheduled_date', weekAgoDate).lte('scheduled_date', today),
    supabase.from('sessions')
      .select('duration_seconds, started_at')
      .eq('user_id', userId).eq('status', 'completed').gte('started_at', weekAgo),
    supabase.from('breaks')
      .select('duration_seconds')
      .eq('user_id', userId).gte('started_at', weekAgo),
  ])

  const sessionArr  = sessions ?? []
  const breakArr    = breaks   ?? []
  const taskArr     = tasks    ?? []

  // ── Adherence: tasks completed / tasks planned (or fallback to days studied)
  let adherence = 70
  if (taskArr.length > 0) {
    const done = taskArr.filter(t => t.status === 'completed').length
    adherence  = Math.round((done / taskArr.length) * 100)
  } else {
    const days = new Set(sessionArr.map(s => format(new Date(s.started_at), 'yyyy-MM-dd')))
    adherence  = Math.round((days.size / 7) * 100)
  }

  // ── Productivity: actual study vs 4h/day target
  const totalStudySecs = sessionArr.reduce((s, r) => s + (r.duration_seconds ?? 0), 0)
  const avgDailySecs   = totalStudySecs / 7
  const productivity   = Math.min(100, Math.round((avgDailySecs / (4 * 3600)) * 100))

  // ── Focus: study / (study + break) time
  const totalBreakSecs = breakArr.reduce((s, b) => s + (b.duration_seconds ?? 0), 0)
  const totalTime      = totalStudySecs + totalBreakSecs
  const focus          = totalTime > 0 ? Math.min(100, Math.round((totalStudySecs / totalTime) * 100)) : 75

  const overall = Math.round(adherence * 0.4 + productivity * 0.35 + focus * 0.25)
  const trend: BehaviorScores['trend'] = overall >= 75 ? 'improving' : overall <= 45 ? 'declining' : 'stable'

  return {
    adherence, productivity, focus, overall, trend,
    labels: {
      adherence:    scoreLabel(adherence),
      productivity: scoreLabel(productivity),
      focus:        scoreLabel(focus),
      overall:      scoreLabel(overall),
    },
  }
}

// ─── detectWeakAreas ─────────────────────────────────────────────────────────

export async function detectWeakAreas(userId: string): Promise<WeakArea[]> {
  const [profile, { data: subjects }, { data: practice }] = await Promise.all([
    analyzeBehavior(userId, 30),
    supabase.from('subjects').select('id, name, color').eq('user_id', userId).eq('is_active', true),
    supabase.from('practice_sessions')
      .select('subject, average_grade')
      .eq('user_id', userId)
      .gte('created_at', subDays(new Date(), 30).toISOString()),
  ])

  const weak: WeakArea[] = []

  for (const subj of (subjects ?? [])) {
    const beh = profile.subjectBreakdown.find(s => s.subjectId === subj.id)

    if (!beh) {
      weak.push({
        subjectId: subj.id, subjectName: subj.name, color: subj.color,
        reason: 'No study sessions in the last 30 days',
        severity: 'high',
        recommendation: `Start with a focused 45-minute session for ${subj.name} this week.`,
        daysSinceStudied: null,
      })
      continue
    }

    const daysSince = beh.lastStudied
      ? differenceInCalendarDays(new Date(), parseISO(beh.lastStudied)) : null

    if (daysSince !== null && daysSince > 7) {
      weak.push({
        subjectId: subj.id, subjectName: subj.name, color: subj.color,
        reason: `Not studied for ${daysSince} day${daysSince !== 1 ? 's' : ''}`,
        severity: daysSince > 14 ? 'high' : 'medium',
        recommendation: `Schedule a review session for ${subj.name} in the next 2 days.`,
        daysSinceStudied: daysSince,
      })
      continue
    }

    if (beh.percentage < 10 && profile.subjectBreakdown.length > 2) {
      weak.push({
        subjectId: subj.id, subjectName: subj.name, color: subj.color,
        reason: `Only ${beh.percentage}% of total study time`,
        severity: 'medium',
        recommendation: `Increase ${subj.name} to at least 20% of your weekly study time.`,
        daysSinceStudied: daysSince,
      })
    }

    // Low URT grades
    const urtSess = (practice ?? []).filter(p => p.subject === subj.name && p.average_grade !== null)
    if (urtSess.length >= 2) {
      const avg = urtSess.reduce((s, p) => s + (p.average_grade ?? 0), 0) / urtSess.length
      if (avg < 65) {
        weak.push({
          subjectId: subj.id, subjectName: subj.name, color: subj.color,
          reason: `Low URT average: ${Math.round(avg)}%`,
          severity: avg < 50 ? 'high' : 'medium',
          recommendation: `Focus on understanding core concepts in ${subj.name} before doing more practice.`,
          daysSinceStudied: daysSince,
        })
      }
    }
  }

  return weak.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]))
}

// ─── generateNextDayPlan ─────────────────────────────────────────────────────

export async function generateNextDayPlan(
  userId: string,
): Promise<{ planId: string; tasks: GeneratedTask[] }> {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  // Clear any existing plan for tomorrow
  const { data: existing } = await supabase
    .from('study_plans').select('id').eq('user_id', userId)
    .eq('start_date', tomorrow).maybeSingle()
  if (existing) {
    await supabase.from('plan_tasks').delete().eq('plan_id', existing.id)
    await supabase.from('study_plans').delete().eq('id', existing.id)
  }

  const [profile, weak, { data: subjects }, { data: curric }, { data: sleepLogs }] = await Promise.all([
    analyzeBehavior(userId, 14),
    detectWeakAreas(userId),
    supabase.from('subjects').select('id, name, color').eq('user_id', userId).eq('is_active', true),
    supabase.from('curriculum_items')
      .select('id, subject_id, title').eq('user_id', userId)
      .eq('studied', false).is('parent_id', null).limit(30),
    supabase.from('sleep_logs').select('wake_time').eq('user_id', userId)
      .order('log_date', { ascending: false }).limit(14),
  ])

  if (!subjects?.length) throw new Error('No active subjects found. Please add subjects first.')

  // Use avg wake hour (+1h buffer) as the planning start, fall back to peakHour
  const avgWakeHour: number = (() => {
    const logs = (sleepLogs ?? []).filter(l => l.wake_time)
    if (!logs.length) return profile.peakHour || 9
    const totalMins = logs.reduce((sum: number, l) => {
      const d = new Date(l.wake_time as string)
      return sum + d.getHours() * 60 + d.getMinutes()
    }, 0)
    return Math.min(22, Math.floor(totalMins / logs.length / 60) + 1)
  })()

  const targetHours = Math.max(2, Math.min(8, Math.round(profile.avgDailySeconds / 3600) || 4))
  const blockCount  = Math.min(subjects.length, Math.max(2, Math.floor(targetHours / 1.25)))

  // Prioritise: high-severity weak areas first, then round-robin
  const prioritised: Array<{ id: string; name: string; color: string; priority: 1 | 2 | 3 }> = []
  for (const w of weak.filter(x => x.severity === 'high').slice(0, 2)) {
    const s = subjects.find(x => x.id === w.subjectId)
    if (s && !prioritised.find(p => p.id === s.id)) prioritised.push({ ...s, priority: 3 })
  }
  for (const s of subjects) {
    if (!prioritised.find(p => p.id === s.id)) prioritised.push({ ...s, priority: 2 })
  }

  const tasks: GeneratedTask[] = []
  let h = avgWakeHour, m = 0

  for (let i = 0; i < Math.min(blockCount, prioritised.length); i++) {
    const subj      = prioritised[i]
    const isWeak    = weak.some(w => w.subjectId === subj.id)
    const durMins   = isWeak ? 90 : 60
    const currItem  = curric?.find(c => c.subject_id === subj.id)
    const title     = currItem ? `Study: ${currItem.title}` : `Study Session — ${subj.name}`
    const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    tasks.push({
      subjectId: subj.id, subjectName: subj.name, color: subj.color,
      title,
      description: isWeak
        ? `Priority session — ${subj.name} needs focused attention this week.`
        : `Regular study session for ${subj.name}.`,
      scheduledDate:      tomorrow,
      scheduledStartTime: startTime,
      durationMinutes:    durMins,
      priority:           subj.priority,
      orderIndex:         i,
    })

    m += durMins + 15
    h += Math.floor(m / 60); m = m % 60
    if (h >= 22) break
  }

  // Create plan record
  const { data: plan, error } = await supabase.from('study_plans').insert({
    user_id: userId, title: `AI Plan — ${tomorrow}`,
    plan_type: 'daily', start_date: tomorrow, end_date: tomorrow,
    status: 'active', ai_generated: true,
    metadata: { peakHour: profile.peakHour, targetHours, generatedBy: 'aiEngine' },
  }).select().single()

  if (error || !plan) throw new Error(`Failed to create plan: ${error?.message}`)

  if (tasks.length) {
    await supabase.from('plan_tasks').insert(
      tasks.map(t => ({
        plan_id: plan.id, user_id: userId,
        subject_id: t.subjectId, subject_name: t.subjectName,
        title: t.title, description: t.description,
        scheduled_date: t.scheduledDate, scheduled_start_time: t.scheduledStartTime,
        duration_minutes: t.durationMinutes, priority: t.priority,
        order_index: t.orderIndex, status: 'pending',
      })),
    )
  }

  return { planId: plan.id, tasks }
}

// ─── generateStudyPlan (multi-day) ───────────────────────────────────────────

export async function generateStudyPlan(input: StudyPlanInput): Promise<{ planId: string; taskCount: number }> {
  const { userId, title, goalDeadline, hoursPerDay, subjectIds } = input
  const today    = new Date()
  const deadline = parseISO(goalDeadline)
  const days     = Math.max(1, differenceInCalendarDays(deadline, today))

  const [{ data: subjects }, profile, weak, { data: curric }] = await Promise.all([
    supabase.from('subjects').select('id, name, color').in('id', subjectIds),
    analyzeBehavior(userId, 14),
    detectWeakAreas(userId),
    supabase.from('curriculum_items')
      .select('id, subject_id, title').eq('user_id', userId)
      .eq('studied', false).is('parent_id', null).limit(50),
  ])

  if (!subjects?.length) throw new Error('No subjects found')

  const { data: plan, error } = await supabase.from('study_plans').insert({
    user_id: userId, title, plan_type: 'custom',
    start_date: format(addDays(today, 1), 'yyyy-MM-dd'),
    end_date: goalDeadline, status: 'active', ai_generated: true,
    metadata: { hoursPerDay, subjectIds, totalDays: days },
  }).select().single()

  if (error || !plan) throw new Error(`Failed to create plan: ${error?.message}`)

  // Weight weak subjects 1.5x
  const weights  = new Map(subjects.map(s => [s.id, weak.some(w => w.subjectId === s.id && w.severity === 'high') ? 1.5 : 1]))

  const allTasks: object[] = []
  let order = 0

  for (let day = 1; day <= Math.min(days, 90); day++) {
    const scheduledDate = format(addDays(today, day), 'yyyy-MM-dd')
    // Rotate which subjects appear per day (max 3 per day)
    const daySubjects = subjects.filter((_, i) => ((day - 1 + i) % Math.max(1, Math.ceil(subjects.length / 3))) < Math.ceil(subjects.length / 3)).slice(0, 3)
    const todaySubjects = daySubjects.length ? daySubjects : subjects.slice(0, Math.min(3, subjects.length))
    const durPerSubject = Math.round((hoursPerDay / todaySubjects.length) * 60)

    let h = profile.peakHour || 9, m = 0
    for (const subj of todaySubjects) {
      const currItem  = curric?.find(c => c.subject_id === subj.id)
      const taskTitle = currItem ? `Study: ${currItem.title}` : `Study — ${subj.name}`
      const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      allTasks.push({
        plan_id: plan.id, user_id: userId,
        subject_id: subj.id, subject_name: subj.name,
        title: taskTitle, description: `Scheduled study session for ${subj.name}.`,
        scheduled_date: scheduledDate, scheduled_start_time: startTime,
        duration_minutes: durPerSubject, priority: weights.get(subj.id)! > 1 ? 3 : 2,
        order_index: order++, status: 'pending',
      })
      m += durPerSubject + 10
      h += Math.floor(m / 60); m = m % 60
    }
  }

  // Batch insert (100 per request)
  for (let i = 0; i < allTasks.length; i += 100) {
    await supabase.from('plan_tasks').insert(allTasks.slice(i, i + 100) as Parameters<typeof supabase.from>[0][])
  }

  return { planId: plan.id, taskCount: allTasks.length }
}

// ─── comparePlanVsActual ─────────────────────────────────────────────────────

export async function comparePlanVsActual(userId: string, date?: string): Promise<PlanComparison> {
  const d   = date ?? format(new Date(), 'yyyy-MM-dd')
  const iso = `${d}T`

  const [{ data: tasks }, { data: sessions }, { data: subjects }] = await Promise.all([
    supabase.from('plan_tasks').select('*').eq('user_id', userId).eq('scheduled_date', d),
    supabase.from('sessions').select('subject_id, duration_seconds')
      .eq('user_id', userId).eq('status', 'completed')
      .gte('started_at', `${iso}00:00:00`).lte('started_at', `${iso}23:59:59`),
    supabase.from('subjects').select('id, name').eq('user_id', userId),
  ])

  const tArr = tasks ?? []; const sArr = sessions ?? []
  const subjMap = new Map(subjects?.map(s => [s.id, s.name]) ?? [])

  const plannedMins = tArr.reduce((s, t) => s + t.duration_minutes, 0)
  const actualMins  = Math.round(sArr.reduce((s, r) => s + (r.duration_seconds ?? 0), 0) / 60)

  const plannedSubjects  = new Set(tArr.map(t => t.subject_name).filter(Boolean))
  const actualSubjects   = new Set(sArr.map(s => subjMap.get(s.subject_id) ?? undefined).filter((v): v is string => !!v))
  const missedSubjects   = ([...plannedSubjects] as string[]).filter(s => !actualSubjects.has(s))

  return {
    date: d,
    plannedMinutes:   plannedMins,
    actualMinutes:    actualMins,
    adherenceScore:   plannedMins > 0 ? Math.min(100, Math.round((actualMins / plannedMins) * 100)) : (actualMins > 0 ? 100 : 0),
    completedTasks:   tArr.filter(t => t.status === 'completed').length,
    totalTasks:       tArr.length,
    missedSubjects,
    surplus:          actualMins > plannedMins * 1.2,
  }
}

// ─── getOverdueTasks ─────────────────────────────────────────────────────────
// Returns count of pending tasks scheduled before today (overdue).

export async function getOverdueTasks(userId: string): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { count } = await supabase.from('plan_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'pending').lt('scheduled_date', today)
  return count ?? 0
}

// ─── adjustPlan ──────────────────────────────────────────────────────────────

export async function adjustPlan(userId: string): Promise<{ adjusted: number }> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: overdue } = await supabase.from('plan_tasks').select('id')
    .eq('user_id', userId).eq('status', 'pending').lt('scheduled_date', today)

  if (!overdue?.length) return { adjusted: 0 }

  await Promise.all(overdue.map((t, i) =>
    supabase.from('plan_tasks').update({
      scheduled_date: format(addDays(new Date(), 1 + Math.floor(i / Math.max(1, Math.ceil(overdue.length / 3)))), 'yyyy-MM-dd'),
    }).eq('id', t.id),
  ))

  return { adjusted: overdue.length }
}

// ─── generateFeedback ────────────────────────────────────────────────────────

export async function generateFeedback(userId: string): Promise<AIFeedback> {
  const [profile, scores, weak] = await Promise.all([
    analyzeBehavior(userId, 7),
    calculateScores(userId),
    detectWeakAreas(userId),
  ])

  const systemPrompt = `You are an expert academic coach. Analyse student performance data and give concise, actionable feedback. Be encouraging but honest. Keep total response under 200 words.`

  const userPrompt = `Student 7-day data:
- Daily study avg: ${(profile.avgDailySeconds / 3600).toFixed(1)}h
- Consistency: ${profile.consistencyScore}% (days with sessions / 7)
- Streak: ${profile.currentStreak} days
- Plan adherence: ${scores.adherence}%
- Productivity: ${scores.productivity}%
- Focus score: ${scores.focus}%
- Weak subjects: ${weak.slice(0, 2).map(w => w.subjectName).join(', ') || 'none'}

Reply ONLY with valid JSON (no markdown):
{"summary":"2-sentence overview","tips":["tip1","tip2","tip3"],"encouragement":"1 sentence"}`

  try {
    const raw = await generateAIResponse(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { maxTokens: 350 },
    )
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const p = JSON.parse(match[0])
      return {
        summary:       p.summary       ?? heuristicSummary(scores),
        tips:          Array.isArray(p.tips) ? p.tips.slice(0, 3) : heuristicTips(scores, weak),
        encouragement: p.encouragement ?? heuristicEncouragement(scores),
        generatedAt:   new Date().toISOString(),
      }
    }
  } catch (err) {
    console.warn('[aiEngine] feedback AI call failed, using heuristics:', err)
  }

  return {
    summary:       heuristicSummary(scores),
    tips:          heuristicTips(scores, weak),
    encouragement: heuristicEncouragement(scores),
    generatedAt:   new Date().toISOString(),
  }
}

// ─── saveAIInsights ──────────────────────────────────────────────────────────
// Generates and persists a fresh batch of insights for the user.

export async function saveAIInsights(userId: string): Promise<void> {
  const [feedback, weak, scores, profile] = await Promise.all([
    generateFeedback(userId),
    detectWeakAreas(userId),
    calculateScores(userId),
    analyzeBehavior(userId, 30),
  ])

  const expires = addDays(new Date(), 7).toISOString()
  const rows: object[] = []

  // Main weekly summary
  rows.push({
    user_id: userId, insight_type: 'recommendation',
    title: 'Weekly Performance Summary', priority: 3, is_read: false, expires_at: expires,
    content: `${feedback.summary}\n\n${feedback.tips.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    metadata: { tips: feedback.tips, encouragement: feedback.encouragement, scores },
  })

  // Weak area warnings
  for (const w of weak.slice(0, 3)) {
    rows.push({
      user_id: userId,
      insight_type: w.severity === 'high' ? 'warning' : 'recommendation',
      title: `${w.subjectName} Needs Attention`, priority: w.severity === 'high' ? 3 : 2,
      is_read: false, expires_at: expires,
      content: `${w.reason}. ${w.recommendation}`,
      metadata: { subjectId: w.subjectId, severity: w.severity, daysSince: w.daysSinceStudied },
    })
  }

  // Streak achievement
  if (profile.currentStreak >= 3) {
    rows.push({
      user_id: userId, insight_type: 'achievement',
      title: `🔥 ${profile.currentStreak}-Day Streak!`, priority: 2, is_read: false, expires_at: expires,
      content: `You've studied consistently for ${profile.currentStreak} days in a row. Momentum is your superpower — keep it going!`,
      metadata: { streak: profile.currentStreak },
    })
  }

  // Adherence insight
  if (scores.adherence >= 80) {
    rows.push({
      user_id: userId, insight_type: 'achievement',
      title: 'High Plan Adherence', priority: 2, is_read: false, expires_at: expires,
      content: `Your plan adherence is ${scores.adherence}% — you're following through on your commitments. Excellent discipline!`,
      metadata: { score: scores.adherence },
    })
  } else if (scores.adherence < 50) {
    rows.push({
      user_id: userId, insight_type: 'warning',
      title: 'Low Plan Adherence', priority: 3, is_read: false, expires_at: expires,
      content: `You're completing ${scores.adherence}% of planned tasks. Try setting more realistic daily targets — it's better to do 2 tasks fully than plan 6 and skip most.`,
      metadata: { score: scores.adherence },
    })
  }

  // Behaviour pattern
  const peakLabel = `${profile.peakHour}:00–${(profile.peakHour + 2) % 24}:00`
  rows.push({
    user_id: userId, insight_type: 'pattern',
    title: 'Your Peak Study Window', priority: 1, is_read: false, expires_at: expires,
    content: `Your data shows you are most productive around ${peakLabel}. Schedule your hardest subjects during this window for maximum retention.`,
    metadata: { peakHour: profile.peakHour },
  })

  // Replace existing insights
  await supabase.from('ai_insights').delete().eq('user_id', userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (rows.length) await supabase.from('ai_insights').insert(rows as any[])
}
