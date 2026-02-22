import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar, Clock, Zap, AlertTriangle, CheckCircle2, Circle,
  RefreshCw, ChevronDown, ChevronUp, Loader2, Target, BookOpen, RotateCcw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  saveExamGoal, loadActiveGoal, generateExamPlan,
  loadActiveExamPlanId, getExamPlanStatus, rescheduleOverdueTasks,
  type ExamGoalForm, type ExamPlanStatus,
} from '../../services/examPlanService'
import type { UserGoal } from '../../types'

// ─── Setup Form ────────────────────────────────────────────────────────────────

function GoalSetupForm({
  initial,
  onSaved,
}: {
  initial?: UserGoal | null
  onSaved: (goal: UserGoal) => void
}) {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<{ id: string; name: string; color: string }[]>([])
  const [form, setForm] = useState<ExamGoalForm>({
    title:         initial?.title         ?? '',
    target_date:   initial?.target_date   ?? '',
    hours_per_day: initial?.hours_per_day ?? 4,
    subject_ids:   Array.isArray(initial?.subjects) ? initial.subjects : [],
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('subjects').select('id, name, color').eq('user_id', user.id).eq('is_active', true)
      .order('name').then(({ data }) => setSubjects((data ?? []) as typeof subjects))
  }, [user])

  function toggleSubject(id: string) {
    setForm(f => ({
      ...f,
      subject_ids: f.subject_ids.includes(id)
        ? f.subject_ids.filter(s => s !== id)
        : [...f.subject_ids, id],
    }))
  }

  async function handleSave() {
    if (!user) return
    if (!form.title.trim())      { setError('Enter exam name'); return }
    if (!form.target_date)       { setError('Select exam date'); return }
    if (form.hours_per_day < 1)  { setError('Daily hours must be at least 1'); return }
    setSaving(true); setError(null)
    try {
      const saved = await saveExamGoal(user.id, form, initial?.id)
      onSaved(saved)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Target size={16} className="text-primary-500" />
          Exam Plan Setup
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">AI will read your curriculum and build a daily study schedule</p>
      </div>

      {/* Exam name */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Exam Name</label>
        <input
          type="text"
          placeholder="e.g. Final Physics Exam"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Exam date */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          <Calendar size={12} className="inline mr-1" />
          Exam Date
        </label>
        <input
          type="date"
          value={form.target_date}
          onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Hours per day */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          <Clock size={12} className="inline mr-1" />
          How many hours per day?
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={1} max={12} step={0.5}
            value={form.hours_per_day}
            onChange={e => setForm(f => ({ ...f, hours_per_day: parseFloat(e.target.value) }))}
            className="flex-1 accent-primary-600"
          />
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400 w-12 text-center">
            {form.hours_per_day}h
          </span>
        </div>
      </div>

      {/* Subject picker */}
      {subjects.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            <BookOpen size={12} className="inline mr-1" />
            Subjects (leave empty = all subjects)
          </label>
          <div className="flex flex-wrap gap-2">
            {subjects.map(s => {
              const selected = form.subject_ids.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSubject(s.id)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    selected
                      ? 'text-white border-transparent shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300',
                  ].join(' ')}
                  style={selected ? { backgroundColor: s.color, borderColor: s.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
        {saving ? 'Saving...' : 'Save & Generate Plan'}
      </button>
    </div>
  )
}

// ─── Plan Dashboard ────────────────────────────────────────────────────────────

function PlanDashboard({
  status,
  onReschedule,
  onRegenerate,
}: {
  status: ExamPlanStatus
  onReschedule: () => void
  onRegenerate: () => void
}) {
  const [showTimeline, setShowTimeline] = useState(false)

  const urgencyColor =
    status.daysLeft <= 2 ? 'text-red-600 dark:text-red-400' :
    status.daysLeft <= 5 ? 'text-amber-600 dark:text-amber-400' :
    'text-emerald-600 dark:text-emerald-400'

  return (
    <div className="space-y-4">

      {/* Header: days left + overall progress */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 text-center">
          <p className={`text-2xl font-black ${urgencyColor}`}>{status.daysLeft}</p>
          <p className="text-xs text-zinc-500 mt-0.5">days to exam</p>
        </div>
        <div className="col-span-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-zinc-500">Plan Total</p>
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{status.completionPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-700"
              style={{ width: `${status.completionPct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">
            {status.completedTasks} / {status.totalTasks} tasks
          </p>
        </div>
      </div>

      {/* AI Alert */}
      {status.aiAlert && (
        <div className={[
          'flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm',
          status.overdueTasks > 0 || status.daysLeft <= 3
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
        ].join(' ')}>
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed">{status.aiAlert}</p>
        </div>
      )}

      {/* Overdue tasks warning */}
      {status.overdueTasks > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-orange-600 dark:text-orange-400 shrink-0" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
              {status.overdueTasks} overdue task{status.overdueTasks !== 1 ? 's' : ''} — do them today!
            </span>
          </div>
          <button
            onClick={onReschedule}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors shrink-0"
          >
            <RotateCcw size={12} />
            Move to today
          </button>
        </div>
      )}

      {/* Today's tasks */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Today's Tasks</p>
          <span className="text-xs text-zinc-400">{status.todayTasks.length} tasks</span>
        </div>
        {status.todayTasks.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-5">No tasks scheduled for today</p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
            {status.todayTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                {t.status === 'completed'
                  ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  : <Circle size={16} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm',
                    t.status === 'completed'
                      ? 'line-through text-zinc-400'
                      : 'text-zinc-800 dark:text-zinc-200',
                  ].join(' ')}>
                    {t.title}
                  </p>
                  {t.subjectName && (
                    <p className="text-xs text-zinc-400 mt-0.5">{t.subjectName}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{t.durationMinutes}m</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline toggle */}
      <button
        onClick={() => setShowTimeline(v => !v)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      >
        {showTimeline ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        {showTimeline ? 'Hide full schedule' : 'Show full schedule'}
      </button>

      {/* Full timeline */}
      {showTimeline && (
        <div className="space-y-1.5">
          {status.dayPlans.map(d => (
            <div
              key={d.date}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm border',
                d.isExamDay
                  ? 'bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800'
                  : d.isPast && d.taskCount > 0 && d.completedCount < d.taskCount
                  ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
              ].join(' ')}
            >
              <span className="w-20 shrink-0 font-medium text-zinc-700 dark:text-zinc-300 text-xs">
                {d.dayLabel}
              </span>
              {d.isExamDay ? (
                <span className="text-primary-600 dark:text-primary-400 font-semibold text-xs">🎯 Exam Day</span>
              ) : d.taskCount === 0 ? (
                <span className="text-zinc-400 text-xs">No tasks</span>
              ) : (
                <>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className={[
                        'h-full rounded-full transition-all',
                        d.isPast && d.completedCount < d.taskCount ? 'bg-orange-400' : 'bg-emerald-400',
                      ].join(' ')}
                      style={{ width: `${d.taskCount > 0 ? Math.round((d.completedCount / d.taskCount) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0">{d.completedCount}/{d.taskCount}</span>
                  <span className="text-xs text-zinc-300 shrink-0">{Math.round(d.totalMinutes / 60 * 10) / 10}h</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Regenerate link */}
      <button
        onClick={onRegenerate}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <RefreshCw size={12} />
        Regenerate plan from scratch
      </button>
    </div>
  )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function ExamPlanWidget() {
  const { user } = useAuth()

  type Mode = 'loading' | 'setup' | 'generating' | 'dashboard'
  const [mode,   setMode]   = useState<Mode>('loading')
  const [goal,   setGoal]   = useState<UserGoal | null>(null)
  const [status, setStatus] = useState<ExamPlanStatus | null>(null)
  const [error,  setError]  = useState<string | null>(null)

  // ── Initial load ─────────────────────────────────────────────────────────────
  const init = useCallback(async () => {
    if (!user) return
    setMode('loading'); setError(null)
    try {
      const activeGoal = await loadActiveGoal(user.id)
      setGoal(activeGoal)

      if (!activeGoal) { setMode('setup'); return }

      const planId = await loadActiveExamPlanId(user.id)
      if (!planId) { setMode('setup'); return }

      const s = await getExamPlanStatus(user.id, planId, activeGoal)
      setStatus(s)
      setMode('dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setMode('setup')
    }
  }, [user])

  useEffect(() => { init() }, [init])

  // ── Goal saved → generate plan ───────────────────────────────────────────────
  async function handleGoalSaved(savedGoal: UserGoal) {
    if (!user) return
    setGoal(savedGoal)
    setMode('generating')
    setError(null)
    try {
      const planId = await generateExamPlan(user.id, savedGoal)
      const s = await getExamPlanStatus(user.id, planId, savedGoal)
      setStatus(s)
      setMode('dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan')
      setMode('setup')
    }
  }

  // ── Reschedule overdue to today ───────────────────────────────────────────────
  async function handleReschedule() {
    if (!user || !status) return
    const n = await rescheduleOverdueTasks(user.id, status.planId)
    if (n > 0) {
      const s = await getExamPlanStatus(user.id, status.planId, goal!)
      setStatus(s)
    }
  }

  // ── Regenerate from scratch ───────────────────────────────────────────────────
  function handleRegenerate() {
    setMode('setup')
    setStatus(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-zinc-400" />
      </div>
    )
  }

  if (mode === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 size={22} className="animate-spin text-primary-500" />
        <p className="text-sm text-zinc-500">AI is building your plan from your curriculum…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {mode === 'setup' && (
        <GoalSetupForm initial={goal} onSaved={handleGoalSaved} />
      )}

      {mode === 'dashboard' && status && (
        <PlanDashboard
          status={status}
          onReschedule={handleReschedule}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  )
}
