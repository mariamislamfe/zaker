// ─── AI Message Engine ────────────────────────────────────────────────────────
// Generates daily · weekly · monthly AI insights as conversational messages.
// IMPORTANT: AI receives the real granular data so it can give specific tips,
// not just generic advice.

import { supabase }           from '../lib/supabase'
import { generateAIResponse } from './aiProvider'
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIMessage {
  type:        'daily' | 'weekly' | 'monthly'
  content:     string
  icon:        string
  generatedAt: string
}

export function msgCacheKey(type: AIMessage['type'], userId: string): string {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (type === 'daily')   return `zaker_msg_daily_${userId}_${today}`
  if (type === 'weekly')  return `zaker_msg_weekly_${userId}_${format(startOfWeek(new Date(), { weekStartsOn: 6 }), 'yyyy-MM-dd')}`
  return                         `zaker_msg_monthly_${userId}_${format(startOfMonth(new Date()), 'yyyy-MM')}`
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

/** Study session minutes per subject. fromISO / toISO are full ISO timestamps. */
async function fetchStudyMinutes(userId: string, fromISO: string, toISO: string) {
  // Fetch sessions with subject_id, then resolve names from subjects table
  const { data: sessionRows } = await supabase
    .from('sessions')
    .select('duration_seconds, subject_id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', fromISO)
    .lte('started_at', toISO)

  const rows = (sessionRows ?? []) as { duration_seconds: number; subject_id: string | null }[]

  // Collect unique subject IDs and resolve names
  const subjectIds = [...new Set(rows.map(r => r.subject_id).filter(Boolean))] as string[]
  const nameMap = new Map<string, string>()
  if (subjectIds.length > 0) {
    const { data: subRows } = await supabase
      .from('subjects').select('id, name').in('id', subjectIds)
    for (const s of (subRows ?? []) as { id: string; name: string }[]) nameMap.set(s.id, s.name)
  }

  const map = new Map<string, number>()
  for (const s of rows) {
    const name = (s.subject_id ? nameMap.get(s.subject_id) : null) ?? 'Other'
    map.set(name, (map.get(name) ?? 0) + Math.round(s.duration_seconds / 60))
  }
  return map   // Map<subjectName, minutes>
}

/** Plan tasks for a date range with full detail */
async function fetchTasks(userId: string, from: string, to: string) {
  const { data } = await supabase
    .from('plan_tasks')
    .select('title, subject_name, duration_minutes, status, scheduled_date')
    .eq('user_id', userId)
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .order('scheduled_date', { ascending: true })
    .order('order_index',    { ascending: true })
  return (data ?? []) as {
    title: string; subject_name: string | null
    duration_minutes: number; status: string; scheduled_date: string
  }[]
}

/** URT sessions summary per subject. fromISO / toISO are full ISO timestamps. */
async function fetchURTSessions(userId: string, fromISO: string, toISO: string) {
  const { data } = await supabase
    .from('practice_sessions')
    .select('subject, actual_seconds, passage_count, average_grade')
    .eq('user_id', userId)
    .gte('created_at', fromISO)
    .lte('created_at', toISO)

  const map = new Map<string, { sessions: number; passages: number; avgGrade: number | null; totalMins: number }>()
  for (const s of (data ?? []) as { subject: string | null; actual_seconds: number; passage_count: number; average_grade: number | null }[]) {
    const name = s.subject ?? 'URT'
    const cur  = map.get(name) ?? { sessions: 0, passages: 0, avgGrade: null, totalMins: 0 }
    cur.sessions++
    cur.passages += s.passage_count
    cur.totalMins += Math.round(s.actual_seconds / 60)
    if (s.average_grade !== null) {
      cur.avgGrade = cur.avgGrade === null
        ? s.average_grade
        : Math.round((cur.avgGrade + s.average_grade) / 2)
    }
    map.set(name, cur)
  }
  return map
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function minsToHours(m: number) {
  const h = Math.floor(m / 60); const min = m % 60
  return h > 0 ? (min > 0 ? `${h}h ${min}m` : `${h}h`) : `${min}m`
}

function taskLines(tasks: { title: string; subject_name: string | null; status: string; duration_minutes: number }[]) {
  return tasks.map(t => {
    const icon   = t.status === 'completed' ? '✅' : t.status === 'skipped' ? '⏭️' : '⬜'
    const subject = t.subject_name ? ` [${t.subject_name}]` : ''
    return `${icon} ${t.title}${subject} (${t.duration_minutes}m)`
  }).join('\n')
}

function studyMinsLines(map: Map<string, number>) {
  if (map.size === 0) return 'No study sessions recorded'
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, mins]) => `  • ${name}: ${minsToHours(mins)}`)
    .join('\n')
}

