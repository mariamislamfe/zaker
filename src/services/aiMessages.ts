// ─── AI Message Engine ────────────────────────────────────────────────────────
// Generates daily · weekly · monthly AI insights as conversational messages.
// Each message is cached in localStorage per period to avoid repeated API calls.

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

// ─── Cache helpers ────────────────────────────────────────────────────────────

export function msgCacheKey(type: AIMessage['type'], userId: string): string {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (type === 'daily')   return `zaker_msg_daily_${userId}_${today}`
  if (type === 'weekly')  return `zaker_msg_weekly_${userId}_${format(startOfWeek(new Date(), { weekStartsOn: 6 }), 'yyyy-MM-dd')}`
  return                         `zaker_msg_monthly_${userId}_${format(startOfMonth(new Date()), 'yyyy-MM')}`
}

// ─── Daily Message ────────────────────────────────────────────────────────────

export async function getDailyMessage(userId: string): Promise<AIMessage> {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const [todayRes, yestRes] = await Promise.all([
    supabase.from('plan_tasks')
      .select('title, subject_name, duration_minutes, status')
      .eq('user_id', userId).eq('scheduled_date', today),
    supabase.from('plan_tasks')
      .select('status')
      .eq('user_id', userId).eq('scheduled_date', yesterday),
  ])

  const todayTasks   = todayRes.data ?? []
  const yestTasks    = yestRes.data  ?? []
  const yestRate     = yestTasks.length === 0 ? null
    : Math.round(yestTasks.filter(t => t.status === 'completed').length / yestTasks.length * 100)
  const pendingToday = todayTasks.filter(t => t.status !== 'completed')

  if (todayTasks.length === 0) {
    return {
      type: 'daily', icon: '🌅',
      content: 'مفيش تاسكات مجدولة النهارده. خد راحة أو راجع حاجة قديمة. 😌',
      generatedAt: new Date().toISOString(),
    }
  }

  let content = ''
  try {
    content = await generateAIResponse([
      {
        role: 'system',
        content: `You are Zaker AI — a daily study coach for Arab university students.
YOUR ROLE: Generate a short motivating daily message based on today's tasks and yesterday's results.
Return ONLY plain Arabic text. 2-3 sentences. Warm and direct. No JSON. No markdown.`,
      },
      {
        role: 'user',
        content: `Today: ${pendingToday.length} pending tasks out of ${todayTasks.length}
Subjects today: ${[...new Set(pendingToday.map(t => t.subject_name as string))].join(', ') || '—'}
${yestRate !== null ? `Yesterday completion: ${yestRate}%` : 'No yesterday data'}

Write 2-3 sentences: what to focus on today + a motivating note based on yesterday's result.`,
      },
    ], { maxTokens: 150, temperature: 0.7 })
  } catch {
    content = pendingToday.length === 0
      ? 'أنهيت كل تاسكاتك النهارده! ممتاز، خد راحة مستحقة. 🎉'
      : `عندك ${pendingToday.length} تاسكات النهارده. ابدأ بأصعبهم وانت طاقتك عالية، وخليها تعدي بسلام. 💪`
  }

  return { type: 'daily', icon: '🌅', content, generatedAt: new Date().toISOString() }
}

// ─── Weekly Message ───────────────────────────────────────────────────────────

