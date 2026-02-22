// ─── Exam Plan Service ────────────────────────────────────────────────────────
// Reads user's real data (curriculum, sessions, subjects) and generates a
// day-by-day study plan. Tracks completion and rolls overdue tasks forward.

import { format, addDays, differenceInDays } from 'date-fns'
import { supabase }            from '../lib/supabase'
import { generateAIResponse }  from './aiProvider'
import type { CurriculumItem, UserGoal } from '../types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ExamGoalForm {
  title:        string
  target_date:  string    // yyyy-MM-dd
  hours_per_day: number
  subject_ids:  string[]
}

export interface TaskSummary {
  id:              string
  title:           string
  status:          string
  durationMinutes: number
  subjectName:     string | null
  scheduledDate:   string
}

export interface DayPlanSummary {
  date:           string
  dayLabel:       string
  taskCount:      number
  completedCount: number
  totalMinutes:   number
  isExamDay:      boolean
  isPast:         boolean
}

export interface ExamPlanStatus {
  planId:         string
  goalId:         string
  examDate:       string
  daysLeft:       number
  totalTasks:     number
  completedTasks: number
  overdueTasks:   number
  completionPct:  number
  todayTasks:     TaskSummary[]
  dayPlans:       DayPlanSummary[]
  aiAlert:        string
}

type ActionType = 'study' | 'review' | 'solve'
const ACTION_LABEL: Record<ActionType, string> = { study: 'Study', review: 'Review', solve: 'Solve' }
const ACTION_MINS:  Record<ActionType, number>  = { study: 60, review: 45, solve: 45 }
const ACTION_ORDER: Record<ActionType, number>  = { study: 0, review: 1, solve: 2 }

// ─── Save / update goal ───────────────────────────────────────────────────────

export async function saveExamGoal(
  userId: string,
  form: ExamGoalForm,
  existingGoalId?: string,
): Promise<UserGoal> {
  const payload = {
    user_id:       userId,
    title:         form.title,
    target_date:   form.target_date,
    hours_per_day: form.hours_per_day,
    subjects:      JSON.stringify(form.subject_ids),
    is_active:     true,
  }

  if (existingGoalId) {
    const { data } = await supabase.from('user_goals').update(payload).eq('id', existingGoalId).select().single()
    return data as UserGoal
  }

  // Deactivate any existing active goals first
  await supabase.from('user_goals').update({ is_active: false }).eq('user_id', userId).eq('is_active', true)

  const { data } = await supabase.from('user_goals').insert(payload).select().single()
  return data as UserGoal
}

// ─── Load active goal ─────────────────────────────────────────────────────────

export async function loadActiveGoal(userId: string): Promise<UserGoal | null> {
  const { data } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const raw = data as Record<string, unknown>
  const subjects = typeof raw.subjects === 'string'
    ? JSON.parse(raw.subjects)
    : (Array.isArray(raw.subjects) ? raw.subjects : [])
  return { ...raw, subjects } as UserGoal
}

// ─── Generate exam plan ────────────────────────────────────────────────────────
// Builds work units from curriculum items, distributes across days, saves to DB.

