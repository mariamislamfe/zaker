// ─── AI Analytics ─────────────────────────────────────────────────────────────
// Readiness Report · Behavioral Insights · Smart Alerts
// All powered by K2-Think analysis of real student data.

import { supabase }           from '../lib/supabase'
import { generateAIResponse } from './aiProvider'
import {
  format, subDays, parseISO,
  differenceInCalendarDays, getDay,
} from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubjectReadiness {
  name:              string
  completedSessions: number
  totalSessions:     number
  coveragePct:       number
  status:            'on_track' | 'behind' | 'danger' | 'done'
  lastStudied:       string | null
  daysSinceStudied:  number | null
}

export interface ReadinessReport {
  overallPct:             number
  examDate:               string | null
  daysLeft:               number | null
  subjects:               SubjectReadiness[]
  warnings:               string[]
  recommendations:        string[]
  aiSummary:              string
  completionProbability:  number
  riskLevel:              'low' | 'medium' | 'high' | 'critical'
  riskFactors:            string[]
}

export interface BehaviorInsight {
  label: string
  value: string
  icon:  string
  color: 'green' | 'yellow' | 'red' | 'blue'
}

export interface BehaviorData {
  bestDay:           string
  worstDay:          string
  avgCompletionRate: number
  studyStreak:       number
  insights:          BehaviorInsight[]
  aiNarrative:       string
  hasEnoughData:     boolean
}

export interface SmartAlert {
  id:      string
  level:   'info' | 'warning' | 'danger'
  message: string
}

// ─── Day names ────────────────────────────────────────────────────────────────

const DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Readiness Report ─────────────────────────────────────────────────────────

