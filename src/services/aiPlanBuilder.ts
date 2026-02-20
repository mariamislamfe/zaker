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

  const subjList = (existingSubjects ?? []).map(s => s.name).join(', ')

  // Pre-calculated absolute dates for the prompt
  const d7  = format(addDays(new Date(), 7),  'yyyy-MM-dd')
  const d14 = format(addDays(new Date(), 14), 'yyyy-MM-dd')
  const d21 = format(addDays(new Date(), 21), 'yyyy-MM-dd')
  const d30 = format(addDays(new Date(), 30), 'yyyy-MM-dd')
  const d60 = format(addDays(new Date(), 60), 'yyyy-MM-dd')
  const d90 = format(addDays(new Date(), 90), 'yyyy-MM-dd')

  const systemPrompt = `You are an expert AI study planner inside Zaker app. Read the student's description carefully and output a complete structured study plan as JSON.

TODAY: ${today}
EXISTING SUBJECTS: ${subjList || 'none yet'}
CURRENT GOAL: ${existingGoal ? `${existingGoal.title} → ${existingGoal.target_date}` : 'none'}

══ STEP 1 — PARSE THE DESCRIPTION ══
Extract from what the student wrote:
- All subjects mentioned (with session count and duration if given)
- Exam/deadline date (relative or absolute)
- Which subjects are "weak" (keywords: ضعيف، صعبة، مش فاهم، weak، struggling، difficult)
- Default duration_minutes = 60 if not mentioned

══ STEP 2 — CONVERT RELATIVE DATES ══
Use these exact absolute dates:
- "بعد أسبوع"      / "in 1 week"    = ${d7}
- "بعد أسبوعين"    / "in 2 weeks"   = ${d14}
- "بعد 3 أسابيع"   / "in 3 weeks"   = ${d21}
- "بعد شهر"        / "in 1 month"   = ${d30}
- "بعد شهرين"      / "in 2 months"  = ${d60}
- "بعد 3 شهور"     / "in 3 months"  = ${d90}
- No date mentioned                  = ${d30}
- For other values: today + (N × 7) for weeks, today + (N × 30) for months

══ STEP 3 — CALCULATE tasks_per_day ══
available_days = (exam_date - today) - 3   ← leave 3-day buffer before exam
total_sessions = sum of ALL sessions across ALL subjects
tasks_per_day  = ceil(total_sessions / available_days)
CLAMP: if tasks_per_day < 1 → 1 | if tasks_per_day > 3 → 3

══ STEP 4 — APPLY WEAK SUBJECT RULES ══
For each is_weak = true subject:
- duration_minutes += 15 (extra time per session)
- set include_review = true

══ OUTPUT — ONLY valid compact JSON, NO markdown, NO explanation ══
{
  "reply": "<2 warm sentences in the student's language summarizing the plan>",
  "exam_date": "yyyy-MM-dd",
  "plan_title": "<short Arabic or English plan name>",
  "subjects": [
    {"name":"<full name>","sessions":<N>,"duration_minutes":<45-120>,"is_weak":<bool>,"title_prefix":"<short Arabic/English label>"}
  ],
  "tasks_per_day": <1|2|3>,
  "include_review": <true|false>
}

══ FEW-SHOT EXAMPLE 1 (Arabic) ══
Input: "عندي امتحان فيزياء بعد 3 أسابيع، كيناماتيكس 5 سيشن، ديناميكس 8 سيشن، وأنا ضعيف في الثيرمو 4 سيشن"

Reasoning:
- exam_date = ${d21} (3 أسابيع من النهارده)
- available_days = 21 - 3 = 18 يوم
- total = 5 + 8 + 4 = 17 سيشن
- tasks_per_day = ceil(17/18) = 1
- ثيرمو is_weak=true → duration 60+15=75 دقيقة

Output:
{"reply":"ممتاز! بنيتلك خطة فيزياء لـ 3 أسابيع — الثيرمو هياخد وقت أطول ومعاه مراجعات. روح على بركة الله 💪","exam_date":"${d21}","plan_title":"خطة الفيزياء","subjects":[{"name":"Kinematics","sessions":5,"duration_minutes":60,"is_weak":false,"title_prefix":"كيناماتيكس"},{"name":"Dynamics","sessions":8,"duration_minutes":60,"is_weak":false,"title_prefix":"ديناميكس"},{"name":"Thermodynamics","sessions":4,"duration_minutes":75,"is_weak":true,"title_prefix":"ثيرمو"}],"tasks_per_day":1,"include_review":true}

══ FEW-SHOT EXAMPLE 2 (English) ══
Input: "Math exam in 2 weeks: Calculus 6 sessions 60min, Statistics 4 sessions 45min, struggling with Linear Algebra 5 sessions"

Reasoning:
- exam_date = ${d14} (2 weeks)
- available_days = 14 - 3 = 11 days
- total = 6 + 4 + 5 = 15 sessions
- tasks_per_day = ceil(15/11) = 2
- Linear Algebra is_weak=true → duration 60+15=75 min

Output:
{"reply":"Great! 15 sessions over 2 weeks — 2 per day. Linear Algebra gets extra time and review sessions. You've got this! 🎯","exam_date":"${d14}","plan_title":"Math Exam Prep","subjects":[{"name":"Calculus","sessions":6,"duration_minutes":60,"is_weak":false,"title_prefix":"Calculus"},{"name":"Statistics","sessions":4,"duration_minutes":45,"is_weak":false,"title_prefix":"Stats"},{"name":"Linear Algebra","sessions":5,"duration_minutes":75,"is_weak":true,"title_prefix":"Lin Algebra"}],"tasks_per_day":2,"include_review":true}

══ FEW-SHOT EXAMPLE 3 (Arabic, many subjects) ══
Input: "عندي امتحان كيمياء بعد شهر، عضوي 10 سيشن، غير عضوي 7 سيشن، فيزيائية 4 سيشن وهي صعبة عليا"

Reasoning:
- exam_date = ${d30} (شهر)
- available_days = 30 - 3 = 27 يوم
- total = 10 + 7 + 4 = 21 سيشن
- tasks_per_day = ceil(21/27) = 1
- فيزيائية is_weak=true → duration 60+15=75

Output:
{"reply":"تمام! 21 سيشن كيمياء على 4 أسابيع — الكيمياء الفيزيائية هتاخد وقت زيادة ومراجعات. انت تقدر 🔥","exam_date":"${d30}","plan_title":"خطة الكيمياء","subjects":[{"name":"Organic Chemistry","sessions":10,"duration_minutes":60,"is_weak":false,"title_prefix":"عضوي"},{"name":"Inorganic Chemistry","sessions":7,"duration_minutes":60,"is_weak":false,"title_prefix":"غير عضوي"},{"name":"Physical Chemistry","sessions":4,"duration_minutes":75,"is_weak":true,"title_prefix":"فيزيائية"}],"tasks_per_day":1,"include_review":true}

NOW process the student input below and output ONLY the JSON:`

  let raw: string
  try {
    raw = await generateAIResponse(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: description }],
      { maxTokens: 800, temperature: 0.1 },   // low temp = deterministic JSON
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
    return {
      success: false,
      reply: 'مش قادر أحلل الوصف دا. حاول تكتب زي: "امتحان فيزياء بعد 3 أسابيع، كيناماتيكس 5 سيشن 60 دقيقة، ديناميكس 8 سيشن".',
      tasksCreated: 0, examDate: null,
    }
  }

  const examDate = plan.exam_date ?? format(addDays(new Date(), 30), 'yyyy-MM-dd')

  // ── Server-side recalculate tasks_per_day (don't trust AI math blindly) ──────
  const totalSessions   = (plan.subjects ?? []).reduce((s, x) => s + (x.sessions ?? 0), 0)
  const availableDays   = Math.max(3, differenceInCalendarDays(parseISO(examDate), new Date()) - 3)
  const correctPerDay   = Math.max(1, Math.min(3, Math.ceil(totalSessions / availableDays)))
  const perDay          = correctPerDay
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
