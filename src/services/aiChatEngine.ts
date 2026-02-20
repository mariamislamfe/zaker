// ─── AI Chat Engine ───────────────────────────────────────────────────────────
// Processes natural-language chat messages (Arabic / English) and translates
// them into concrete plan actions executed against Supabase.

import { supabase }           from '../lib/supabase'
import { generateAIResponse } from './aiProvider'
import { format, addDays }    from 'date-fns'

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
  subject_name?:     string
  title?:            string
  date?:             string
  duration_minutes?: number
  start_time?:       string
  task_id?:          string
  new_date?:         string
  new_start_time?:   string
  parts?:            Array<{ title: string; duration_minutes: number }>
}

export interface ChatResult {
  reply:           string
  actionsExecuted: number
}

// ─── Execute a single action against Supabase ─────────────────────────────────

async function execAction(userId: string, action: ChatAction): Promise<boolean> {
  try {
    switch (action.type) {

      // ── Add a new task ────────────────────────────────────────────────────
      case 'add_task': {
        const { data: plan } = await supabase.from('study_plans')
          .select('id').eq('user_id', userId).eq('status', 'active')
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (!plan) return false

        const sName = action.subject_name ?? 'Study'
        const { data: subj } = await supabase.from('subjects')
          .select('id, name').eq('user_id', userId)
          .ilike('name', `%${sName}%`).limit(1).maybeSingle()

        await supabase.from('plan_tasks').insert({
          plan_id:              plan.id,
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

      // ── Reschedule (move to another day) ──────────────────────────────────
      case 'reschedule_task': {
        if (!action.task_id || !action.new_date) return false
        const upd: Record<string, unknown> = { scheduled_date: action.new_date }
        if (action.new_start_time) upd.scheduled_start_time = action.new_start_time
        await supabase.from('plan_tasks').update(upd)
          .eq('id', action.task_id).eq('user_id', userId)
        return true
      }

      // ── Update title / duration / start time ──────────────────────────────
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

      // ── Delete a task ─────────────────────────────────────────────────────
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

        // Delete the original
        await supabase.from('plan_tasks').delete().eq('id', orig.id)

        // Insert parts with sequential start times
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

      // ── Mark a task complete ──────────────────────────────────────────────
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

function mockChatResponse(message: string, taskContext: string): ChatResult {
  const ar  = isArabic(message)
  const low = message.toLowerCase()

  if (/add|أضف|زود|اضف|ضيف|اضيف/.test(low)) {
    return {
      reply: ar
        ? 'عشان أضيف درس، قولي:\n• الموضوع (مثلاً: رياضيات)\n• اسم الدرس\n• التاريخ\n• المدة\n\nمثال: "أضيف جلسة رياضيات بكرا ساعة ونص"'
        : 'To add a task, tell me:\n• Subject (e.g. Math)\n• Title\n• Date\n• Duration\n\nExample: "Add a math session tomorrow for 90 minutes"',
      actionsExecuted: 0,
    }
  }

  if (/reschedule|نقل|حول|غير موعد|move|shift/.test(low)) {
    return {
      reply: ar
        ? 'عشان أنقل درس، قولي: إيه اللي هتنقله وإمتى.\nمثال: "نقل درس الرياضيات النهارده لبكرا الساعة 10"'
        : 'To reschedule, tell me which task and when.\nExample: "Move today\'s math session to tomorrow at 10am"',
      actionsExecuted: 0,
    }
  }

  if (/split|اقسم|قسّم|قسم|جزء|lo|الأو|اللو/.test(low)) {
    return {
      reply: ar
        ? 'عشان أقسم درس / LO، قولي:\n• إيه التاسك اللي هتقسمه\n• كام جزء\n• اسم كل جزء\n\nمثال: "اقسم درس الرياضيات بكرا لـ 3 أجزاء: مقدمة، تمارين، مراجعة"'
        : 'To split a task / LO, tell me:\n• Which task to split\n• Into how many parts\n• Name of each part\n\nExample: "Split tomorrow\'s math session into 3 parts: intro, practice, review"',
      actionsExecuted: 0,
    }
  }

  if (/delete|احذف|شيل|ازل|remove/.test(low)) {
    return {
      reply: ar
        ? 'عشان أحذف تاسك، قولي: إيه اللي عايز تحذفه وإمتى.\nمثال: "احذف درس الفيزياء الأسبوع الجاي"'
        : 'To delete a task, tell me which one and when.\nExample: "Delete next week\'s physics session"',
      actionsExecuted: 0,
    }
  }

  const sample = taskContext
    ? taskContext.split('\n').slice(0, 5).map(l => l.substring(0, 80)).join('\n')
    : ''

  return {
    reply: ar
      ? `مرحباً! أنا هنا أساعدك في جدولك 💪\n\nاقدر:\n• أضيف دروس جديدة\n• أنقل مواعيد لأيام تانية\n• أقسم اللو لأجزاء\n• أحذف أو أعدّل تاسكات\n\nبس قولي انت عايز إيه بالتفاصيل!${sample ? `\n\nتاسكاتك الجاية:\n${sample}` : ''}`
      : `Hi! I'm here to help with your study schedule 💪\n\nI can:\n• Add new sessions\n• Reschedule tasks\n• Split LOs into parts\n• Delete or update tasks\n\nJust tell me what you need!${sample ? `\n\nUpcoming tasks:\n${sample}` : ''}`,
    actionsExecuted: 0,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function processChatMessage(
  userId:  string,
  message: string,
  history: Pick<ChatMessage, 'role' | 'content'>[],
): Promise<ChatResult> {
  const today   = format(new Date(), 'yyyy-MM-dd')
  const in7days = format(addDays(new Date(), 7), 'yyyy-MM-dd')

  // Fetch context in parallel
  const [{ data: tasks }, { data: subjects }] = await Promise.all([
    supabase.from('plan_tasks')
      .select('id, subject_name, title, scheduled_date, scheduled_start_time, duration_minutes, status')
      .eq('user_id', userId)
      .gte('scheduled_date', today)
      .lte('scheduled_date', in7days)
      .neq('status', 'completed')
      .order('scheduled_date').order('order_index')
      .limit(40),
    supabase.from('subjects')
      .select('name').eq('user_id', userId).eq('is_active', true),
  ])

  const taskLines = (tasks ?? []).map(t =>
    `[${t.id}] ${t.scheduled_date} ${t.scheduled_start_time ?? '--:--'} | ${t.subject_name ?? ''} — ${t.title} (${t.duration_minutes}min)`,
  ).join('\n')

  const subjList = (subjects ?? []).map(s => s.name).join(', ')

  // ── System prompt ────────────────────────────────────────────────────────────
  const systemPrompt = `You are an AI study planner assistant for Zaker, a student productivity app.
The student may write in Arabic or English — always respond in the SAME language they use.
Today's date: ${today}
Student's subjects: ${subjList || 'none yet'}

Upcoming tasks (next 7 days) — these are the ONLY tasks you can reference by ID:
${taskLines || '(no tasks planned yet)'}

CRITICAL RULE: Respond ONLY with valid compact JSON, no markdown code fences, no extra text.
Format: {"reply":"<your response>","actions":[...]}

Available action types (use exact field names):
• add_task:         {"type":"add_task","subject_name":"Math","title":"LO 2 Lesson 1","date":"yyyy-MM-dd","duration_minutes":60,"start_time":"09:00"}
• reschedule_task:  {"type":"reschedule_task","task_id":"TASK_ID","new_date":"yyyy-MM-dd","new_start_time":"10:00"}
• update_task:      {"type":"update_task","task_id":"TASK_ID","title":"New title","duration_minutes":90,"start_time":"11:00"}
• delete_task:      {"type":"delete_task","task_id":"TASK_ID"}
• split_task:       {"type":"split_task","task_id":"TASK_ID","parts":[{"title":"Part 1","duration_minutes":45},{"title":"Part 2","duration_minutes":45}]}
• complete_task:    {"type":"complete_task","task_id":"TASK_ID"}

Rules:
- Use the [TASK_ID] from the list above. Never invent IDs.
- For split_task: replaces one task with multiple parts on the SAME day. Split duration should sum to ~original.
- For no-change answers (questions only): "actions":[]
- If a task ID is not in the list, tell the student politely and ask for clarification.
- For add_task: fuzzy-match subject_name to the subjects list.
- Keep reply concise, friendly, and in the student's language.`

  let raw: string
  try {
    raw = await generateAIResponse(
      [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: message },
      ],
      { maxTokens: 700 },
    )
  } catch {
    return mockChatResponse(message, taskLines)
  }

  // Try to parse the JSON response
  try {
    const match = raw.match(/\{[\s\S]*\}/)
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
    // fall through to mock
  }

  // If the response wasn't JSON (mock key returned plain text), use mock
  return mockChatResponse(message, taskLines)
}