export async function getReadinessReport(userId: string): Promise<ReadinessReport> {
  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: goal }, { data: allTasks }] = await Promise.all([
    supabase.from('user_goals')
      .select('title, target_date')
      .eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('plan_tasks')
      .select('subject_name, status, scheduled_date')
      .eq('user_id', userId)
      .order('scheduled_date'),
  ])

  const examDate = goal?.target_date ?? null
  const daysLeft = examDate
    ? differenceInCalendarDays(parseISO(examDate), new Date())
    : null

  // Group by subject
  type SubjEntry = { completed: number; total: number; lastDate: string | null }
  const subjMap = new Map<string, SubjEntry>()

  for (const t of (allTasks ?? [])) {
    const s = (t.subject_name as string) ?? 'Other'
    if (!subjMap.has(s)) subjMap.set(s, { completed: 0, total: 0, lastDate: null })
    const entry = subjMap.get(s)!
    entry.total++
    if (t.status === 'completed') {
      entry.completed++
      const d = t.scheduled_date as string
      if (!entry.lastDate || d > entry.lastDate) entry.lastDate = d
    }
  }

  const subjects: SubjectReadiness[] = Array.from(subjMap.entries()).map(([name, data]) => {
    const pct = data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100)
    const daysSince = data.lastDate
      ? differenceInCalendarDays(new Date(), parseISO(data.lastDate))
      : null

    let status: SubjectReadiness['status'] = 'on_track'
    if (pct === 100) status = 'done'
    else if (pct < 30 || (daysLeft !== null && daysLeft <= 7 && pct < 70)) status = 'danger'
    else if (pct < 55) status = 'behind'

    return { name, completedSessions: data.completed, totalSessions: data.total, coveragePct: pct, status, lastStudied: data.lastDate, daysSinceStudied: daysSince }
  })

  const totalCompleted = subjects.reduce((s, x) => s + x.completedSessions, 0)
  const totalAll       = subjects.reduce((s, x) => s + x.totalSessions, 0)
  const overallPct     = totalAll === 0 ? 0 : Math.round((totalCompleted / totalAll) * 100)

  // Warnings
  const warnings: string[] = []
  subjects.filter(s => s.status === 'danger').forEach(s =>
    warnings.push(`${s.name}: coverage ${s.coveragePct}% — danger!`))
  subjects.filter(s => s.daysSinceStudied !== null && s.daysSinceStudied >= 7 && s.coveragePct < 100).forEach(s =>
    warnings.push(`Haven't studied ${s.name} in ${s.daysSinceStudied} days`))
  if (daysLeft !== null && daysLeft <= 7 && overallPct < 80)
    warnings.push(`Exam in ${daysLeft} days and coverage is only ${overallPct}%!`)

  // Recommendations
  const recs: string[] = []
  const behind = subjects.filter(s => s.status === 'behind' || s.status === 'danger')
  if (behind.length > 0) recs.push(`Focus on: ${behind.map(s => s.name).join(', ')}`)
  if (daysLeft !== null && daysLeft < 14) recs.push('Add review sessions instead of new material')
  const stale = subjects.filter(s => s.daysSinceStudied !== null && s.daysSinceStudied >= 5 && s.coveragePct < 100)
  if (stale.length > 0) recs.push(`Schedule a review for: ${stale.map(s => s.name).join(', ')}`)

  // ── AI-assisted risk analysis (Modular AI Architecture) ──────────────────────
  // AI reasons + suggests · server validates · deterministic output guaranteed
  const fallbackProb = Math.min(100, Math.round(
    overallPct * 0.6 + (daysLeft !== null && daysLeft > 14 ? 15 : 0) + (warnings.length === 0 ? 10 : 0)
  ))
  const fallbackLevel: 'low' | 'medium' | 'high' | 'critical' =
    fallbackProb >= 70 ? 'low' : fallbackProb >= 45 ? 'medium' : fallbackProb >= 25 ? 'high' : 'critical'

  let aiAnalysis = {
    summary:               overallPct >= 70
      ? 'You are on the right track! Keep up this pace and you will be ready for the exam.'
      : 'You need to push harder. Focus on weaker subjects and increase daily study hours.',
    completionProbability: fallbackProb,
    riskLevel:             fallbackLevel,
    riskFactors:           warnings.slice(0, 3) as string[],
  }

  try {
    const contextBlock = subjects.map(s =>
      `${s.name}: ${s.completedSessions}/${s.totalSessions} (${s.coveragePct}%) — ${s.status}${s.daysSinceStudied !== null && s.daysSinceStudied >= 5 ? ` — last studied ${s.daysSinceStudied}d ago` : ''}`
    ).join('\n')

    const raw = await generateAIResponse([
      {
        role: 'system',
        content: `You are Zaker AI — an academic risk assessment engine for university students.
YOUR ROLE: Analyze student progress data → predict exam readiness → return structured JSON.
YOU ARE NOT A CHATBOT. Return ONLY valid JSON. No markdown. No explanation outside JSON.

OUTPUT SCHEMA (return ONLY this JSON, nothing else):
{
  "summary": "<2 sentences in English — honest and motivating>",
  "completionProbability": <integer 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "riskFactors": ["<English risk factor>", "<English risk factor>"]
}

SCORING RULES:
- completionProbability = coverage_pct×0.4 + days_buffer×0.3 + consistency×0.3  (range 0-100)
- low = 70-100 · medium = 45-69 · high = 25-44 · critical = 0-24
- riskFactors: max 3 items, specific + actionable, English only
- summary: English only, 2 sentences, honest but motivating`,
      },
      {
        role: 'user',
        content: `Exam: ${examDate ?? 'unknown'} — Days left: ${daysLeft ?? '?'}
Overall coverage: ${overallPct}%
Subjects:
${contextBlock}
Warnings: ${warnings.join(' | ') || 'none'}`,
      },
    ], { maxTokens: 250, temperature: 0.2 })

    const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
    if (match) {
      const p = JSON.parse(match[0]) as Record<string, unknown>
      const VALID = new Set(['low', 'medium', 'high', 'critical'])
      aiAnalysis = {
        summary:               typeof p.summary === 'string'               ? p.summary                                                        : aiAnalysis.summary,
        completionProbability: typeof p.completionProbability === 'number' ? Math.min(100, Math.max(0, Math.round(p.completionProbability)))   : aiAnalysis.completionProbability,
        riskLevel:             typeof p.riskLevel === 'string' && VALID.has(p.riskLevel) ? (p.riskLevel as 'low'|'medium'|'high'|'critical')  : aiAnalysis.riskLevel,
        riskFactors:           Array.isArray(p.riskFactors)                ? (p.riskFactors as string[]).slice(0, 3)                           : aiAnalysis.riskFactors,
      }
    }
  } catch { /* server-side fallback already set above */ }

  return {
    overallPct, examDate, daysLeft, subjects, warnings, recommendations: recs,
    aiSummary:              aiAnalysis.summary,
    completionProbability:  aiAnalysis.completionProbability,
    riskLevel:              aiAnalysis.riskLevel,
    riskFactors:            aiAnalysis.riskFactors,
  }
}