function urtLines(map: Map<string, { sessions: number; passages: number; avgGrade: number | null; totalMins: number }>) {
  if (map.size === 0) return 'No URT sessions'
  return Array.from(map.entries()).map(([name, v]) =>
    `  • ${name}: ${v.sessions} session${v.sessions !== 1 ? 's' : ''}, ${v.passages} passages, time ${minsToHours(v.totalMins)}${v.avgGrade !== null ? `, avg ${v.avgGrade}%` : ''}`
  ).join('\n')
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM = `You are Zaker AI — a specialized academic analyst for students.
Rule: Read the student's actual data and analyze it precisely. No generic advice.
Name actual subjects and tasks by name. Write in clear English.
No JSON. No markdown. No vague predictions. Only factual analysis + one precise tip.
Important: Always write "URT" (not YRT or any other abbreviation) when referring to reading sessions.`

// ─── Daily Message ────────────────────────────────────────────────────────────

export async function getDailyMessage(userId: string): Promise<AIMessage> {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const [todayTasks, yestTasks, studyMins, urtMap] = await Promise.all([
    fetchTasks(userId, today, today),
    fetchTasks(userId, yesterday, yesterday),
    fetchStudyMinutes(userId, today + 'T00:00:00', today + 'T23:59:59'),
    fetchURTSessions(userId, today + 'T00:00:00', today + 'T23:59:59'),
  ])

  if (todayTasks.length === 0 && studyMins.size === 0) {
    return {
      type: 'daily', icon: '🌅',
      content: 'No tasks or study sessions recorded today. Add your tasks from the "My Tasks" page and start a study session so I can track you.',
      generatedAt: new Date().toISOString(),
    }
  }

  const done    = todayTasks.filter(t => t.status === 'completed')
  const pending = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const skipped = todayTasks.filter(t => t.status === 'skipped')

  const yestDone  = yestTasks.filter(t => t.status === 'completed').length
  const yestTotal = yestTasks.length
  const yestRate  = yestTotal > 0 ? Math.round(yestDone / yestTotal * 100) : null

  const totalStudyMins = Array.from(studyMins.values()).reduce((a, b) => a + b, 0)

  const prompt = `Student data for today (${today}):

━━ Today's Tasks ━━
${todayTasks.length === 0 ? 'None' : taskLines(todayTasks)}

━━ Study Sessions Today ━━
${studyMinsLines(studyMins)}
Total study time: ${totalStudyMins > 0 ? minsToHours(totalStudyMins) : 'None'}

━━ URT Today ━━
${urtLines(urtMap)}

━━ Yesterday's Performance ━━
${yestRate !== null ? `Completed ${yestDone} of ${yestTotal} tasks (${yestRate}%)` : 'No data for yesterday'}

Summary: ${done.length} tasks done, ${pending.length} still pending, ${skipped.length} skipped.

Write 3 sentences of direct daily analysis: what happened today with actual details + one precise tip for the remaining tasks.`

  let content = ''
  try {
    content = await generateAIResponse([
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: prompt },
    ], { maxTokens: 200, temperature: 0.5 })
  } catch {
    content = pending.length === 0
      ? `You finished all your tasks today${totalStudyMins > 0 ? ` and studied for ${minsToHours(totalStudyMins)}` : ''}! Great day. 🎉`
      : `You finished ${done.length} task${done.length !== 1 ? 's' : ''} with ${pending.length} still pending${pending[0] ? ` (${pending[0].title})` : ''}. ${totalStudyMins > 0 ? `Studied for ${minsToHours(totalStudyMins)} so far.` : ''}`
  }

  return { type: 'daily', icon: '🌅', content: content.trim(), generatedAt: new Date().toISOString() }
}