export async function generateExamPlan(
  userId: string,
  goal: UserGoal,
): Promise<string> {  // returns planId
  const today      = format(new Date(), 'yyyy-MM-dd')
  const examDate   = goal.target_date ?? ''
  const daysLeft   = examDate
    ? Math.max(1, differenceInDays(new Date(examDate + 'T12:00:00'), new Date(today + 'T12:00:00')))
    : 7
  const minsPerDay = (goal.hours_per_day || 4) * 60

  const goalSubjects: string[] = Array.isArray(goal.subjects) ? goal.subjects : []

  // ── Load curriculum + subjects ───────────────────────────────────────────────
  const [{ data: items }, { data: subjectsData }] = await Promise.all([
    supabase.from('curriculum_items').select('*').eq('user_id', userId).order('order_index'),
    supabase.from('subjects').select('id, name, color').eq('user_id', userId),
  ])

  const subjectMap = new Map((subjectsData ?? []).map(s => [s.id, s.name as string]))
  const los = ((items ?? []) as CurriculumItem[]).filter(i => i.parent_id === null)

  // ── Build work units ─────────────────────────────────────────────────────────
  interface Unit { loId: string; loTitle: string; subjectId: string; subjectName: string; action: ActionType; durationMinutes: number; title: string }
  const units: Unit[] = []

  for (const lo of los) {
    if (goalSubjects.length && !goalSubjects.includes(lo.subject_id)) continue
    const subjectName = subjectMap.get(lo.subject_id) ?? 'Unknown'
    if (!lo.studied)                         units.push(mkUnit(lo, 'study',  subjectName))
    if (lo.studied  && !lo.reviewed)         units.push(mkUnit(lo, 'review', subjectName))
    if (lo.studied  && lo.reviewed && !lo.solved) units.push(mkUnit(lo, 'solve', subjectName))
  }

  units.sort((a, b) =>
    ACTION_ORDER[a.action] - ACTION_ORDER[b.action] ||
    a.subjectName.localeCompare(b.subjectName),
  )

  // ── Abandon any existing active exam plans ───────────────────────────────────
  await supabase
    .from('study_plans').update({ status: 'abandoned' })
    .eq('user_id', userId).eq('status', 'active')

  // ── Create plan record ───────────────────────────────────────────────────────
  const { data: newPlan } = await supabase.from('study_plans').insert({
    user_id:      userId,
    goal_id:      goal.id,
    title:        `📅 Exam Plan: ${goal.title}`,
    plan_type:    'custom',
    start_date:   today,
    end_date:     examDate || null,
    status:       'active',
    ai_generated: true,
    metadata:     { type: 'exam_plan', exam_date: examDate, hours_per_day: goal.hours_per_day },
  }).select().single()

  if (!newPlan) throw new Error('Failed to create plan')
  const planId = (newPlan as { id: string }).id

  // ── Distribute across study days ─────────────────────────────────────────────
  const studyDays = Math.max(1, daysLeft - 1)  // last day = exam day
  type TaskInsert = {
    plan_id: string; user_id: string; subject_id: string | null; subject_name: string
    title: string; scheduled_date: string; duration_minutes: number
    status: string; priority: number; order_index: number
  }
  const inserts: TaskInsert[] = []
  let unitIdx = 0

  for (let d = 0; d < studyDays && unitIdx < units.length; d++) {
    const date = format(addDays(new Date(today + 'T12:00:00'), d), 'yyyy-MM-dd')
    let mins = 0, orderIdx = 0

    while (unitIdx < units.length && mins + units[unitIdx].durationMinutes <= minsPerDay) {
      const u = units[unitIdx]
      inserts.push({
        plan_id:          planId,
        user_id:          userId,
        subject_id:       u.subjectId || null,
        subject_name:     u.subjectName,
        title:            u.title,
        scheduled_date:   date,
        duration_minutes: u.durationMinutes,
        status:           'pending',
        priority:         u.action === 'study' ? 3 : u.action === 'review' ? 2 : 1,
        order_index:      orderIdx++,
      })
      mins += u.durationMinutes
      unitIdx++
    }
  }

  if (inserts.length > 0) {
    await supabase.from('plan_tasks').insert(inserts)
  }

  return planId
}

// ─── Load active exam plan ────────────────────────────────────────────────────

