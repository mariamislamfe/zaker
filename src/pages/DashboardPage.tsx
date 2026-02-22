import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, TrendingUp, Calendar, AlertCircle, Megaphone, X } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { adaptiveReaction } from '../services/aiService'
import { useTimerContext } from '../contexts/TimerContext'
import { useSubjects } from '../hooks/useSubjects'
import { useAnalytics } from '../hooks/useAnalytics'
import { usePractice } from '../hooks/usePractice'
import { TimerDisplay } from '../components/timer/TimerDisplay'
import { TimerControls } from '../components/timer/TimerControls'
import { Card, StatCard } from '../components/ui/Card'
import { ColorDot } from '../components/ui/Badge'
import { formatHumanDuration } from '../utils/time'
import { SleepWakeWidget } from '../components/ai/SleepWakeWidget'
import { EditableTaskPanel } from '../components/ai/EditableTaskPanel'

interface AdminMsg { id: string; title: string; content: string }

export function DashboardPage() {
  const { user, profile } = useAuth()
  const { subjects } = useSubjects()
  const { timerState, elapsed, breakElapsed, startSession, startBreak, endBreak, stopSession, discardSession } = useTimerContext()
  const { subjectStats, totalSeconds, loading: analyticsLoading } = useAnalytics('day')
  const { sessions: practiceSessions } = usePractice()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const urtTodaySeconds = practiceSessions
    .filter(s => format(new Date(s.created_at), 'yyyy-MM-dd') === todayStr)
    .reduce((sum, s) => sum + s.actual_seconds, 0)
  const totalStudySeconds = totalSeconds + urtTodaySeconds

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    timerState.subjectId
  )
  const [startError, setStartError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  // Adaptive reaction (early-stop AI toast)
  const [aiToast,    setAiToast]    = useState<{ msg: string; icon: string } | null>(null)
  const elapsedRef = useRef(elapsed)
  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])
  useEffect(() => {
    if (!aiToast) return
    const t = setTimeout(() => setAiToast(null), 7000)
    return () => clearTimeout(t)
  }, [aiToast])

  async function handleStop() {
    const snap = elapsedRef.current
    await stopSession()
    const reaction = adaptiveReaction(snap)
    if (reaction) setAiToast(reaction)
  }

  // Admin messages
  const [adminMsgs, setAdminMsgs] = useState<AdminMsg[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    supabase
      .from('admin_messages')
      .select('id, title, content')
      .eq('is_active', true)
      .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAdminMsgs((data ?? []) as AdminMsg[]))
  }, [user])

  // Sync selectedSubjectId with active session
  useEffect(() => {
    if (timerState.subjectId) setSelectedSubjectId(timerState.subjectId)
  }, [timerState.subjectId])

  // Auto-dismiss error after 6 seconds
  useEffect(() => {
    if (!startError) return
    const t = setTimeout(() => setStartError(null), 6000)
    return () => clearTimeout(t)
  }, [startError])

  const activeSubject = subjects.find(s => s.id === (timerState.subjectId ?? selectedSubjectId))

  async function handleStart() {
    if (!selectedSubjectId || starting) return
    setStartError(null)
    setStarting(true)
    try {
      await startSession(selectedSubjectId)
    } catch (err: any) {
      setStartError(err?.message ?? 'Failed to start — check your connection or Supabase setup.')
    } finally {
      setStarting(false)
    }
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const visibleMsgs = adminMsgs.filter(m => !dismissedIds.has(m.id))

  return (
    <div className="space-y-8">
      {/* Admin message banners */}
      {visibleMsgs.map(m => (
        <div
          key={m.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
        >
          <Megaphone size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{m.title}</p>
            <p className="text-sm mt-0.5">{m.content}</p>
          </div>
          <button
            onClick={() => setDismissedIds(prev => new Set([...prev, m.id]))}
            className="shrink-0 p-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* AI adaptive reaction toast */}
      {aiToast && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-200 animate-pulse-once">
          <span className="text-lg shrink-0 leading-none mt-0.5">{aiToast.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-500 dark:text-violet-400 mb-0.5">AI · Motivation Drop Detected</p>
            <p className="text-sm" dir="rtl">{aiToast.msg}</p>
          </div>
          <button onClick={() => setAiToast(null)} className="shrink-0 p-0.5 rounded hover:bg-violet-200 dark:hover:bg-violet-900 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {greeting}, {profile?.username ?? 'there'} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Compact sleep/wake tracker */}
        <div className="shrink-0 pt-1">
          <SleepWakeWidget compact />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Study"
          value={formatHumanDuration(totalStudySeconds)}
          sub={urtTodaySeconds > 0 ? `study + ${formatHumanDuration(urtTodaySeconds)} URT` : 'all subjects'}
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Active Subjects"
          value={String(subjects.filter(s => s.is_active).length)}
          sub="being tracked"
          icon={<BookOpen size={18} />}
        />
        <StatCard
          label="Top Subject"
          value={subjectStats[0]?.subject_name ?? '—'}
          sub={subjectStats[0] ? formatHumanDuration(subjectStats[0].total_seconds) : 'No sessions yet'}
          color={subjectStats[0]?.subject_color}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Sessions Today"
          value={String(subjectStats.reduce((n, s) => n + s.session_count, 0))}
          sub="completed sessions"
          icon={<Calendar size={18} />}
        />
      </div>

      {/* Timer */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Timer
        </h2>

        {/* Error banner */}
        {startError && (
          <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{startError}</span>
          </div>
        )}

        <TimerDisplay
          elapsed={elapsed}
          breakElapsed={breakElapsed}
          status={timerState.status}
          subjectName={activeSubject?.name}
          subjectColor={activeSubject?.color}
        />
        <TimerControls
          status={timerState.status}
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
          onStart={handleStart}
          onStartBreak={startBreak}
          onEndBreak={endBreak}
          onStop={handleStop}
          onDiscard={discardSession}
          startLoading={starting}
        />
      </Card>

      {/* Today's breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Today's Subjects
            </h2>
            <Link
              to="/analytics"
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              Full analytics →
            </Link>
          </div>

          {analyticsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : subjectStats.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-400">No study sessions today.</p>
              <p className="text-xs text-zinc-400 mt-1">Start a timer above to begin tracking!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectStats.map(stat => {
                const pct = totalSeconds > 0 ? (stat.total_seconds / totalSeconds) * 100 : 0
                return (
                  <div key={stat.subject_id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ColorDot color={stat.subject_color} />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {stat.subject_name}
                        </span>
                      </div>
                      <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
                        {formatHumanDuration(stat.total_seconds)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: stat.subject_color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Today's tasks */}
        <EditableTaskPanel date={todayStr} label="Today's Tasks" />
      </div>
    </div>
  )
}
