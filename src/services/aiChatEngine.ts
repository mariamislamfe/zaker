// ─── AI Chat Engine ───────────────────────────────────────────────────────────
// Processes natural-language chat messages (Arabic / English) and translates
// them into concrete plan actions executed against Supabase.
// Now with full plan context + bulk scheduling (add_tasks).

import { supabase }                        from '../lib/supabase'
import { generateAIResponse }              from './aiProvider'
import { format, addDays, parseISO,
         differenceInCalendarDays }        from 'date-fns'
import type { Database }                   from '../lib/database.types'

type PlanTaskInsert = Database['public']['Tables']['plan_tasks']['Insert']

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:               string
  role:             'user' | 'assistant'
  content:          string
  actionsExecuted?: number
  timestamp:        string
}

interface ChatAction {
  type:              string
  // single task
  subject_name?:     string
  title?:            string
  date?:             string
  duration_minutes?: number
  start_time?:       string
  task_id?:          string
  new_date?:         string
  new_start_time?:   string
  parts?:            Array<{ title: string; duration_minutes: number }>
  // bulk tasks
  title_prefix?:     string
  count?:            number
  tasks_per_day?:    number
  start_date?:       string
}

export interface ChatResult {
  reply:           string
  actionsExecuted: number
}

// ─── Helper: get active plan id ───────────────────────────────────────────────

async function getActivePlanId(userId: string): Promise<string | null> {
  const { data } = await supabase.from('study_plans')
    .select('id').eq('user_id', userId).eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data?.id ?? null
}

// ─── Helper: fuzzy-match subject ──────────────────────────────────────────────

async function matchSubject(userId: string, name: string) {
  const { data } = await supabase.from('subjects')
    .select('id, name').eq('user_id', userId)
    .ilike('name', `%${name}%`).limit(1).maybeSingle()
  return data
}

// ─── Execute a single action against Supabase ─────────────────────────────────