export async function loadActiveExamPlanId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('study_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .contains('metadata', { type: 'exam_plan' })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

// ─── Get full plan status ─────────────────────────────────────────────────────

export async function getExamPlanStatus(
  userId: string,
  planId: string,
  goal: UserGoal,
): Promise<ExamPlanStatus> {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const examDate  = goal.target_date ?? ''
  const daysLeft  = examDate
    ? Math.max(0, differenceInDays(new Date(examDate + 'T12:00:00'), new Date(today + 'T12:00:00')))
    : 0

  const { data: allTasks } = await supabase
    .from('plan_tasks')
    .select('id, title, status, duration_minutes, subject_name, scheduled_date')
    .eq('plan_id', planId)
    .order('scheduled_date')
    .order('order_index')

  const tasks: TaskSummary[] = (allTasks ?? []).map(r => ({
    id:              r.id as string,
    title:           r.title as string,
    status:          r.status as string,
    durationMinutes: r.duration_minutes as number,
    subjectName:     r.subject_name as string | null,
    scheduledDate:   r.scheduled_date as string,
  }))

  const totalTasks     = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const overdueTasks   = tasks.filter(t => t.status === 'pending' && t.scheduledDate < today).length
  const completionPct  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const todayTasks     = tasks.filter(t => t.scheduledDate === today)

  // ── Build day summary ────────────────────────────────────────────────────────
  const dayMap = new Map<string, { cnt: number; done: number; mins: number }>()
  for (const t of tasks) {
    const cur = dayMap.get(t.scheduledDate) ?? { cnt: 0, done: 0, mins: 0 }
    cur.cnt++
    cur.mins += t.durationMinutes
    if (t.status === 'completed') cur.done++
    dayMap.set(t.scheduledDate, cur)
  }

  const dayPlans: DayPlanSummary[] = []
  dayMap.forEach((v, date) => {
    dayPlans.push({
      date,
      dayLabel:       fmtDayLabel(date, today),
      taskCount:      v.cnt,
      completedCount: v.done,
      totalMinutes:   v.mins,
      isExamDay:      date === examDate,
      isPast:         date < today,
    })
  })
  if (examDate && !dayMap.has(examDate)) {
    dayPlans.push({ date: examDate, dayLabel: '🎯 Exam Day', taskCount: 0, completedCount: 0, totalMinutes: 0, isExamDay: true, isPast: false })
  }
  dayPlans.sort((a, b) => a.date.localeCompare(b.date))

  // ── AI urgency alert ─────────────────────────────────────────────────────────
  let aiAlert = ''
  try {
    aiAlert = await generateAIResponse([
      { role: 'system', content: 'You are Zaker AI. Write in clear English. No markdown. Two sentences only.' },
      {
        role: 'user',
        content:
          `The student has ${daysLeft} days until the exam.\n` +
          `Completed ${completionPct}% of the plan. ${overdueTasks} overdue tasks.\n` +
          `Write: (1) a quick assessment of the situation. (2) a clear tip or warning.`,
      },
    ], { maxTokens: 100, temperature: 0.5 })
  } catch {
    if (overdueTasks > 0) {
      aiAlert = `You have ${overdueTasks} overdue tasks and only ${daysLeft} days left! Move overdue tasks to today and start immediately.`
    } else if (completionPct >= 80) {
      aiAlert = `Excellent! ${completionPct}% done and the exam is in ${daysLeft} days. Keep up the same pace.`
    } else {
      aiAlert = `${completionPct}% of the plan is done with ${daysLeft} days remaining. You need to push harder today!`
    }
  }

  return {
    planId, goalId: goal.id, examDate, daysLeft,
    totalTasks, completedTasks, overdueTasks, completionPct,
    todayTasks, dayPlans, aiAlert,
  }
}

// ─── Reschedule overdue tasks to today ───────────────────────────────────────

export async function rescheduleOverdueTasks(userId: string, planId: string): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: overdue } = await supabase
    .from('plan_tasks')
    .select('id')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('scheduled_date', today)

  if (!overdue?.length) return 0

  const ids = overdue.map(t => (t as { id: string }).id)
  await supabase
    .from('plan_tasks')
    .update({ scheduled_date: today })
    .in('id', ids)

  return ids.length
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkUnit(lo: CurriculumItem, action: ActionType, subjectName: string) {
  return {
    loId:            lo.id,
    loTitle:         lo.title,
    subjectId:       lo.subject_id,
    subjectName,
    action,
    durationMinutes: ACTION_MINS[action],
    title:           `${ACTION_LABEL[action]}: ${lo.title}`,
  }
}

function fmtDayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === format(addDays(new Date(today + 'T12:00:00'), 1), 'yyyy-MM-dd')) return 'Tomorrow'
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'numeric', day: 'numeric',
  })
}
