// ─── Zaker AI Service ─────────────────────────────────────────────────────────
// Unified AI behavioral intelligence layer.
// USE_MOCK_AI = true  → safe demo mode, never hits real API
// USE_MOCK_AI = false → real K2-Think V2 calls with mock as fallback
//
// API key is read from VITE_AI_API_KEY in .env
// Set to 'mock' or leave empty to force mock mode.

import { generateAIResponse, isAIEnabled } from './aiProvider'
import { analyzeBehavior, calculateScores, detectWeakAreas, generateNextDayPlan } from './aiEngine'

export const USE_MOCK_AI = !isAIEnabled()

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CardType = 'positive' | 'warning' | 'risk' | 'insight'

export interface BehaviorCard {
  id:          string
  type:        CardType
  icon:        string
  title:       string
  description: string
  metric?:     string
}

export interface PredictionResult {
  examReadiness:  number   // 0-100
  completionProb: number   // 0-100
  burnoutRisk:    number   // 0-100
  status:         'green' | 'yellow' | 'red'
  summary:        string
}

export interface ScheduleSlot {
  time:            string
  subject:         string
  subjectColor:    string
  task:            string
  durationMinutes: number
  type:            'study' | 'break' | 'review'
}

// ─── 1. Behavior Analysis ─────────────────────────────────────────────────────

const MOCK_BEHAVIOR_CARDS: BehaviorCard[] = [
  { id: 'peak',         type: 'insight',  icon: '🌙', title: 'Peak performance at night',     description: 'Most sessions start after 9 PM. Try locking in 9–11 PM as your daily study window.',      metric: '9:00 PM' },
  { id: 'sessions',     type: 'warning',  icon: '⚡', title: 'Sessions shorter than planned',  description: '73% of your sessions end early — this impacts depth of understanding and curriculum coverage.', metric: '27 min avg' },
  { id: 'weak_subject', type: 'risk',     icon: '📚', title: 'Chemistry needs attention',      description: "You haven't studied Chemistry in 8 days. This is a real risk to exam readiness.",          metric: '8 days gap' },
  { id: 'strong',       type: 'positive', icon: '✅', title: 'Physics — great consistency!',   description: 'You study Physics 5 days a week. Keep up this rhythm!',                                     metric: '5 days/week' },
  { id: 'breaks',       type: 'warning',  icon: '☕', title: 'Breaks are irregular',           description: 'Your breaks are random — Pomodoro (45 study + 15 break) will significantly boost focus.'                     },
  { id: 'consistency',  type: 'insight',  icon: '📊', title: '71% consistency this week',      description: 'Studied 5 of 7 days. Goal is 7/7 — even a 20-min session counts. Daily momentum is the key.', metric: '71%' },
]

