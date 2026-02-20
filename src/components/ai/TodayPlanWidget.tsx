import React, { useState } from 'react'
import {
  CheckCircle2, Circle, SkipForward, RotateCcw,
  Wand2, Clock, ChevronDown, ChevronUp, Calendar,
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useStudyPlan } from '../../hooks/useStudyPlan'
import type { PlanTask } from '../../types'

// ─── Single task row ──────────────────────────────────────────────────────────

function TaskRow({
  task,
  onComplete,
  onSkip,
  onReset,
}: {
  task:       PlanTask
  onComplete: (id: string) => void
  onSkip:     (id: string) => void
  onReset:    (id: string) => void
}) {
  const isDone    = task.status === 'completed'
  const isSkipped = task.status === 'skipped'
  const isPending = task.status === 'pending'

  const priorityDot = task.priority === 3 ? '#ef4444' : task.priority === 2 ? '#f59e0b' : '#10b981'

  return (
    <div className={[
      'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
      isDone    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 opacity-80' :
      isSkipped ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-60' :
                  'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
    ].join(' ')}>

      {/* Subject color bar */}
      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: task.subject_id ? '#6366f1' : '#6366f1' }} />

      {/* Checkbox */}
      <button
        onClick={() => isPending ? onComplete(task.id) : isDone ? onReset(task.id) : undefined}
        disabled={isSkipped}
        className="shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-emerald-500 transition-colors"
      >
        {isDone
          ? <CheckCircle2 size={20} className="text-emerald-500" />
          : <Circle size={20} />
        }
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={['text-sm font-medium truncate', isDone ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'].join(' ')}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.subject_name && (
            <span className="text-xs text-zinc-400">{task.subject_name}</span>
          )}
          {task.scheduled_start_time && (
            <span className="text-xs text-zinc-400 flex items-center gap-0.5">
              <Clock size={10} />{task.scheduled_start_time}
            </span>
          )}
          <span className="text-xs text-zinc-400">{task.duration_minutes}m</span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: priorityDot }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isDone && (
          <button onClick={() => onReset(task.id)} className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 transition-colors" title="Undo">
            <RotateCcw size={13} />
          </button>
        )}
        {isPending && (
          <button onClick={() => onSkip(task.id)} className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-amber-400 transition-colors" title="Skip">
            <SkipForward size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────

interface Props {
  /** 'yyyy-MM-dd' — defaults to today */
  date?:     string
  /** Show the "generate tomorrow" button */
  showGenerate?: boolean
  compact?:  boolean
}

export function TodayPlanWidget({ date, showGenerate = true, compact = false }: Props) {
  const isTomorrow    = !!date
  const displayDate   = date ?? format(new Date(), 'yyyy-MM-dd')
  const tomorrowDate  = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const viewDate      = date ?? (isTomorrow ? tomorrowDate : displayDate)

  const {
    tasks, plan, loading, generating, error,
    completedCount, totalCount, plannedMinutes, progressPct,
    completeTask, skipTask, resetTask, generateTomorrowPlan,
  } = useStudyPlan(viewDate)

  const [collapsed, setCollapsed] = useState(false)

  const dateLabel = viewDate === format(new Date(), 'yyyy-MM-dd')
    ? 'Today'
    : viewDate === format(addDays(new Date(), 1), 'yyyy-MM-dd')
    ? 'Tomorrow'
    : format(new Date(viewDate + 'T12:00:00'), 'MMM d')

  // ── Empty state: no plan ──────────────────────────────────────────────────
  if (!loading && !plan && tasks.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Calendar size={32} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">No plan for {dateLabel}</p>
        <p className="text-xs text-zinc-400 mb-4">Generate an AI-powered study plan to get started.</p>
        {showGenerate && (
          <button
            onClick={generateTomorrowPlan}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <Wand2 size={15} />
            {generating ? 'Generating…' : `Generate ${dateLabel}'s Plan`}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
      </div>
    )
  }

  const hrs = Math.floor(plannedMinutes / 60)
  const min = plannedMinutes % 60

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {dateLabel}'s Plan
          </span>
          {totalCount > 0 && (
            <span className="text-xs text-zinc-400">
              {completedCount}/{totalCount} done · {hrs > 0 ? `${hrs}h ` : ''}{min > 0 ? `${min}m` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showGenerate && (
            <button
              onClick={generateTomorrowPlan}
              disabled={generating}
              title="Regenerate plan"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors disabled:opacity-50"
            >
              <Wand2 size={14} />
            </button>
          )}
          {!compact && (
            <button onClick={() => setCollapsed(v => !v)} className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors">
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>{progressPct}% complete</span>
            <span>{completedCount} of {totalCount} tasks</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Task list */}
      {!collapsed && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">No tasks scheduled for {dateLabel}.</p>
          ) : (
            tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={completeTask}
                onSkip={skipTask}
                onReset={resetTask}
              />
            ))
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
