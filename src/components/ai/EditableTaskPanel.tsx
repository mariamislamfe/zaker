import React, { useState } from 'react'
import {
  CheckCircle2, Circle, SkipForward, RotateCcw,
  Trash2, Plus, Clock,
} from 'lucide-react'
import { useStudyPlan } from '../../hooks/useStudyPlan'
import type { PlanTask } from '../../types'

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task, onComplete, onSkip, onReset, onDelete,
}: {
  task:       PlanTask
  onComplete: (id: string) => void
  onSkip:     (id: string) => void
  onReset:    (id: string) => void
  onDelete:   (id: string) => void
}) {
  const isDone    = task.status === 'completed'
  const isSkipped = task.status === 'skipped'
  const isPending = task.status === 'pending'

  return (
    <div className={[
      'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all group',
      isDone    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 opacity-80' :
      isSkipped ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-60' :
                  'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
    ].join(' ')}>

      {/* Checkbox */}
      <button
        onClick={() => isPending ? onComplete(task.id) : isDone ? onReset(task.id) : undefined}
        disabled={isSkipped}
        className="shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-emerald-500 transition-colors"
      >
        {isDone ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={['text-sm font-medium truncate', isDone ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'].join(' ')}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.subject_name && <span className="text-xs text-zinc-400">{task.subject_name}</span>}
          <span className="text-xs text-zinc-400 flex items-center gap-0.5">
            <Clock size={9} />{task.duration_minutes}م
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {isDone && (
          <button onClick={() => onReset(task.id)} className="p-1 text-zinc-300 hover:text-zinc-500 transition-colors" title="تراجع">
            <RotateCcw size={12} />
          </button>
        )}
        {isPending && (
          <button onClick={() => onSkip(task.id)} className="p-1 text-zinc-300 hover:text-amber-400 transition-colors" title="تخطي">
            <SkipForward size={13} />
          </button>
        )}
        <button onClick={() => onDelete(task.id)} className="p-1 text-zinc-300 hover:text-red-400 transition-colors" title="حذف">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Add task mini-form ───────────────────────────────────────────────────────

function AddTaskForm({ onAdd }: { onAdd: (title: string, mins: number) => void }) {
  const [title, setTitle] = useState('')
  const [mins,  setMins]  = useState(30)
  const [open,  setOpen]  = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title.trim(), mins)
    setTitle('')
    setMins(30)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 w-full px-3 py-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400 hover:text-primary-500 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
      >
        <Plus size={13} />
        <span>تاسك جديد</span>
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/20">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="اسم التاسك"
        dir="rtl"
        className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none min-w-0"
      />
      <input
        type="number"
        value={mins}
        onChange={e => setMins(Number(e.target.value))}
        min={5}
        max={480}
        className="w-12 bg-transparent text-xs text-zinc-500 text-center outline-none border-x border-zinc-200 dark:border-zinc-700 px-1"
      />
      <span className="text-xs text-zinc-400">م</span>
      <button type="submit" className="text-xs px-2 py-1 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors">
        +
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-400 hover:text-zinc-600 px-1">
        ✕
      </button>
    </form>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  date:  string   // 'yyyy-MM-dd'
  label: string   // e.g. 'النهارده' | 'بكرا'
}

export function EditableTaskPanel({ date, label }: Props) {
  const {
    tasks, loading,
    completedCount, totalCount, progressPct,
    completeTask, skipTask, resetTask, deleteTask, addTask,
  } = useStudyPlan(date)

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{label}</span>
          {totalCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 font-semibold">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <span className="text-xs text-zinc-400">{progressPct}%</span>
        )}
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="px-4 pt-3 pb-1">
          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Task list + add form */}
      <div className="p-3 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-3">مفيش تاسكات — ضيف حاجة ⬇️</p>
        ) : (
          tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={completeTask}
              onSkip={skipTask}
              onReset={resetTask}
              onDelete={deleteTask}
            />
          ))
        )}
        <AddTaskForm onAdd={addTask} />
      </div>
    </div>
  )
}
