import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Timer, Watch, Play, Pause, Square, RotateCcw, BookOpen, Pencil,
  TrendingUp, BarChart2, ChevronDown, ChevronUp, Plus, X,
} from 'lucide-react'
import { usePractice } from '../hooks/usePractice'
import { useURTSubjects } from '../hooks/useURTSubjects'
import { Card } from '../components/ui/Card'
import type { PracticeMode, PracticeSession } from '../types'

// ─── Color Swatches ────────────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444',
  '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#6366f1',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface PassageScore { correct: string; total: string }

// ─── Passages Modal (new + edit) ──────────────────────────────────────────────

interface PassagesModalProps {
  title?: string
  initialGrades?: number[]
  onSave: (grades: number[]) => void
  onSkip?: () => void
  onCancel?: () => void
}

function PassagesModal({ title = 'Session Complete!', initialGrades, onSave, onSkip, onCancel }: PassagesModalProps) {
  const initial: PassageScore[] = initialGrades && initialGrades.length > 0
    ? initialGrades.map(g => ({ correct: String(g), total: '100' }))
    : [{ correct: '', total: '' }]

  const [count, setCount] = useState(initial.length)
  const [scores, setScores] = useState<PassageScore[]>(initial)

  function changeCount(delta: number) {
    const next = Math.max(1, Math.min(20, count + delta))
    setCount(next)
    setScores(prev => {
      const arr = [...prev]
      while (arr.length < next) arr.push({ correct: '', total: '' })
      return arr.slice(0, next)
    })
  }

  function setField(i: number, field: 'correct' | 'total', val: string) {
    setScores(prev => { const arr = [...prev]; arr[i] = { ...arr[i], [field]: val }; return arr })
  }

  const percentages = scores.map(({ correct, total }) => {
    const c = parseInt(correct, 10)
    const t = parseInt(total, 10)
    if (isNaN(c) || isNaN(t) || t <= 0) return null
    return Math.min(100, Math.round((c / t) * 100))
  })

  const filled = percentages.filter((g): g is number => g !== null)
  const avg = filled.length > 0 ? Math.round(filled.reduce((s, g) => s + g, 0) / filled.length) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Enter passage scores (correct / total)</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Passage count */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Number of passages</label>
            <div className="flex items-center gap-4">
              <button onClick={() => changeCount(-1)} className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">−</button>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 w-8 text-center">{count}</span>
              <button onClick={() => changeCount(1)} className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">+</button>
            </div>
          </div>

          {/* Score inputs */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Score per passage</label>
              <span className="text-xs text-zinc-400">(correct / total)</span>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {scores.map((s, i) => {
                const pct = percentages[i]
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-16 shrink-0">Passage {i + 1}</span>
                    <input type="number" min={0} value={s.correct} onChange={e => setField(i, 'correct', e.target.value)} placeholder="correct" className="w-20 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <span className="text-zinc-400 font-medium">/</span>
                    <input type="number" min={1} value={s.total} onChange={e => setField(i, 'total', e.target.value)} placeholder="total" className="w-20 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    {pct !== null && (
                      <span className={['text-xs font-semibold w-10 text-right shrink-0', pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 60 ? 'text-amber-500' : 'text-red-500'].join(' ')}>
                        {pct}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Average */}
          {avg !== null && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-100 dark:border-primary-900">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">Average Score</span>
              <span className={['text-2xl font-bold', avg >= 80 ? 'text-emerald-600 dark:text-emerald-400' : avg >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'].join(' ')}>
                {avg}%
              </span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {onCancel && (
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
          )}
          {onSkip && (
            <button onClick={onSkip} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              Skip
            </button>
          )}
          <button onClick={() => onSave(filled)} className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Session Modal ────────────────────────────────────────────────────────

function EditSessionModal({ session, getPassages, onUpdate, onClose }: {
  session: PracticeSession
  getPassages: (id: string) => Promise<number[]>
  onUpdate: (id: string, grades: number[]) => Promise<void>
  onClose: () => void
}) {
  const [grades, setGrades] = useState<number[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPassages(session.id).then(setGrades)
  }, [session.id, getPassages])

  async function handleSave(newGrades: number[]) {
    setSaving(true)
    await onUpdate(session.id, newGrades)
    setSaving(false)
    onClose()
  }

  if (grades === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <PassagesModal
      title={`Edit — ${session.subject ?? 'URT'} session`}
      initialGrades={grades}
      onSave={saving ? () => {} : handleSave}
      onCancel={onClose}
    />
  )
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ session, subjectColor, onEdit }: {
  session: PracticeSession
  subjectColor: (name: string | null) => string
  onEdit: () => void
}) {
  const date = new Date(session.created_at)
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const color = subjectColor(session.subject)

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{session.mode === 'stopwatch' ? '⏱️' : '⏳'}</span>
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            {session.mode === 'stopwatch' ? 'Stopwatch' : 'Timer'} · {fmt(session.actual_seconds)}
            {session.subject && (
              <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: color + '22', color }}>
                {session.subject}
              </span>
            )}
          </p>
          <p className="text-xs text-zinc-400">{dateStr} at {timeStr}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          {session.passage_count > 0 ? (
            <>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {session.passage_count} passage{session.passage_count !== 1 ? 's' : ''}
              </p>
              {session.average_grade !== null && (
                <p className={['text-xs font-medium', session.average_grade >= 80 ? 'text-emerald-600 dark:text-emerald-400' : session.average_grade >= 60 ? 'text-amber-500' : 'text-red-500'].join(' ')}>
                  avg {session.average_grade}%
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-zinc-400">No passages</p>
          )}
        </div>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          title="Edit session"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── URT Analytics Section ─────────────────────────────────────────────────────

function UrtAnalytics({ sessions, subjectColor }: {
  sessions: PracticeSession[]
  subjectColor: (name: string | null) => string
}) {
  const [expanded, setExpanded] = useState(false)

  // Derive unique subjects from session data (preserves historical subjects even if removed)
  const sessionSubjectNames = [...new Set(
    sessions.map(s => s.subject).filter((s): s is string => s !== null && s !== '')
  )]

  const subjectStats = sessionSubjectNames.map(name => {
    const color = subjectColor(name)
    const gradedSessions = sessions.filter(s => s.subject === name && s.average_grade !== null)
    const allSessions = sessions.filter(s => s.subject === name)
    const grades = gradedSessions.map(s => s.average_grade as number)
    const avg = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null

    let trend: 'up' | 'down' | 'flat' = 'flat'
    if (grades.length >= 2) {
      const half = Math.ceil(grades.length / 2)
      const recent = grades.slice(-half)
      const older = grades.slice(0, -half)
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
      if (recentAvg > olderAvg + 2) trend = 'up'
      else if (recentAvg < olderAvg - 2) trend = 'down'
    }

    return { name, color, avg, trend, sessionCount: allSessions.length, gradedCount: gradedSessions.length }
  })

  if (subjectStats.length === 0) return null

  // Last 10 graded sessions for trend chart
  const last10 = sessions.filter(s => s.average_grade !== null).slice(0, 10).reverse()

  return (
    <Card padding="lg">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-primary-500" />
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">URT Analytics</h2>
          <span className="text-xs text-zinc-400">({sessions.length} session{sessions.length !== 1 ? 's' : ''})</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>

      {expanded && (
        <div className="mt-5 space-y-5">
          {/* Per-subject performance cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {subjectStats.map(subj => (
              <div
                key={subj.name}
                className="rounded-xl p-3 border-2"
                style={{ borderColor: subj.color + '44', backgroundColor: subj.color + '11' }}
              >
                <p className="text-xs font-bold mb-1 truncate" style={{ color: subj.color }}>{subj.name}</p>
                <p className={['text-xl font-bold', subj.avg !== null && subj.avg >= 80 ? 'text-emerald-600' : subj.avg !== null && subj.avg >= 60 ? 'text-amber-500' : 'text-red-500'].join(' ')}>
                  {subj.avg !== null ? `${subj.avg}%` : '—'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-zinc-400">{subj.sessionCount} sessions</span>
                  {subj.trend === 'up' && <TrendingUp size={11} className="text-emerald-500" />}
                  {subj.trend === 'down' && <TrendingUp size={11} className="text-red-500 rotate-180" />}
                </div>
              </div>
            ))}
          </div>

          {/* Average grade bars per subject */}
          {subjectStats.filter(s => s.avg !== null).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                Average Grade by Subject
              </p>
              <div className="space-y-3">
                {subjectStats.filter(s => s.avg !== null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)).map(s => (
                  <div key={s.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{s.name}</span>
                      <span className={['text-sm font-bold', (s.avg ?? 0) >= 80 ? 'text-emerald-600' : (s.avg ?? 0) >= 60 ? 'text-amber-500' : 'text-red-500'].join(' ')}>
                        {s.avg}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.avg}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade trend — last 10 graded sessions */}
          {last10.length >= 2 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                Grade Trend (last {last10.length} graded sessions)
              </p>
              <div className="flex items-end gap-1 h-20">
                {last10.map((s, i) => {
                  const pct = s.average_grade ?? 0
                  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
                  const label = s.subject?.substring(0, 3) ?? `#${i + 1}`
                  return (
                    <div key={s.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full rounded-t-sm transition-all duration-300 cursor-default"
                        style={{ height: `${pct}%`, backgroundColor: color, minHeight: 4 }}
                        title={`${s.subject ?? 'URT'}: ${pct}%`}
                      />
                      <span className="text-[10px] text-zinc-400 truncate w-full text-center">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PageState = 'setup' | 'active' | 'done'

const DURATIONS = [
  { label: '30 min', seconds: 30 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
]

export function PracticeTrackerPage() {
  const { sessions, loading, saveSession, updateSession, getPassages } = usePractice()
  const { subjects, loading: subjectsLoading, addSubject, removeSubject, seedDefaults, subjectColor } = useURTSubjects()

  // Setup state
  const [mode, setMode] = useState<PracticeMode>('stopwatch')
  const [targetSeconds, setTargetSeconds] = useState(30 * 60)
  const [subject, setSubject] = useState<string | null>(null)

  // Auto-select first subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !subject) {
      setSubject(subjects[0].name)
    }
  }, [subjects, subject])

  // Add subject UI state
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectColor, setNewSubjectColor] = useState(COLOR_SWATCHES[0])

  // Active timer state
  const [pageState, setPageState] = useState<PageState>('setup')
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [finalElapsed, setFinalElapsed] = useState(0)

  // Edit state
  const [editingSession, setEditingSession] = useState<PracticeSession | null>(null)

  const startedAtRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number | null>(null)
  const totalPausedRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(() => {
    if (!startedAtRef.current) return
    const raw = (Date.now() - startedAtRef.current - totalPausedRef.current) / 1000
    const secs = Math.floor(Math.max(0, raw))
    setElapsed(secs)
    if (mode === 'timer' && secs >= targetSeconds) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setFinalElapsed(targetSeconds)
      setPageState('done')
      setShowModal(true)
    }
  }, [mode, targetSeconds])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function handleStart() {
    startedAtRef.current = Date.now()
    totalPausedRef.current = 0
    pausedAtRef.current = null
    setElapsed(0)
    setPaused(false)
    setPageState('active')
    intervalRef.current = setInterval(tick, 500)
  }

  function handlePause() {
    if (paused) {
      const pauseDuration = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0
      totalPausedRef.current += pauseDuration
      pausedAtRef.current = null
      setPaused(false)
      intervalRef.current = setInterval(tick, 500)
    } else {
      pausedAtRef.current = Date.now()
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPaused(true)
    }
  }

  function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const current = paused && pausedAtRef.current
      ? Math.floor((pausedAtRef.current - (startedAtRef.current ?? 0) - totalPausedRef.current) / 1000)
      : elapsed
    setFinalElapsed(Math.max(1, current))
    setPageState('done')
    setShowModal(true)
  }

  function handleReset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setElapsed(0)
    setPaused(false)
    setPageState('setup')
    setShowModal(false)
  }

  async function handleSavePassages(grades: number[]) {
    await saveSession({ mode, subject: subject ?? null, targetSeconds, actualSeconds: finalElapsed, grades })
    setShowModal(false)
    setPageState('setup')
  }

  async function handleSkipPassages() {
    await saveSession({ mode, subject: subject ?? null, targetSeconds, actualSeconds: finalElapsed, grades: [] })
    setShowModal(false)
    setPageState('setup')
  }

  async function handleAddSubject() {
    const trimmed = newSubjectName.trim()
    if (!trimmed) return
    const added = await addSubject(trimmed, newSubjectColor)
    if (added) {
      setSubject(added.name)
      setNewSubjectName('')
      setNewSubjectColor(COLOR_SWATCHES[0])
      setShowAddSubject(false)
    }
  }

  const displaySeconds = mode === 'timer' ? Math.max(0, targetSeconds - elapsed) : elapsed
  const progress = mode === 'timer' ? elapsed / targetSeconds : Math.min(1, elapsed / targetSeconds)
  const circumference = 2 * Math.PI * 80
  const dashOffset = circumference * (1 - Math.min(1, progress))
  const activeColor = subjectColor(subject)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">URT Tracker</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Track your URT practice sessions, passages, and grades
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Timer Card */}
        <Card padding="lg">
          {pageState === 'setup' ? (
            <div className="space-y-5">
              {/* Subject selector */}
              <div>
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Subject</p>

                {subjectsLoading ? (
                  <div className="h-9 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                ) : subjects.length === 0 ? (
                  <div className="text-center py-5 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">
                    <p className="text-sm text-zinc-400 mb-2">No subjects yet</p>
                    <button
                      onClick={seedDefaults}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    >
                      Load defaults (Math, Physics, English…)
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(s => (
                      <div key={s.id} className="relative group">
                        <button
                          onClick={() => setSubject(s.name)}
                          className={[
                            'px-3 py-1.5 pr-6 rounded-lg border-2 text-sm font-semibold transition-all',
                            subject === s.name
                              ? 'text-white shadow-sm'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300',
                          ].join(' ')}
                          style={subject === s.name ? { borderColor: s.color, backgroundColor: s.color } : {}}
                        >
                          {s.name}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeSubject(s.id) }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-600 hover:bg-red-400 hover:text-white text-zinc-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove subject"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ))}

                    {/* Add subject */}
                    {showAddSubject ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Name"
                          value={newSubjectName}
                          onChange={e => setNewSubjectName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddSubject(); if (e.key === 'Escape') setShowAddSubject(false) }}
                          className="text-sm bg-transparent outline-none text-zinc-800 dark:text-zinc-200 w-24"
                        />
                        <div className="flex gap-1 flex-wrap">
                          {COLOR_SWATCHES.map(c => (
                            <button
                              key={c}
                              onClick={() => setNewSubjectColor(c)}
                              className="w-4 h-4 rounded-full transition-all shrink-0"
                              style={{
                                backgroundColor: c,
                                outline: newSubjectColor === c ? `2px solid ${c}` : '2px solid transparent',
                                outlineOffset: '2px',
                              }}
                            />
                          ))}
                        </div>
                        <button onClick={handleAddSubject} className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline whitespace-nowrap">Add</button>
                        <button onClick={() => setShowAddSubject(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddSubject(true)}
                        className="px-3 py-1.5 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 text-sm text-zinc-400 hover:border-primary-400 hover:text-primary-500 dark:hover:border-primary-600 dark:hover:text-primary-400 transition-all flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Mode selector */}
              <div>
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Mode</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['stopwatch', 'timer'] as PracticeMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={['flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all', mode === m ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'].join(' ')}
                    >
                      {m === 'stopwatch' ? <Watch size={24} /> : <Timer size={24} />}
                      <span className="text-sm font-semibold capitalize">{m}</span>
                      <span className="text-xs opacity-70">{m === 'stopwatch' ? 'Count up' : 'Count down'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration selector */}
              <div>
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Duration</p>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d.seconds}
                      onClick={() => setTargetSeconds(d.seconds)}
                      className={['py-2.5 rounded-xl border-2 text-sm font-semibold transition-all', targetSeconds === d.seconds ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'].join(' ')}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={subjects.length > 0 && !subject}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: activeColor }}
              >
                <Play size={18} fill="currentColor" />
                Start Practice{subject ? ` — ${subject}` : ''}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Subject badge */}
              {subject && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: activeColor + '22', color: activeColor }}>
                  {subject}
                </span>
              )}

              {/* Circular timer */}
              <div className="relative w-52 h-52">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="10" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke={paused ? '#a1a1aa' : activeColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{fmt(displaySeconds)}</span>
                  <span className="text-xs text-zinc-400 mt-1">{mode === 'timer' ? 'remaining' : 'elapsed'}</span>
                  {paused && <span className="text-xs text-amber-500 font-medium mt-1">Paused</span>}
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <button onClick={handlePause} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={handleStop} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors">
                  <Square size={16} fill="currentColor" />
                  Finish
                </button>
              </div>

              <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                <RotateCcw size={13} />
                Cancel & Reset
              </button>
            </div>
          )}
        </Card>

        {/* History Card */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Practice History</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-sm text-zinc-400">No practice sessions yet.</p>
              <p className="text-xs text-zinc-400 mt-1">Complete your first session above!</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[420px] overflow-y-auto">
              {sessions.map(s => (
                <HistoryRow key={s.id} session={s} subjectColor={subjectColor} onEdit={() => setEditingSession(s)} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Analytics Section */}
      {sessions.length > 0 && <UrtAnalytics sessions={sessions} subjectColor={subjectColor} />}

      {/* Passages Modal (new session) */}
      {showModal && (
        <PassagesModal
          title={`Session Complete${subject ? ` — ${subject}` : ''}`}
          onSave={handleSavePassages}
          onSkip={handleSkipPassages}
        />
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          getPassages={getPassages}
          onUpdate={updateSession}
          onClose={() => setEditingSession(null)}
        />
      )}
    </div>
  )
}
