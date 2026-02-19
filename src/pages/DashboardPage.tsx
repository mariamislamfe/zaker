import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, TrendingUp, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useTimerContext } from '../contexts/TimerContext'
import { useSubjects } from '../hooks/useSubjects'
import { useAnalytics } from '../hooks/useAnalytics'
import { usePractice } from '../hooks/usePractice'
import { TimerDisplay } from '../components/timer/TimerDisplay'
import { TimerControls } from '../components/timer/TimerControls'
import { Card, StatCard } from '../components/ui/Card'
import { ColorDot } from '../components/ui/Badge'
import { formatHumanDuration } from '../utils/time'

export function DashboardPage() {
  const { profile } = useAuth()
  const { subjects } = useSubjects()
  const { timerState, elapsed, breakElapsed, startSession, startBreak, endBreak, stopSession, discardSession } = useTimerContext()
  const { subjectStats, totalSeconds, loading: analyticsLoading } = useAnalytics('day')
  const { sessions: practiceSessions } = usePractice()

  // Sum URT actual_seconds for today (local date)
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {greeting}, {profile?.username ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
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
          onStop={stopSession}
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

        {/* Quick links */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Manage Subjects', desc: 'Add or edit your subjects', path: '/subjects', icon: '📚' },
              { label: 'Analytics', desc: 'View your study trends', path: '/analytics', icon: '📊' },
              { label: 'URT Tracker', desc: 'Track passages & grades', path: '/urt', icon: '📝' },
              { label: 'Leaderboard', desc: 'Compare with friends', path: '/social', icon: '🏆' },
            ].map(({ label, desc, path, icon }) => (
              <Link
                key={label}
                to={path}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950 transition-all group"
              >
                <span className="text-2xl">{icon}</span>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