// ─── Weekly Message ───────────────────────────────────────────────────────────

export async function getWeeklyMessage(userId: string): Promise<AIMessage> {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 6 }), 'yyyy-MM-dd')
  const today     = format(new Date(), 'yyyy-MM-dd')

  const [tasks, studyMins, urtMap] = await Promise.all([
    fetchTasks(userId, weekStart, today),
    fetchStudyMinutes(userId, weekStart + 'T00:00:00', today + 'T23:59:59'),
    fetchURTSessions(userId, weekStart + 'T00:00:00', today + 'T23:59:59'),
  ])

  if (tasks.length === 0 && studyMins.size === 0) {
    return {
      type: 'weekly', icon: '📊',
      content: 'No data for this week yet. Log your tasks and study sessions so I can give you a precise weekly analysis.',
      generatedAt: new Date().toISOString(),
    }
  }

  // Per-day breakdown
  const dayMap = new Map<string, { done: number; total: number; skipped: number }>()
  for (const t of tasks) {
    const d = t.scheduled_date
    const cur = dayMap.get(d) ?? { done: 0, total: 0, skipped: 0 }
    cur.total++
    if (t.status === 'completed') cur.done++
    if (t.status === 'skipped')  cur.skipped++
    dayMap.set(d, cur)
  }
  const dayLines = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => {
    const d = new Date(date + 'T12:00:00')
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
    return `  ${dayName}: ${v.done}/${v.total} done${v.skipped > 0 ? `, ${v.skipped} skipped` : ''}`
  }).join('\n')

  // Weak subjects (completion < 50%)
  const subjMap = new Map<string, { done: number; total: number }>()
  for (const t of tasks) {
    const s = t.subject_name ?? 'General'
    const cur = subjMap.get(s) ?? { done: 0, total: 0 }
    cur.total++
    if (t.status === 'completed') cur.done++
    subjMap.set(s, cur)
  }
  const weakSubjects = Array.from(subjMap.entries())
    .filter(([, v]) => v.total > 0 && v.done / v.total < 0.5)
    .map(([n, v]) => `${n} (${v.done}/${v.total})`)

  const totalDone  = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  const rate       = totalTasks === 0 ? 0 : Math.round(totalDone / totalTasks * 100)
  const totalStudy = Array.from(studyMins.values()).reduce((a, b) => a + b, 0)

  const prompt = `Student data for this week (${weekStart} → ${today}):

━━ Tasks Day by Day ━━
${dayLines || 'None'}

━━ Study Time per Subject ━━
${studyMinsLines(studyMins)}
Total: ${minsToHours(totalStudy)}

━━ URT This Week ━━
${urtLines(urtMap)}

━━ Stats ━━
Total tasks: ${totalDone}/${totalTasks} (${rate}%)
Weak subjects (completion < 50%): ${weakSubjects.length > 0 ? weakSubjects.join(', ') : 'None'}

Write 3 sentences: analyze this week's performance with actual numbers, which subjects need more attention next week, and one precise tip.`

  let content = ''
  try {
    content = await generateAIResponse([
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: prompt },
    ], { maxTokens: 220, temperature: 0.5 })
  } catch {
    content = rate >= 70
      ? `Strong week! You completed ${rate}% (${totalDone}/${totalTasks} tasks) and studied for ${minsToHours(totalStudy)}.${weakSubjects.length > 0 ? ` Focus next week on: ${weakSubjects[0]}.` : ' Keep up the same pace.'}`
      : `You completed ${rate}% this week (${totalDone}/${totalTasks}) and studied for ${minsToHours(totalStudy)}.${weakSubjects.length > 0 ? ` ${weakSubjects[0]} needs more attention next week.` : ' Try to start tasks earlier each day.'}`
  }

  return { type: 'weekly', icon: '📊', content: content.trim(), generatedAt: new Date().toISOString() }
}

