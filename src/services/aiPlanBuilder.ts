// ─── AI Plan Builder ─────────────────────────────────────────────────────────
// Converts one natural-language sentence into a full, distributed study plan.

import { supabase }           from '../lib/supabase'
import { generateAIResponse } from './aiProvider'
import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns'
import type { Database } from '../lib/database.types'

type PlanTaskInsert = Database['public']['Tables']['plan_tasks']['Insert']

// ─── Color palette for auto-created subjects ──────────────────────────────────
const PALETTE = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']
function autoColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AISubject {
  name:             string
  sessions:         number
  duration_minutes: number
  is_weak:          boolean
  title_prefix:     string
}

interface AIBuildResult {
  reply:          string
  exam_date:      string
  plan_title:     string
  subjects:       AISubject[]
  tasks_per_day:  number
  include_review: boolean
}

export interface BuildPlanResult {
  success:      boolean
  reply:        string
  tasksCreated: number
  examDate:     string | null
  error?:       string
}

// ─── Main function ─────────────────────────────────────────────────────────────

export async function buildPlanFromDescription(
  userId:      string,
  description: string,
): Promise<BuildPlanResult> {
  const today = format(new Date(), 'yyyy-MM-dd')

  // Fetch context for the prompt
  const [{ data: existingSubjects }, { data: existingGoal }] = await Promise.all([
    supabase.from('subjects').select('name').eq('user_id', userId).eq('is_active', true),
    supabase.from('user_goals')
      .select('title, target_date')
      .eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const subjList  = (existingSubjects ?? []).map(s => s.name).join(', ')
  const in14days  = format(addDays(new Date(), 14), 'yyyy-MM-dd')
  const in21days  = format(addDays(new Date(), 21), 'yyyy-MM-dd')
  const in30days  = format(addDays(new Date(), 30), 'yyyy-MM-dd')

  const systemPrompt = `You are an expert AI study planner. Analyze the description and output a complete structured plan.

TODAY: ${today}
EXISTING SUBJECTS: ${subjList || 'none'}
CURRENT GOAL: ${existingGoal ? `${existingGoal.title} — ${existingGoal.target_date}` : 'none'}

RELATIVE DATE CONVERSIONS (use these exact dates):
- "بعد أسبوعين" / "after 2 weeks" = ${in14days}
- "بعد 3 أسابيع" / "after 3 weeks" = ${in21days}
- "بعد شهر" / "after a month" = ${in30days}

Respond ONLY with valid compact JSON (no markdown fences):
{
  "reply": "<2-sentence motivational reply in student's language>",
  "exam_date": "yyyy-MM-dd",
  "plan_title": "<short concise plan name>",
  "subjects": [
    {
      "name": "<subject name>",
      "sessions": <number>,
      "duration_minutes": <45-120>,
      "is_weak": <true if student mentioned weakness>,
      "title_prefix": "<very short label, e.g. 'كيناماتيكس' or 'Kinematics'>"
    }
  ],
  "tasks_per_day": <1-3, = ceil(total_sessions / available_days), max 3>,
  "include_review": <true if exam < 3 weeks OR any is_weak = true>
}

RULES:
- Parse ALL subjects and session counts mentioned
- For weak subjects: duration_minutes += 15, is_weak = true
- If no exam date → use ${in30days}
- Respond in the SAME language as the student (Arabic or English)`

  let raw: string
  try {
    raw = await generateAIResponse(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: description }],
      { maxTokens: 700, temperature: 0.3 },
    )
  } catch {
    return { success: false, reply: 'حصل خطأ في الاتصال بالذكاء الاصطناعي. حاول تاني.', tasksCreated: 0, examDate: null }
  }

  // Parse AI response
  let plan: AIBuildResult
  try {
    const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
    if (!match) throw new Error('no JSON')
    plan = JSON.parse(match[0])
    if (!plan.subjects?.length) throw new Error('no subjects')
  } catch {
    return { success: false, reply: 'مش قادر أحلل الوصف. حاول تكتب تفاصيل أكتر، مثل: "عندي امتحان فيزياء بعد 3 أسابيع، كيناماتيكس 5 سيشن، ديناميكس 8 سيشن".', tasksCreated: 0, examDate: null }
  }

  const examDate   = plan.exam_date ?? in30days
  const perDay     = Math.max(1, Math.min(3, plan.tasks_per_day ?? 2))
  const subjects   = plan.subjects ?? []

  // ── 1. Deactivate old goals, create new one ─────────────────────────────────
  await supabase.from('user_goals').update({ is_active: false }).eq('user_id', userId)
  const { data: newGoal } = await supabase.from('user_goals').insert({
    user_id:      userId,
    title:        plan.plan_title,
    target_date:  examDate,
    hours_per_day: perDay * 1.5,
    subjects:     subjects.map(s => s.name),
    is_active:    true,
  }).select('id').maybeSingle()

  // ── 2. Get or create active study plan ──────────────────────────────────────
  let planId: string
  const { data: activePlan } = await supabase.from('study_plans')
    .select('id').eq('user_id', userId).eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (activePlan?.id) {
    planId = activePlan.id
    // Fresh start: clear future pending tasks
    await supabase.from('plan_tasks')
      .delete().eq('user_id', userId).eq('status', 'pending')
      .gte('scheduled_date', today)
  } else {
    const { data: newPlan } = await supabase.from('study_plans').insert({
      user_id:      userId,
      goal_id:      newGoal?.id ?? null,
      title:        plan.plan_title,
      plan_type:    'ai_generated',
      start_date:   today,
      end_date:     examDate,
      status:       'active',
      ai_generated: true,
    }).select('id').maybeSingle()
    if (!newPlan?.id) return { success: false, reply: 'حصل خطأ في إنشاء الخطة.', tasksCreated: 0, examDate }
    planId = newPlan.id
  }

  // ── 3. Upsert subjects and get their IDs ────────────────────────────────────
  const subjIdMap = new Map<string, string | null>()
  for (const subj of subjects) {
    const { data: found } = await supabase.from('subjects')
      .select('id').eq('user_id', userId).ilike('name', `%${subj.name}%`).maybeSingle()
    if (found?.id) {
      subjIdMap.set(subj.name, found.id)
    } else {
      const { data: created } = await supabase.from('subjects').insert({
        user_id:   userId,
        name:      subj.name,
        color:     autoColor(subj.name),
        is_active: true,
      }).select('id').maybeSingle()
      subjIdMap.set(subj.name, created?.id ?? null)
    }
  }

  // ── 4. Build interleaved task queue ─────────────────────────────────────────
  // Each subject gets its sessions, weak subjects also get review sessions
  type QueueItem = { subj: AISubject; sessionNum: number; isReview: boolean }
  const queues: QueueItem[][] = subjects.map(subj => {
    const items: QueueItem[] = []
    for (let i = 1; i <= subj.sessions; i++) {
      items.push({ subj, sessionNum: i, isReview: false })
    }
    if (plan.include_review && subj.is_weak) {
      const reviewCount = Math.max(1, Math.floor(subj.sessions / 3))
      for (let i = 1; i <= reviewCount; i++) {
        items.push({ subj, sessionNum: i, isReview: true })
      }
    }
    return items
  })

  // Round-robin interleave so subjects alternate (not all of one then another)
  const interleaved: QueueItem[] = []
  let hasMore = true
  while (hasMore) {
    hasMore = false
    for (const q of queues) {
      const item = q.shift()
      if (item) { interleaved.push(item); hasMore = true }
    }
  }

  // ── 5. Assign dates ─────────────────────────────────────────────────────────
  const loadMap = new Map<string, number>()
  const rows: PlanTaskInsert[] = []
  let cur = addDays(new Date(), 1)

  for (const { subj, sessionNum, isReview } of interleaved) {
    while ((loadMap.get(format(cur, 'yyyy-MM-dd')) ?? 0) >= perDay) {
      cur = addDays(cur, 1)
    }
    const dateStr = format(cur, 'yyyy-MM-dd')
    const title   = isReview
      ? `${subj.title_prefix} — مراجعة ${sessionNum}`
      : `${subj.title_prefix} — Session ${sessionNum}`
    const dur = isReview
      ? Math.round(subj.duration_minutes * 0.6)
      : subj.duration_minutes

    rows.push({
      plan_id:          planId,
      user_id:          userId,
      subject_id:       subjIdMap.get(subj.name) ?? null,
      subject_name:     subj.name,
      title,
      scheduled_date:   dateStr,
      duration_minutes: dur,
      status:           'pending',
      priority:         subj.is_weak ? 1 : 2,
      order_index:      99,
    })
    loadMap.set(dateStr, (loadMap.get(dateStr) ?? 0) + 1)
  }

  if (rows.length > 0) {
    await supabase.from('plan_tasks').insert(rows)
  }

  return {
    success:      true,
    reply:        plan.reply,
    tasksCreated: rows.length,
    examDate,
  }
}