export async function analyzeBehaviorQuick(userId: string): Promise<BehaviorCard[]> {
  if (USE_MOCK_AI) return MOCK_BEHAVIOR_CARDS

  try {
    const [profile, scores, weakAreas] = await Promise.all([
      analyzeBehavior(userId, 14),
      calculateScores(userId),
      detectWeakAreas(userId),
    ])

    const cards: BehaviorCard[] = []
    const h = profile.peakHour
    const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'

    cards.push({ id: 'peak', type: 'insight', icon: h < 17 ? '☀️' : '🌙',
      title: `Your peak performance is in the ${period}`,
      description: `Most of your sessions start at ${h}:00 — organize your time around it.`,
      metric: `${h}:00` })

    cards.push({ id: 'consistency',
      type: scores.adherence >= 70 ? 'positive' : scores.adherence >= 40 ? 'warning' : 'risk',
      icon: scores.adherence >= 70 ? '✅' : '⚡',
      title: scores.adherence >= 70 ? 'Excellent consistency!' : 'Consistency needs improvement',
      description: `Study consistency is ${scores.adherence}% this week.`,
      metric: `${scores.adherence}%` })

    if (weakAreas[0]) {
      const w = weakAreas[0]
      cards.push({ id: 'weak', type: w.severity === 'high' ? 'risk' : 'warning', icon: '📚',
        title: `${w.subjectName} needs attention`,
        description: w.reason,
        metric: w.daysSinceStudied ? `${w.daysSinceStudied} days` : undefined })
    }

    cards.push({ id: 'focus',
      type: scores.focus >= 70 ? 'positive' : 'warning',
      icon: scores.focus >= 70 ? '🎯' : '💭',
      title: scores.focus >= 70 ? 'Strong focus' : 'Focus needs improvement',
      description: `${scores.focus}% of your time is actual study.`,
      metric: `${scores.focus}%` })

    if (profile.currentStreak >= 3) {
      cards.push({ id: 'streak', type: 'positive', icon: '🔥',
        title: `${profile.currentStreak} days in a row!`,
        description: 'Great momentum! Keep it up.',
        metric: `${profile.currentStreak} days` })
    }

    // Optional K2 summary card
    try {
      const aiSummary = await generateAIResponse([
        { role: 'system', content: 'You are Zaker AI. Write one sentence in English summarizing the student\'s situation. No markdown.' },
        { role: 'user', content: `Consistency ${scores.adherence}%, focus ${scores.focus}%, streak ${profile.currentStreak} days, weakest subject: ${weakAreas[0]?.subjectName ?? 'none'}` },
      ], { maxTokens: 80, temperature: 0.5 })
      if (aiSummary) cards.unshift({ id: 'ai', type: 'insight', icon: '🤖', title: 'AI Assessment', description: aiSummary })
    } catch { /* skip */ }

    return cards
  } catch {
    return MOCK_BEHAVIOR_CARDS
  }
}

// ─── 2. Predict Outcome ───────────────────────────────────────────────────────

const MOCK_PREDICTION: PredictionResult = {
  examReadiness:  58,
  completionProb: 52,
  burnoutRisk:    41,
  status: 'yellow',
  summary: 'If you keep this pace, you are likely to struggle covering the curriculum. Chemistry and Math need more focus today before it is too late!',
}

export async function predictOutcome(userId: string): Promise<PredictionResult> {
  if (USE_MOCK_AI) return MOCK_PREDICTION

  try {
    const [scores, weak] = await Promise.all([
      calculateScores(userId),
      detectWeakAreas(userId),
    ])

    const examReadiness  = Math.round(scores.adherence * 0.5 + scores.productivity * 0.3 + scores.focus * 0.2)
    const completionProb = Math.round(scores.adherence * 0.6 + scores.productivity * 0.4)
    const burnoutRisk    = Math.max(0, 100 - scores.focus - (scores.adherence > 80 ? 20 : 0))
    const status: PredictionResult['status'] =
      examReadiness >= 70 ? 'green' : examReadiness >= 45 ? 'yellow' : 'red'

    let summary = MOCK_PREDICTION.summary
    try {
      summary = await generateAIResponse([
        { role: 'system', content: 'You are Zaker AI. Write two sentences in English predicting the student\'s future if they continue at the same pace. Be honest and practical. No markdown.' },
        { role: 'user', content: `Exam readiness: ${examReadiness}%, completion probability: ${completionPct(completionProb)}, burnout risk: ${burnoutRisk}%, weak subjects: ${weak.map(w => w.subjectName).join(', ') || 'none'}` },
      ], { maxTokens: 120, temperature: 0.5 })
    } catch { /* use default */ }

    return { examReadiness, completionProb, burnoutRisk, status, summary }
  } catch {
    return MOCK_PREDICTION
  }
}

function completionPct(n: number): string { return `${n}%` }

// ─── 3. Generate Fixed Plan (recommendations only — never writes to DB) ───────

import { supabase as _supabase } from '../lib/supabase'