async function execAction(userId: string, action: ChatAction): Promise<boolean> {
  try {
    switch (action.type) {

      // ── Add ONE task ──────────────────────────────────────────────────────
      case 'add_task': {
        const planId = await getActivePlanId(userId)
        if (!planId) return false

        const sName = action.subject_name ?? 'Study'
        const subj  = await matchSubject(userId, sName)

        await supabase.from('plan_tasks').insert({
          plan_id:              planId,
          user_id:              userId,
          subject_id:           subj?.id ?? null,
          subject_name:         subj?.name ?? sName,
          title:                action.title ?? 'Study Session',
          scheduled_date:       action.date ?? format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          scheduled_start_time: action.start_time ?? null,
          duration_minutes:     action.duration_minutes ?? 60,
          status: 'pending', priority: 2, order_index: 99,
        })
        return true
      }

      // ── Add MANY tasks with smart distribution ────────────────────────────
      case 'add_tasks': {
        const planId = await getActivePlanId(userId)
        if (!planId) return false

        const count    = Math.max(1, action.count ?? 1)
        const perDay   = Math.max(1, action.tasks_per_day ?? 2)
        const sName    = action.subject_name ?? 'Study'
        const prefix   = action.title_prefix ?? sName
        const durMin   = action.duration_minutes ?? 60
        const startDt  = action.start_date
          ? parseISO(action.start_date)
          : addDays(new Date(), 1)

        const subj = await matchSubject(userId, sName)

        // Build existing load map from startDate onwards
        const { data: existing } = await supabase.from('plan_tasks')
          .select('scheduled_date')
          .eq('user_id', userId)
          .gte('scheduled_date', format(startDt, 'yyyy-MM-dd'))
          .neq('status', 'completed')

        const loadMap = new Map<string, number>()
        for (const t of (existing ?? [])) {
          const d = t.scheduled_date as string
          loadMap.set(d, (loadMap.get(d) ?? 0) + 1)
        }

        // Distribute tasks: advance day when it reaches perDay limit
        const rows: PlanTaskInsert[] = []
        let cur = startDt
        for (let i = 1; i <= count; i++) {
          while ((loadMap.get(format(cur, 'yyyy-MM-dd')) ?? 0) >= perDay) {
            cur = addDays(cur, 1)
          }
          const dateStr = format(cur, 'yyyy-MM-dd')
          rows.push({
            plan_id:          planId,
            user_id:          userId,
            subject_id:       subj?.id ?? null,
            subject_name:     subj?.name ?? sName,
            title:            `${prefix} ${i}`,
            scheduled_date:   dateStr,
            duration_minutes: durMin,
            status:           'pending',
            priority:         2,
            order_index:      99,
          })
          loadMap.set(dateStr, (loadMap.get(dateStr) ?? 0) + 1)
        }

        await supabase.from('plan_tasks').insert(rows)
        return true
      }

      // ── Reschedule ────────────────────────────────────────────────────────
      case 'reschedule_task': {
        if (!action.task_id || !action.new_date) return false
        const upd: Record<string, unknown> = { scheduled_date: action.new_date }
        if (action.new_start_time) upd.scheduled_start_time = action.new_start_time
        await supabase.from('plan_tasks').update(upd)
          .eq('id', action.task_id).eq('user_id', userId)
        return true
      }

      // ── Update ────────────────────────────────────────────────────────────
      case 'update_task': {
        if (!action.task_id) return false
        const upd: Record<string, unknown> = {}
        if (action.title)            upd.title = action.title
        if (action.duration_minutes) upd.duration_minutes = action.duration_minutes
        if (action.start_time)       upd.scheduled_start_time = action.start_time
        if (!Object.keys(upd).length) return false
        await supabase.from('plan_tasks').update(upd)
          .eq('id', action.task_id).eq('user_id', userId)
        return true
      }

      // ── Delete ────────────────────────────────────────────────────────────
      case 'delete_task': {
        if (!action.task_id) return false
        await supabase.from('plan_tasks').delete()
          .eq('id', action.task_id).eq('user_id', userId)
        return true
      }

      // ── Split one task into multiple parts ────────────────────────────────
      case 'split_task': {
        if (!action.task_id || !action.parts?.length) return false
        const { data: orig } = await supabase.from('plan_tasks').select('*')
          .eq('id', action.task_id).eq('user_id', userId).maybeSingle()
        if (!orig) return false

        await supabase.from('plan_tasks').delete().eq('id', orig.id)

        let h = orig.scheduled_start_time
          ? parseInt((orig.scheduled_start_time as string).split(':')[0]) : 9
        let m = orig.scheduled_start_time
          ? parseInt((orig.scheduled_start_time as string).split(':')[1]) : 0

        for (let i = 0; i < action.parts.length; i++) {
          await supabase.from('plan_tasks').insert({
            plan_id:              orig.plan_id,
            user_id:              userId,
            subject_id:           orig.subject_id,
            subject_name:         orig.subject_name,
            title:                action.parts[i].title,
            scheduled_date:       orig.scheduled_date,
            scheduled_start_time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            duration_minutes:     action.parts[i].duration_minutes,
            status:               'pending',
            priority:             orig.priority,
            order_index:          (orig.order_index as number) + i,
          })
          m += action.parts[i].duration_minutes + 10
          h += Math.floor(m / 60); m = m % 60
        }
        return true
      }

      // ── Complete ──────────────────────────────────────────────────────────
      case 'complete_task': {
        if (!action.task_id) return false
        await supabase.from('plan_tasks').update({
          status: 'completed', completed_at: new Date().toISOString(),
        }).eq('id', action.task_id).eq('user_id', userId)
        return true
      }

      default: return false
    }
  } catch (e) {
    console.warn('[aiChatEngine] execAction failed:', action.type, e)
    return false
  }
}

// ─── Detect Arabic text ───────────────────────────────────────────────────────

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

// ─── Fallback mock (no AI key) ────────────────────────────────────────────────

