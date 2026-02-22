// ─── AI Full Report Service ────────────────────────────────────────────────────
// Collects ALL real user data, then calls K2-Think to produce a structured
// 5-section academic performance report in Egyptian Arabic.

import { format, subDays, startOfWeek, getHours } from 'date-fns'
import { supabase }            from '../lib/supabase'
import { generateAIResponse }  from './aiProvider'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TomorrowTask {
  task:            string
  subject:         string
  durationMinutes: number
}

export interface AIReport {
  behaviorInsights: string
  riskPrediction:   string
  priorities:       string[]
  tomorrowPlan:     TomorrowTask[]
  advice:           string
  generatedAt:      string
}

// ─── Data collection ──────────────────────────────────────────────────────────

async function collectData(userId: string): Promise<string> {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const since14d  = subDays(new Date(), 14).toISOString()
  const since7d   = subDays(new Date(), 7).toISOString()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 6 }), 'yyyy-MM-dd')

  const [
    { data: sessions },
    { data: subjects },
    { data: tasks7d },
    { data: overdueTasks },
    { data: currItems },
    { data: urtSessions },
    { data: sleepLogs },
  ] = await Promise.all([
    supabase.from('sessions')
      .select('duration_seconds, subject_id, started_at')
      .eq('user_id', userId).eq('status', 'completed').gte('started_at', since14d),
    supabase.from('subjects')
      .select('id, name, color').eq('user_id', userId).eq('is_active', true),
    supabase.from('plan_tasks')
      .select('status, duration_minutes, title, subject_name, scheduled_date')
      .eq('user_id', userId).gte('scheduled_date', weekStart).lte('scheduled_date', today),
    supabase.from('plan_tasks')
      .select('id').eq('user_id', userId).eq('status', 'pending').lt('scheduled_date', today),
    supabase.from('curriculum_items')
      .select('subject_id, studied, reviewed, solved, parent_id')
      .eq('user_id', userId).is('parent_id', null),
    supabase.from('practice_sessions')
      .select('actual_seconds, created_at')
      .eq('user_id', userId).gte('created_at', since7d),
    supabase.from('sleep_logs')
      .select('sleep_duration_minutes')
      .eq('user_id', userId).gte('log_date', format(subDays(new Date(), 7), 'yyyy-MM-dd')),
  ])

  const subjectMap = new Map((subjects ?? []).map(s => [s.id, s.name as string]))

  // ── Study hours per subject (14 days) ────────────────────────────────────────
  const secPerSubject = new Map<string, number>()
  const hourCounts    = Array<number>(24).fill(0)
  const studyDays     = new Set<string>()

  for (const s of sessions ?? []) {
    const name = subjectMap.get(s.subject_id) ?? 'Unknown'
    secPerSubject.set(name, (secPerSubject.get(name) ?? 0) + (s.duration_seconds ?? 0))
    hourCounts[getHours(new Date(s.started_at))]++
    studyDays.add(format(new Date(s.started_at), 'yyyy-MM-dd'))
  }

  const totalSec14d    = [...secPerSubject.values()].reduce((a, b) => a + b, 0)
  const avgDailyHours  = (totalSec14d / 14 / 3600).toFixed(1)
  const peakHour       = hourCounts.indexOf(Math.max(...hourCounts))
  const subjectLines   = [...secPerSubject.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([n, s]) => `  • ${n}: ${(s / 3600).toFixed(1)}h`)
    .join('\n') || '  • No sessions recorded'

  // ── Tasks this week ───────────────────────────────────────────────────────────
  const taskArr       = (tasks7d ?? []) as { status: string; duration_minutes: number; title: string; subject_name: string | null; scheduled_date: string }[]
  const doneTasks     = taskArr.filter(t => t.status === 'completed').length
  const skippedTasks  = taskArr.filter(t => t.status === 'skipped').length
  const pendingTasks  = taskArr.filter(t => t.status === 'pending').length
  const completionPct = taskArr.length > 0 ? Math.round((doneTasks / taskArr.length) * 100) : 0
  const overdueCount  = (overdueTasks ?? []).length

  // ── Curriculum progress per subject ─────────────────────────────────────────
  const currMap = new Map<string, { total: number; studied: number; reviewed: number; solved: number }>()
  for (const item of (currItems ?? []) as { subject_id: string; studied: boolean; reviewed: boolean; solved: boolean }[]) {
    const name = subjectMap.get(item.subject_id) ?? 'Unknown'
    const cur  = currMap.get(name) ?? { total: 0, studied: 0, reviewed: 0, solved: 0 }
    cur.total++
    if (item.studied)  cur.studied++
    if (item.reviewed) cur.reviewed++
    if (item.solved)   cur.solved++
    currMap.set(name, cur)
  }
  const currLines = [...currMap.entries()]
    .map(([n, v]) => `  • ${n}: ${v.total} chapters → studied ${v.studied} / reviewed ${v.reviewed} / solved ${v.solved}`)
    .join('\n') || '  • No curriculum data'

  // ── URT ──────────────────────────────────────────────────────────────────────
  const urtCount = (urtSessions ?? []).length
  const urtMin   = Math.round((urtSessions ?? []).reduce((s, r) => s + ((r as { actual_seconds: number }).actual_seconds ?? 0), 0) / 60)

  // ── Sleep ────────────────────────────────────────────────────────────────────
  const sleepArr   = (sleepLogs ?? []) as { sleep_duration_minutes: number | null }[]
  const validSleep = sleepArr.filter(s => s.sleep_duration_minutes !== null)
  const avgSleep   = validSleep.length > 0
    ? (validSleep.reduce((s, r) => s + (r.sleep_duration_minutes ?? 0), 0) / validSleep.length / 60).toFixed(1)
    : 'Not recorded'

  // ── Assemble context string ───────────────────────────────────────────────────
  return `
== Student Data (Last 14 Days) ==

📊 Study:
  • Total: ${(totalSec14d / 3600).toFixed(1)}h in 14 days
  • Daily average: ${avgDailyHours}h/day
  • Study days: ${studyDays.size} of 14
  • Peak activity: ${peakHour}:00
  • Subject breakdown:
${subjectLines}

✅ Tasks (this week):
  • Done: ${doneTasks} | Skipped: ${skippedTasks} | Pending: ${pendingTasks} | Overdue: ${overdueCount}
  • Completion rate: ${completionPct}%

📚 Curriculum:
${currLines}

📖 URT (this week): ${urtCount} session${urtCount !== 1 ? 's' : ''} (${urtMin} minutes)

😴 Average sleep: ${avgSleep}h/night
  `.trim()
}