// ─── Behavioral Insights ──────────────────────────────────────────────────────

export async function getBehaviorInsights(userId: string): Promise<BehaviorData> {
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const today         = format(new Date(), 'yyyy-MM-dd')

  const [{ data: tasks }, { data: sleepLogs }] = await Promise.all([
    supabase.from('plan_tasks')
      .select('status, scheduled_date, duration_minutes')
      .eq('user_id', userId)
      .gte('scheduled_date', thirtyDaysAgo)
      .lte('scheduled_date', today),
    supabase.from('sleep_logs')
      .select('log_date, sleep_duration_minutes')
      .eq('user_id', userId)
      .gte('log_date', thirtyDaysAgo)
      .order('log_date'),
  ])

  const allTasks = tasks ?? []
  const total    = allTasks.length
  const done     = allTasks.filter(t => t.status === 'completed').length

  if (total < 3) {
    return {
      bestDay: '—', worstDay: '—',
      avgCompletionRate: 0, studyStreak: 0,
      insights: [{ label: 'Data', value: 'Need more data', icon: '📊', color: 'blue' }],
      aiNarrative: 'Start logging your daily tasks so I can analyze your behavior!',
      hasEnoughData: false,
    }
  }

  const avgCompletionRate = Math.round((done / total) * 100)

  // Completion by day of week
  const dayStats = new Map<number, { done: number; total: number }>()
  for (const t of allTasks) {
    const d = getDay(parseISO(t.scheduled_date as string))
    if (!dayStats.has(d)) dayStats.set(d, { done: 0, total: 0 })
    dayStats.get(d)!.total++
    if (t.status === 'completed') dayStats.get(d)!.done++
  }

  let bestDayIdx = 0, bestRate = -1, worstDayIdx = 0, worstRate = 2
  for (const [day, s] of dayStats) {
    if (s.total < 2) continue
    const rate = s.done / s.total
    if (rate > bestRate)  { bestRate  = rate; bestDayIdx  = day }
    if (rate < worstRate) { worstRate = rate; worstDayIdx = day }
  }

  // Streak
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d     = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const day   = allTasks.filter(t => t.scheduled_date === d)
    if (day.length > 0 && day.some(t => t.status === 'completed')) streak++
    else if (i > 0) break
  }

  // Sleep correlation
  let sleepLine = ''
  const sleepData = sleepLogs ?? []
  if (sleepData.length >= 5) {
    const goodDays = sleepData.filter(s => (s.sleep_duration_minutes ?? 0) >= 420).map(s => s.log_date as string)
    const poorDays = sleepData.filter(s => (s.sleep_duration_minutes ?? 0) < 360).map(s => s.log_date as string)
    const rate = (days: string[]) => {
      if (!days.length) return 0
      const matched = allTasks.filter(t => days.includes(t.scheduled_date as string))
      return matched.length === 0 ? 0 : matched.filter(t => t.status === 'completed').length / matched.length
    }
    const diff = Math.round((rate(goodDays) - rate(poorDays)) * 100)
    if (diff >= 10) sleepLine = `Your output is ${diff}% higher after 7+ hours of sleep 🌙`
  }

  const insights: BehaviorInsight[] = [
    { label: 'Completion Rate', value: `${avgCompletionRate}%`, icon: '📊',
      color: avgCompletionRate >= 70 ? 'green' : avgCompletionRate >= 45 ? 'yellow' : 'red' },
    { label: 'Best Day', value: DAY_EN[bestDayIdx], icon: '⭐', color: 'green' },
    { label: 'Weakest Day', value: DAY_EN[worstDayIdx], icon: '⚠️', color: 'yellow' },
    { label: 'Day Streak', value: `${streak} days`, icon: '🔥',
      color: streak >= 5 ? 'green' : streak >= 2 ? 'yellow' : 'red' },
  ]
  if (sleepLine) insights.push({ label: 'Sleep Impact', value: sleepLine, icon: '🌙', color: 'blue' })

  // AI narrative (Behavioral Intelligence endpoint)
  let aiNarrative = ''
  try {
    const raw = await generateAIResponse([
      {
        role: 'system',
        content: `You are Zaker AI — a behavioral study coach for university students.
YOUR ROLE: Analyze 30-day study behavior data → identify patterns → deliver concise personalized advice.
YOU ARE NOT A CHATBOT. Return plain English text only. 2 sentences max. No JSON. No markdown.`,
      },
      {
        role: 'user',
        content: `30-day completion rate: ${avgCompletionRate}%
Best study day: ${DAY_EN[bestDayIdx]} (${Math.round(bestRate * 100)}% completion)
Worst study day: ${DAY_EN[worstDayIdx]} (${Math.round(worstRate * 100)}% completion)
Current streak: ${streak} consecutive days
${sleepLine ? `Sleep insight: ${sleepLine}` : ''}

Give 2 sentences of specific, actionable advice in English based on this data.`,
      },
    ], { maxTokens: 150, temperature: 0.6 })
    aiNarrative = raw
  } catch {
    aiNarrative = `Your completion rate is ${avgCompletionRate}%. Schedule your hardest topics on ${DAY_EN[bestDayIdx]} — it's your best day.`
  }

  return {
    bestDay: DAY_EN[bestDayIdx],
    worstDay: DAY_EN[worstDayIdx],
    avgCompletionRate,
    studyStreak: streak,
    insights,
    aiNarrative,
    hasEnoughData: true,
  }
}