function mockChatResponse(message: string, context: string): ChatResult {
  const ar  = isArabic(message)
  const low = message.toLowerCase()

  // Bulk sessions pattern: "عندي 16 سيشن" / "I have 16 sessions"
  if (/عندي|عندى|لدي|لدى|(\d+)\s*(سيشن|session|lo|لو|درس|حصة)/.test(low)) {
    return {
      reply: ar
        ? 'ممتاز! 🎯 عشان أضيفهم للخطة، قولي:\n• اسم المادة\n• كام سيشن بالظبط\n• مدة كل سيشن (دقيقة)\n• كام سيشن في اليوم\n\nمثال: "عندي 16 سيشن ميكانيكا كل سيشن ساعة، سيشنين في اليوم"'
        : 'Great! 🎯 To bulk-add them to your plan, tell me:\n• Subject name\n• Exact count\n• Duration per session (minutes)\n• How many per day\n\nExample: "I have 16 Mechanics sessions, 60 min each, 2 per day"',
      actionsExecuted: 0,
    }
  }

  if (/add|أضف|زود|اضف|ضيف|اضيف/.test(low)) {
    return {
      reply: ar
        ? 'عشان أضيف درس، قولي:\n• الموضوع\n• اسم الدرس\n• التاريخ\n• المدة\n\nمثال: "أضيف جلسة رياضيات بكرا ساعة"'
        : 'To add a task tell me:\n• Subject\n• Title\n• Date\n• Duration\n\nExample: "Add a math session tomorrow 60 min"',
      actionsExecuted: 0,
    }
  }

  if (/reschedule|نقل|حول|غير موعد|move|shift/.test(low)) {
    return {
      reply: ar
        ? 'قولي: إيه اللي هتنقله وإمتى.\nمثال: "نقل درس الرياضيات النهارده لبكرا الساعة 10"'
        : 'Tell me which task and when.\nExample: "Move today\'s math to tomorrow at 10am"',
      actionsExecuted: 0,
    }
  }

  if (/split|اقسم|قسّم|قسم/.test(low)) {
    return {
      reply: ar
        ? 'قولي: إيه اللي هتقسمه، كام جزء، واسم كل جزء.\nمثال: "اقسم درس الفيزياء لـ 3: مقدمة 30 دقيقة، تمارين 45، مراجعة 15"'
        : 'Tell me: which task, how many parts, name of each.\nExample: "Split physics into 3: intro 30min, practice 45, review 15"',
      actionsExecuted: 0,
    }
  }

  const sample = context
    ? context.split('\n').slice(0, 5).map(l => l.substring(0, 90)).join('\n')
    : ''

  return {
    reply: ar
      ? `أنا هنا أساعدك 💪\n\nاقدر:\n• أضيف سيشن واحدة أو كتير مرة واحدة\n• أنقل مواعيد\n• أقسم LO لأجزاء\n• أحذف أو أعدّل تاسكات\n\nبس قولي انت عايز إيه!${sample ? `\n\nتاسكاتك الجاية:\n${sample}` : ''}`
      : `I'm here to help 💪\n\nI can:\n• Add one or many sessions at once\n• Reschedule tasks\n• Split LOs into parts\n• Delete or update tasks\n\nJust tell me what you need!${sample ? `\n\nUpcoming tasks:\n${sample}` : ''}`,
    actionsExecuted: 0,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function processChatMessage(
  userId:  string,
  message: string,
  history: Pick<ChatMessage, 'role' | 'content'>[],
): Promise<ChatResult> {
  const today = format(new Date(), 'yyyy-MM-dd')

  // ── Fetch ALL context in parallel ────────────────────────────────────────────
  const [
    { data: detailedTasks },
    { data: subjects },
    { data: goal },
    { data: allFutureTasks },
    { data: completedCount },
  ] = await Promise.all([
    // Next 14 days with full detail (for AI to reference by ID)
    supabase.from('plan_tasks')
      .select('id, subject_name, title, scheduled_date, scheduled_start_time, duration_minutes, status')
      .eq('user_id', userId)
      .gte('scheduled_date', today)
      .lte('scheduled_date', format(addDays(new Date(), 14), 'yyyy-MM-dd'))
      .neq('status', 'completed')
      .order('scheduled_date').order('order_index')
      .limit(60),
    // All active subjects
    supabase.from('subjects')
      .select('name').eq('user_id', userId).eq('is_active', true),
    // Active goal
    supabase.from('user_goals')
      .select('title, target_date')
      .eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    // All future tasks (dates only, for load map)
    supabase.from('plan_tasks')
      .select('scheduled_date, subject_name')
      .eq('user_id', userId)
      .gte('scheduled_date', today)
      .neq('status', 'completed'),
    // Completed tasks count
    supabase.from('plan_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed'),
  ])

  // ── Build context strings ─────────────────────────────────────────────────

  // Goal / exam info
  const examDate  = goal?.target_date ?? null
  const daysLeft  = examDate
    ? differenceInCalendarDays(parseISO(examDate), new Date())
    : null
  const goalLine  = goal
    ? `${goal.title} | Exam: ${examDate} | ${daysLeft} days remaining`
    : 'No active goal'

  // Subjects list
  const subjList = (subjects ?? []).map(s => s.name).join(', ') || 'none yet'

  // Subject task counts (total remaining)
  const subjTaskMap = new Map<string, number>()
  for (const t of (allFutureTasks ?? [])) {
    const s = (t.subject_name as string) ?? 'Other'
    subjTaskMap.set(s, (subjTaskMap.get(s) ?? 0) + 1)
  }
  const subjTaskSummary = Array.from(subjTaskMap.entries())
    .map(([s, n]) => `${s}: ${n}`)
    .join(' | ') || 'none'

  // Daily load map — compact (only days that have tasks, next 60 days)
  const loadMap = new Map<string, number>()
  for (const t of (allFutureTasks ?? [])) {
    const d = t.scheduled_date as string
    loadMap.set(d, (loadMap.get(d) ?? 0) + 1)
  }
  const loadLines = Array.from(loadMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 45)
    .map(([d, n]) => `${d}:${n}`)
    .join('  ')

  // Total stats
  const totalFuture    = allFutureTasks?.length ?? 0
  const totalCompleted = (completedCount as unknown as { count: number })?.count ?? 0

  // Upcoming task list (with IDs — AI uses these)
  const taskLines = (detailedTasks ?? []).map(t =>
    `[${t.id}] ${t.scheduled_date} ${t.scheduled_start_time ?? '--:--'} | ${t.subject_name ?? ''} — ${t.title} (${t.duration_minutes}min)`,
  ).join('\n')

  // ── System prompt ─────────────────────────────────────────────────────────
  const systemPrompt = `You are a smart AI study planner inside Zaker, a student productivity app.
Always respond in the SAME language the student uses (Arabic or English). Be concise, warm, and helpful.

═══ STUDENT CONTEXT ═══
Today: ${today}
Goal: ${goalLine}
Subjects: ${subjList}
Tasks by subject (remaining): ${subjTaskSummary}
Total remaining: ${totalFuture} | Completed: ${totalCompleted}
Daily load (date:count for days with tasks): ${loadLines || 'plan is empty'}

═══ UPCOMING TASKS — next 14 days (reference by ID only) ═══
${taskLines || '(no tasks yet)'}

═══ RESPONSE FORMAT ═══
Respond ONLY with valid compact JSON — no markdown fences, no extra text:
{"reply":"<message to student>","actions":[...]}

═══ AVAILABLE ACTIONS ═══

1. ADD ONE TASK
{"type":"add_task","subject_name":"Math","title":"LO 2 Lesson 1","date":"yyyy-MM-dd","duration_minutes":60,"start_time":"09:00"}

2. BULK ADD — use when student mentions multiple sessions / "عندي X سيشن"
{"type":"add_tasks","subject_name":"Mechanics","title_prefix":"Mechanics Session","count":16,"duration_minutes":60,"tasks_per_day":2,"start_date":"${format(addDays(new Date(), 1), 'yyyy-MM-dd')}"}
→ Distributes count tasks across days starting from start_date, max tasks_per_day per day.
→ If student says "16 سيشن بالحل" (with solutions): generate TWO add_tasks actions — one for sessions, one for solutions, same count.
→ Suggest tasks_per_day = ceil(count / daysLeft) but min 1, max 3.

3. RESCHEDULE
{"type":"reschedule_task","task_id":"ID","new_date":"yyyy-MM-dd","new_start_time":"10:00"}

4. UPDATE
{"type":"update_task","task_id":"ID","title":"New title","duration_minutes":90,"start_time":"11:00"}

5. DELETE
{"type":"delete_task","task_id":"ID"}

6. SPLIT ONE TASK INTO PARTS
{"type":"split_task","task_id":"ID","parts":[{"title":"Part 1","duration_minutes":30},{"title":"Part 2","duration_minutes":30}]}

7. COMPLETE
{"type":"complete_task","task_id":"ID"}

═══ RULES ═══
- For bulk: ALWAYS use add_tasks (not repeated add_task). Calculate tasks_per_day from daysLeft (${daysLeft ?? 60} days).
- Never invent task IDs — only use IDs shown above.
- For "with solutions / بالحل": two add_tasks actions (sessions + solutions).
- If unclear, ask ONE clarifying question.
- If plan is empty and student asks "what do I have today", say nothing is scheduled yet.
- Keep reply friendly, max 3 sentences.`

  let raw: string
  try {
    raw = await generateAIResponse(
      [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: message },
      ],
      { maxTokens: 900 },
    )
  } catch {
    return mockChatResponse(message, taskLines)
  }

  // ── Parse JSON response ───────────────────────────────────────────────────
  try {
    // Strip possible markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const match   = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed  = JSON.parse(match[0])
      const actions: ChatAction[] = Array.isArray(parsed.actions) ? parsed.actions : []
      let executed = 0
      for (const act of actions) {
        if (await execAction(userId, act)) executed++
      }
      return { reply: String(parsed.reply ?? raw), actionsExecuted: executed }
    }
  } catch {
    // fall through
  }

  return mockChatResponse(message, taskLines)
}