export async function getWeeklyMessage(userId: string): Promise<AIMessage> {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 6 }), 'yyyy-MM-dd')
  const today     = format(new Date(), 'yyyy-MM-dd')

  const { data: weekTasks } = await supabase.from('plan_tasks')
    .select('status, subject_name, duration_minutes')
    .eq('user_id', userId)
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', today)

  const tasks  = weekTasks ?? []
  const total  = tasks.length
  const done   = tasks.filter(t => t.status === 'completed').length
  const rate   = total === 0 ? 0 : Math.round(done / total * 100)
  const mins   = tasks.filter(t => t.status === 'completed').reduce((s, t) => s + ((t.duration_minutes as number) ?? 0), 0)
  const hours  = Math.round(mins / 60 * 10) / 10

  const subjMap = new Map<string, { done: number; total: number }>()
  for (const t of tasks) {
    const s = (t.subject_name as string) ?? 'Other'
    if (!subjMap.has(s)) subjMap.set(s, { done: 0, total: 0 })
    subjMap.get(s)!.total++
    if (t.status === 'completed') subjMap.get(s)!.done++
  }
  const subjSummary = Array.from(subjMap.entries()).map(([n, d]) => `${n}: ${d.done}/${d.total}`).join(', ')

  if (total === 0) {
    return {
      type: 'weekly', icon: '📊',
      content: 'مفيش بيانات لهذا الأسبوع بعد. ابدأ تذاكر وهشوفلك تحليل الأسبوع.',
      generatedAt: new Date().toISOString(),
    }
  }

  let content = ''
  try {
    content = await generateAIResponse([
      {
        role: 'system',
        content: `You are Zaker AI — a weekly study performance analyst for Arab university students.
YOUR ROLE: Summarize this week's study performance and give 1 actionable advice for next week.
Return ONLY plain Arabic text. 3 sentences max. No JSON. No markdown.`,
      },
      {
        role: 'user',
        content: `This week:
Completion rate: ${rate}% (${done}/${total} tasks done)
Hours studied: ${hours}h
Subjects: ${subjSummary || 'no data'}

Write 3 Arabic sentences: performance summary + 1 specific advice for next week.`,
      },
    ], { maxTokens: 180, temperature: 0.65 })
  } catch {
    content = rate >= 70
      ? `أسبوع ممتاز! أكملت ${rate}% من تاسكاتك وذاكرت ${hours} ساعة. استمر في نفس الإيقاع الأسبوع القادم. 🔥`
      : `أكملت ${rate}% هذا الأسبوع وذاكرت ${hours} ساعة. حاول تزود تركيزك الأسبوع القادم وتبدأ التاسكات بدري.`
  }

  return { type: 'weekly', icon: '📊', content, generatedAt: new Date().toISOString() }
}

// ─── Monthly Message ──────────────────────────────────────────────────────────

export async function getMonthlyMessage(userId: string): Promise<AIMessage> {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const today      = format(new Date(), 'yyyy-MM-dd')

  const [{ data: monthTasks }, { data: goal }] = await Promise.all([
    supabase.from('plan_tasks')
      .select('status, duration_minutes')
      .eq('user_id', userId)
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', today),
    supabase.from('user_goals')
      .select('title, target_date')
      .eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const tasks = monthTasks ?? []
  const total = tasks.length
  const done  = tasks.filter(t => t.status === 'completed').length
  const rate  = total === 0 ? 0 : Math.round(done / total * 100)
  const hours = Math.round(tasks.filter(t => t.status === 'completed').reduce((s, t) => s + ((t.duration_minutes as number) ?? 0), 0) / 60 * 10) / 10

  if (total < 5) {
    return {
      type: 'monthly', icon: '📅',
      content: 'محتاج بيانات أكتر لتحليل الشهر. ذاكر وسجل تاسكاتك اليومية عشان أقدر أحللك.',
      generatedAt: new Date().toISOString(),
    }
  }

  let content = ''
  try {
    content = await generateAIResponse([
      {
        role: 'system',
        content: `You are Zaker AI — a monthly academic progress reviewer for Arab university students.
YOUR ROLE: Give a big-picture monthly review — celebrate wins, identify patterns, motivate.
Return ONLY plain Arabic text. 3-4 sentences. Inspiring and honest. No JSON. No markdown.`,
      },
      {
        role: 'user',
        content: `This month:
Tasks completion: ${rate}% (${done}/${total})
Hours studied: ${hours}h
Goal: ${goal ? `${goal.title} by ${goal.target_date}` : 'not set'}

Write 3-4 Arabic sentences: monthly review + motivation for next month.`,
      },
    ], { maxTokens: 200, temperature: 0.7 })
  } catch {
    content = rate >= 70
      ? `شهر رائع! أنجزت ${rate}% من خطتك وذاكرت ${hours} ساعة. أنت على المسار الصحيح تماماً. 🌟`
      : `هذا الشهر أكملت ${rate}% وذاكرت ${hours} ساعة. الشهر القادم ركز على الانتظام اليومي بدل الجلسات الطويلة المتفرقة.`
  }

  return { type: 'monthly', icon: '📅', content, generatedAt: new Date().toISOString() }
}