// ─── Smart Alerts ─────────────────────────────────────────────────────────────

export async function getSmartAlerts(userId: string): Promise<SmartAlert[]> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const alerts: SmartAlert[] = []

  const [{ data: goal }, { data: recentTasks }, overdueRes] = await Promise.all([
    supabase.from('user_goals')
      .select('target_date').eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('plan_tasks')
      .select('subject_name, status, scheduled_date')
      .eq('user_id', userId)
      .gte('scheduled_date', format(subDays(new Date(), 14), 'yyyy-MM-dd'))
      .order('scheduled_date'),
    supabase.from('plan_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'pending')
      .lt('scheduled_date', today),
  ])

  // Overdue tasks
  const overdueCount = (overdueRes as unknown as { count: number })?.count ?? 0
  if (overdueCount > 0) {
    alerts.push({
      id: 'overdue',
      level: overdueCount >= 5 ? 'danger' : 'warning',
      message: `You have ${overdueCount} overdue task${overdueCount !== 1 ? 's' : ''} not yet completed`,
    })
  }

  // Exam approaching
  if (goal?.target_date) {
    const daysLeft = differenceInCalendarDays(parseISO(goal.target_date), new Date())
    if (daysLeft >= 0 && daysLeft <= 3)
      alerts.push({ id: 'exam-critical', level: 'danger', message: `⚡ Exam in ${daysLeft} days only — focus!` })
    else if (daysLeft >= 0 && daysLeft <= 7)
      alerts.push({ id: 'exam-soon', level: 'warning', message: `Exam in ${daysLeft} days — make sure you review` })
  }

  // Subjects not studied for 7+ days
  const tasks = recentTasks ?? []
  const subjLast = new Map<string, string>()
  for (const t of tasks.filter(x => x.status === 'completed')) {
    const s = (t.subject_name as string) ?? ''
    if (!subjLast.has(s) || (t.scheduled_date as string) > subjLast.get(s)!) {
      subjLast.set(s, t.scheduled_date as string)
    }
  }
  for (const [subj, lastDate] of subjLast) {
    const days = differenceInCalendarDays(new Date(), parseISO(lastDate))
    if (days >= 7) {
      alerts.push({
        id: `stale-${subj}`,
        level: days >= 10 ? 'danger' : 'warning',
        message: `Haven't studied ${subj} in ${days} days — forgetting has started!`,
      })
    }
  }

  // This week's completion vs last week
  const thisWeek = tasks.filter(t => {
    const d = t.scheduled_date as string
    return d >= format(subDays(new Date(), 7), 'yyyy-MM-dd') && d <= today
  })
  const lastWeek = tasks.filter(t => {
    const d = t.scheduled_date as string
    return d >= format(subDays(new Date(), 14), 'yyyy-MM-dd') && d < format(subDays(new Date(), 7), 'yyyy-MM-dd')
  })
  const thisRate = thisWeek.length === 0 ? 0 : thisWeek.filter(t => t.status === 'completed').length / thisWeek.length
  const lastRate = lastWeek.length === 0 ? 0 : lastWeek.filter(t => t.status === 'completed').length / lastWeek.length
  if (lastRate > 0 && thisRate < lastRate - 0.25 && thisWeek.length >= 3) {
    alerts.push({
      id: 'declining',
      level: 'warning',
      message: `Your completion rate dropped this week — get back to your previous pace`,
    })
  }

  return alerts.slice(0, 5)
}