// ─── AI report generator ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intelligent academic performance strategist inside a study app called Zaker.
Analyze the student's REAL data and return ONLY a valid JSON object with these exact keys — no markdown, no extra text:
{
  "behaviorInsights": "2-3 sentences in English about study patterns and habits",
  "riskPrediction": "1-2 sentences in English about what happens if behavior continues unchanged",
  "priorities": ["priority 1 in English", "priority 2 in English", "priority 3 in English"],
  "tomorrowPlan": [
    {"task": "task description in English", "subject": "subject name", "durationMinutes": 60}
  ],
  "advice": "2-3 sentences in English of direct, motivational coaching"
}
Be specific, data-driven, honest. Name actual subjects. Keep each section concise.`

export async function generateAIReport(userId: string): Promise<AIReport> {
  const dataContext = await collectData(userId)

  const raw = await generateAIResponse([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Here is the student's real data — analyze it and return JSON only:\n\n${dataContext}`,
    },
  ], { maxTokens: 800, temperature: 0.4, fallbackToMock: false })

  // Extract JSON from response (model might wrap in ```json)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return structured data')

  const parsed = JSON.parse(jsonMatch[0]) as Omit<AIReport, 'generatedAt'>

  return {
    behaviorInsights: parsed.behaviorInsights ?? '',
    riskPrediction:   parsed.riskPrediction   ?? '',
    priorities:       Array.isArray(parsed.priorities) ? parsed.priorities : [],
    tomorrowPlan:     Array.isArray(parsed.tomorrowPlan) ? parsed.tomorrowPlan : [],
    advice:           parsed.advice ?? '',
    generatedAt:      new Date().toISOString(),
  }
}

// ─── localStorage cache ────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000   // 30 minutes

export function getCachedReport(userId: string): AIReport | null {
  try {
    const raw = localStorage.getItem(`zaker_report_${userId}`)
    if (!raw) return null
    const report = JSON.parse(raw) as AIReport
    if (Date.now() - new Date(report.generatedAt).getTime() > CACHE_TTL_MS) return null
    return report
  } catch {
    return null
  }
}

export function setCachedReport(userId: string, report: AIReport): void {
  localStorage.setItem(`zaker_report_${userId}`, JSON.stringify(report))
}

export function clearCachedReport(userId: string): void {
  localStorage.removeItem(`zaker_report_${userId}`)
}
