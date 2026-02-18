import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Timer, Watch, Play, Pause, Square, RotateCcw, BookOpen } from 'lucide-react'
import { usePractice } from '../hooks/usePractice'
import { Card } from '../components/ui/Card'
import { formatHumanDuration } from '../utils/time'
import type { PracticeMode, PracticeSession } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Passages Modal ────────────────────────────────────────────────────────────

interface PassageScore {
  correct: string
  total: string
}

interface PassagesModalProps {
  onSave: (grades: number[]) => void
  onSkip: () => void
}

function PassagesModal({ onSave, onSkip }: PassagesModalProps) {
  const [count, setCount] = useState(1)
  const [scores, setScores] = useState<PassageScore[]>([{ correct: '', total: '' }])

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
    setScores(prev => {
      const arr = [...prev]
      arr[i] = { ...arr[i], [field]: val }
      return arr
    })
  }

  // Calculate percentage grade per passage: correct / total * 100
  const percentages = scores.map(({ correct, total }) => {
    const c = parseInt(correct, 10)
    const t = parseInt(total, 10)
    if (isNaN(c) || isNaN(t) || t <= 0) return null
    return Math.min(100, Math.round((c / t) * 100))
  })

  const filled = percentages.filter((g): g is number => g !== null)
  const avg = filled.length > 0
    ? Math.round(filled.reduce((s, g) => s + g, 0) / filled.length)
    : null

  function handleSave() {
    onSave(filled)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Session Complete!</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">How did your URT practice go?</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Passage count */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Number of passages
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => changeCount(-1)}
                className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                −
              </button>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 w-8 text-center">
                {count}
              </span>
              <button
                onClick={() => changeCount(1)}
                className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Score inputs — correct out of total */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Score per passage
              </label>
              <span className="text-xs text-zinc-400">(correct / total)</span>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {scores.map((s, i) => {
                const pct = percentages[i]
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-16 shrink-0">
                      Passage {i + 1}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={s.correct}
                      onChange={e => setField(i, 'correct', e.target.value)}
                      placeholder="correct"
                      className="w-20 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-zinc-400 font-medium">/</span>
                    <input
                      type="number"
                      min={1}
                      value={s.total}
                      onChange={e => setField(i, 'total', e.target.value)}
                      placeholder="total"
                      className="w-20 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {pct !== null && (
                      <span className={[
                        'text-xs font-semibold w-10 text-right shrink-0',
                        pct >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                          : pct >= 60 ? 'text-amber-500'
                            : 'text-red-500',
                      ].join(' ')}>
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
              <span className={[
                'text-2xl font-bold',
                avg >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                  : avg >= 60 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400',
              ].join(' ')}>
                {avg}%
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors"
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ session }: { session: PracticeSession }) {
  const date = new Date(session.created_at)
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{session.mode === 'stopwatch' ? '⏱️' : '⏳'}</span>
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {session.mode === 'stopwatch' ? 'Stopwatch' : 'Timer'} · {fmt(session.actual_seconds)}
          </p>
          <p className="text-xs text-zinc-400">{dateStr} at {timeStr}</p>
        </div>
      </div>
      <div className="text-right">
        {session.passage_count > 0 ? (
          <>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {session.passage_count} passage{session.passage_count !== 1 ? 's' : ''}
            </p>
            {session.average_grade !== null && (
              <p className={[
                'text-xs font-medium',
                session.average_grade >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                  : session.average_grade >= 60 ? 'text-amber-500'
                    : 'text-red-500',
              ].join(' ')}>
                avg {session.average_grade}%
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-zinc-400">No passages</p>
        )}
      </div>
    </div>
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
  const { sessions, loading, saveSession } = usePractice()

  // Setup state
  const [mode, setMode] = useState<PracticeMode>('stopwatch')
  const [targetSeconds, setTargetSeconds] = useState(30 * 60)

  // Active timer state
  const [pageState, setPageState] = useState<PageState>('setup')
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [finalElapsed, setFinalElapsed] = useState(0)

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
      // Time's up
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
      // Resume
      const pauseDuration = pausedAtRef.current ? Date.now() - pausedAtRef.current : 0
      totalPausedRef.current += pauseDuration
      pausedAtRef.current = null
      setPaused(false)
      intervalRef.current = setInterval(tick, 500)
    } else {
      // Pause
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
    await saveSession({
      mode,
      targetSeconds,
      actualSeconds: finalElapsed,
      grades,
    })
    setShowModal(false)
    setPageState('setup')
  }

  async function handleSkipPassages() {
    await saveSession({
      mode,
      targetSeconds,
      actualSeconds: finalElapsed,
      grades: [],
    })
    setShowModal(false)
    setPageState('setup')
  }

  // Derived display values
  const displaySeconds = mode === 'timer' ? Math.max(0, targetSeconds - elapsed) : elapsed
  const progress = mode === 'timer'
    ? elapsed / targetSeconds
    : Math.min(1, elapsed / targetSeconds)

  const circumference = 2 * Math.PI * 80
  const dashOffset = circumference * (1 - Math.min(1, progress))

  return (
    <div className="space-y-8">
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
            <div className="space-y-6">
              {/* Mode selector */}
              <div>
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Mode
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('stopwatch')}
                    className={[
                      'flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all',
                      mode === 'stopwatch'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600',
                    ].join(' ')}
                  >
                    <Watch size={24} />
                    <span className="text-sm font-semibold">Stopwatch</span>
                    <span className="text-xs opacity-70">Count up</span>
                  </button>
                  <button
                    onClick={() => setMode('timer')}
                    className={[
                      'flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all',
                      mode === 'timer'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600',
                    ].join(' ')}
                  >
                    <Timer size={24} />
                    <span className="text-sm font-semibold">Timer</span>
                    <span className="text-xs opacity-70">Count down</span>
                  </button>
                </div>
              </div>

              {/* Duration selector */}
              <div>
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Duration
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d.seconds}
                      onClick={() => setTargetSeconds(d.seconds)}
                      className={[
                        'py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                        targetSeconds === d.seconds
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300',
                      ].join(' ')}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start button */}
              <button
                onClick={handleStart}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" />
                Start Practice
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Circular timer */}
              <div className="relative w-52 h-52">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  {/* Background track */}
                  <circle cx="100" cy="100" r="80"
                    fill="none" stroke="currentColor"
                    className="text-zinc-100 dark:text-zinc-800"
                    strokeWidth="10" />
                  {/* Progress */}
                  <circle cx="100" cy="100" r="80"
                    fill="none"
                    stroke={paused ? '#a1a1aa' : '#6366f1'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {fmt(displaySeconds)}
                  </span>
                  <span className="text-xs text-zinc-400 mt-1">
                    {mode === 'timer' ? 'remaining' : 'elapsed'}
                  </span>
                  {paused && (
                    <span className="text-xs text-amber-500 font-medium mt-1">Paused</span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors"
                >
                  <Square size={16} fill="currentColor" />
                  Finish
                </button>
              </div>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
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
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-sm text-zinc-400">No practice sessions yet.</p>
              <p className="text-xs text-zinc-400 mt-1">Complete your first session above!</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sessions.map(s => <HistoryRow key={s.id} session={s} />)}
            </div>
          )}
        </Card>
      </div>

      {/* Passages Modal */}
      {showModal && (
        <PassagesModal
          onSave={handleSavePassages}
          onSkip={handleSkipPassages}
        />
      )}
    </div>
  )
}