// ─── Monthly Message ──────────────────────────────────────────────────────────

export async function getMonthlyMessage(userId: string): Promise<AIMessage> {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const today      = format(new Date(), 'yyyy-MM-dd')

  const [tasks, studyMins, urtMap, goalRes] = await Promise.all([
    fetchTasks(userId, monthStart, today),
    fetchStudyMinutes(userId, monthStart + 'T00:00:00', today + 'T23:59:59'),
    fetchURTSessions(userId, monthStart + 'T00:00:00', today + 'T23:59:59'),
    supabase.from('user_goals')
      .select('title, target_date')
      .eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const goal = goalRes.data as { title: string; target_date: string } | null

  if (tasks.length < 5 && studyMins.size === 0) {
    return {
      type: 'monthly', icon: '📅',
      content: 'Need more data to analyze the month. Study and log your daily tasks so I can give you a precise monthly report.',
      generatedAt: new Date().toISOString(),
    }
  }

  const done  = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  const rate  = total === 0 ? 0 : Math.round(done / total * 100)

  // Subject-level summary
  const subjMap = new Map<string, { done: number; total: number; studyMins: number }>()
  for (const t of tasks) {
    const s = t.subject_name ?? 'General'
    const cur = subjMap.get(s) ?? { done: 0, total: 0, studyMins: studyMins.get(s) ?? 0 }
    cur.total++
    if (t.status === 'completed') cur.done++
    subjMap.set(s, cur)
  }
  // Add subjects that only have study sessions (no tasks)
  for (const [name, mins] of studyMins.entries()) {
    if (!subjMap.has(name)) subjMap.set(name, { done: 0, total: 0, studyMins: mins })
  }

  const subjLines = Array.from(subjMap.entries())
    .sort((a, b) => b[1].studyMins - a[1].studyMins)
    .map(([n, v]) => {
      const taskPart  = v.total > 0 ? `tasks: ${v.done}/${v.total}` : 'no tasks'
      const studyPart = v.studyMins > 0 ? `, study: ${minsToHours(v.studyMins)}` : ''
      return `  • ${n}: ${taskPart}${studyPart}`
    }).join('\n')

  const totalStudy = Array.from(studyMins.values()).reduce((a, b) => a + b, 0)
  const daysLeft   = goal?.target_date
    ? Math.max(0, Math.round((new Date(goal.target_date).getTime() - Date.now()) / 86400000))
    : null

  const prompt = `Student data for this month (${monthStart} → ${today}):

━━ Summary per Subject ━━
${subjLines || 'None'}

━━ URT This Month ━━
${urtLines(urtMap)}

━━ Monthly Stats ━━
Total tasks: ${done}/${total} (${rate}%)
Total study time: ${minsToHours(totalStudy)}
${goal ? `Goal: "${goal.title}" — ${daysLeft} days remaining` : 'No goal set'}

Write 3-4 sentences: a comprehensive monthly review with actual numbers by name, which subjects are strongest and weakest, and one precise tip for next month.`

  let content = ''
  try {
    content = await generateAIResponse([
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: prompt },
    ], { maxTokens: 250, temperature: 0.5 })
  } catch {
    const topSubj = Array.from(subjMap.entries()).sort((a, b) => b[1].studyMins - a[1].studyMins)[0]
    content = rate >= 70
      ? `Excellent month! You completed ${rate}% of tasks and studied for ${minsToHours(totalStudy)} this month.${topSubj ? ` Most studied subject: ${topSubj[0]}.` : ''} Keep up the same pace. 🌟`
      : `This month you completed ${rate}% and studied for ${minsToHours(totalStudy)}.${topSubj ? ` You focused most on ${topSubj[0]}.` : ''} Next month try to be more consistent with daily tasks.`
  }

  return { type: 'monthly', icon: '📅', content: content.trim(), generatedAt: new Date().toISOString() }
}