export async function generateFixedPlan(userId: string): Promise<ScheduleSlot[]> {
  try {
    // Always fetch real user data so subjects/colors are correct
    const [profile, weakAreas, { data: subjects }] = await Promise.all([
      analyzeBehavior(userId, 14),
      detectWeakAreas(userId),
      _supabase.from('subjects').select('id, name, color').eq('user_id', userId).eq('is_active', true),
    ])

    if (!subjects?.length) return []

    const slots: ScheduleSlot[] = []
    const peakH = profile.peakHour || 9
    let h = peakH, m = 0

    // Prioritise weak subjects first, then round-robin
    const ordered = [
      ...weakAreas.filter(w => w.subjectId).map(w => subjects.find(s => s.id === w.subjectId)).filter(Boolean),
      ...subjects,
    ].filter((s, i, arr) => arr.findIndex(x => x!.id === s!.id) === i) as typeof subjects

    for (const subj of ordered.slice(0, 4)) {
      const isWeak   = weakAreas.some(w => w.subjectId === subj.id)
      const durMins  = isWeak ? 90 : 60
      const slotType: ScheduleSlot['type'] = isWeak ? 'study' : 'review'
      const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

      slots.push({
        time:            startStr,
        subject:         subj.name,
        subjectColor:    subj.color,
        task:            isWeak ? `Study ${subj.name} — needs attention` : `Review ${subj.name}`,
        durationMinutes: durMins,
        type:            slotType,
      })

      m += durMins + 15;  h += Math.floor(m / 60);  m = m % 60

      // Insert a break every 2 sessions
      if (slots.filter(s => s.type !== 'break').length % 2 === 0 && slots.length < ordered.length * 2) {
        slots.push({
          time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          subject: 'Break', subjectColor: '#94a3b8',
          task: 'Short break — step away from the screen', durationMinutes: 15, type: 'break',
        })
        m += 15;  h += Math.floor(m / 60);  m = m % 60
      }
      if (h >= 23) break
    }

    return slots
  } catch {
    return []
  }
}

// ─── 4. Roast Me 🔥 ──────────────────────────────────────────────────────────

export async function roastUser(userId: string): Promise<string> {
  try {
    // Always fetch real scores even in mock mode so the roast is data-specific
    const [scores, weak] = await Promise.all([
      calculateScores(userId),
      detectWeakAreas(userId),
    ])

    if (!USE_MOCK_AI) {
      const roast = await generateAIResponse([
        {
          role: 'system',
          content:
            'You are Zaker AI. Write two sarcastic and funny sentences in English about the student\'s performance based on the real numbers. Very short. No markdown.',
        },
        {
          role: 'user',
          content: `Consistency: ${scores.adherence}%, productivity: ${scores.productivity}%, focus: ${scores.focus}%, weakest subject: ${weak[0]?.subjectName ?? 'none'}`,
        },
      ], { maxTokens: 100, temperature: 0.8 })
      if (roast) return roast
    }

    // Data-driven mock based on real numbers
    const w = weak[0]?.subjectName ?? 'your subjects'
    if (scores.adherence < 40)
      return `${scores.adherence}% consistency? 😅 You study one day then disappear for a week! ${w} has been waiting for you forever.`
    if (scores.focus < 50)
      return `Your focus is ${scores.focus}% — meaning half your study time you're thinking about something else! 😂 Focus already.`
    if (scores.productivity < 50)
      return `${scores.productivity}% productivity from your daily goal. ${w} can see you running in slow motion 🐢`
    return `${scores.overall ?? scores.adherence}% overall — not bad, but you know you can do better! 💪`
  } catch {
    return 'Can\'t get your data right now — but go study! 😄'
  }
}

// ─── 5. Adaptive Reaction (early stop) ───────────────────────────────────────

const ADAPTIVE_REACTIONS = [
  { threshold: 900,   msg: 'Very short session 📉 — try to push a little further, even 15 more minutes. Consistency matters more than length!', icon: '📉' },
  { threshold: 1800,  msg: 'Stopped early 🙁 — try a quick small task to feel a sense of achievement. E.g. review 5 pages!', icon: '⚡' },
  { threshold: 2700,  msg: 'Decent session but could be better 💪 — next time aim for 45 uninterrupted minutes.', icon: '💪' },
]

export function adaptiveReaction(elapsedSeconds: number): { msg: string; icon: string } | null {
  for (const r of ADAPTIVE_REACTIONS) {
    if (elapsedSeconds < r.threshold) return { msg: r.msg, icon: r.icon }
  }
  return null   // session was long enough — no alert needed
}
