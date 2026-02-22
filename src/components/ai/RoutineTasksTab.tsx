import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ArrowRight, ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { PlanTask } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'daily' | 'weekly' | 'monthly'

const CATEGORIES: { id: Category; label: string; icon: string; color: string; bg: string }[] = [
  { id: 'daily',   label: 'Daily',   icon: '☀️', color: 'text-sky-700 dark:text-sky-300',     bg: 'bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800' },
  { id: 'weekly',  label: 'Weekly',  icon: '📅', color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800' },
  { id: 'monthly', label: 'Monthly', icon: '🗓️', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' },
]

const ROUTINE_DATE = '9999-12-31'

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useRoutineTasks() {
  const { user } = useAuth()
  const [tasks,   setTasks]   = useState<PlanTask[]>([])
  const [planId,  setPlanId]  = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Find or create a "routine" plan
    const { data: existing } = await supabase
      .from('study_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_type', 'routine')
      .maybeSingle()

    let pid = existing?.id ?? null
    if (!pid) {
      const { data: created } = await supabase.from('study_plans').insert({
        user_id:      user.id,
        title:        'Routine Tasks',
        plan_type:    'routine',
        start_date:   '2000-01-01',
        end_date:     null,
        status:       'active',
        ai_generated: false,
        metadata:     {},
      }).select('id').single()
      pid = created?.id ?? null
    }

    setPlanId(pid)

    if (pid) {
      const { data } = await supabase
        .from('plan_tasks')
        .select('*')
        .eq('plan_id', pid)
        .eq('scheduled_date', ROUTINE_DATE)
        .order('order_index', { ascending: true })
      setTasks((data ?? []) as PlanTask[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const addTask = useCallback(async (title: string, category: Category) => {
    if (!user || !planId || !title.trim()) return
    const orderMax = tasks.filter(t => t.description === category).length
    const { data } = await supabase.from('plan_tasks').insert({
      plan_id:          planId,
      user_id:          user.id,
      title:            title.trim(),
      description:      category,
      scheduled_date:   ROUTINE_DATE,
      duration_minutes: 30,
      status:           'pending',
      priority:         1,
      order_index:      orderMax,
    }).select().single()
    if (data) setTasks(prev => [...prev, data as PlanTask])
  }, [user, planId, tasks])

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('plan_tasks').delete().eq('id', id)
  }, [])

  const moveTask = useCallback(async (id: string, to: Category) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, description: to } : t))
    await supabase.from('plan_tasks').update({ description: to }).eq('id', id)
  }, [])

  return { tasks, loading, addTask, deleteTask, moveTask, refetch: fetch }
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  currentCategory,
  onDelete,
  onMove,
}: {
  task: PlanTask
  currentCategory: Category
  onDelete: (id: string) => void
  onMove: (id: string, to: Category) => void
}) {
  const others = CATEGORIES.filter(c => c.id !== currentCategory)

  return (
    <div className="group flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
      {/* bullet */}
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-500 shrink-0" />

      {/* title */}
      <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200 truncate" dir="rtl">
        {task.title}
      </span>

      {/* move buttons — hidden until hover */}
      <div className="hidden group-hover:flex items-center gap-1">
        {others.map(cat => (
          <button
            key={cat.id}
            onClick={() => onMove(task.id, cat.id)}
            title={`Move to ${cat.label}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            {cat.id === 'daily' ? <ArrowLeft size={10} /> : cat.id === 'monthly' ? <ArrowRight size={10} /> : null}
            {cat.icon}
          </button>
        ))}
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded-lg text-zinc-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  cat,
  tasks,
  onAdd,
  onDelete,
  onMove,
}: {
  cat: typeof CATEGORIES[number]
  tasks: PlanTask[]
  onAdd: (title: string, cat: Category) => void
  onDelete: (id: string) => void
  onMove: (id: string, to: Category) => void
}) {
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)

  function submit() {
    if (!input.trim()) return
    onAdd(input.trim(), cat.id)
    setInput('')
    setAdding(false)
  }

  return (
    <div className={`rounded-2xl border ${cat.bg} flex flex-col`}>
      {/* header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${cat.bg.split(' ').filter(c => c.startsWith('border')).join(' ')}`}>
        <span className="text-base">{cat.icon}</span>
        <span className={`text-sm font-bold ${cat.color}`}>{cat.label}</span>
        <span className="ml-auto text-xs text-zinc-400 font-medium">{tasks.length}</span>
      </div>

      {/* task list */}
      <div className="flex-1 px-2 py-2 space-y-0.5 min-h-[120px]">
        {tasks.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-4">No tasks</p>
        ) : (
          tasks.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              currentCategory={cat.id}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))
        )}
      </div>

      {/* add input */}
      <div className="px-3 pb-3">
        {adding ? (
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Task name..."
              dir="rtl"
              className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              onClick={submit}
              className="px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors"
            >
              +
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-2 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-700/40 transition-colors border border-dashed border-zinc-200 dark:border-zinc-600"
          >
            <Plus size={12} />
            Add Task
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RoutineTasksTab() {
  const { tasks, loading, addTask, deleteTask, moveTask, refetch } = useRoutineTasks()

  function byCategory(cat: Category) {
    return tasks.filter(t => t.description === cat)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Routine Tasks</p>
          <p className="text-xs text-zinc-400 mt-0.5">Recurring tasks — Daily / Weekly / Monthly</p>
        </div>
        <button
          onClick={refetch}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          title="Refresh"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => (
          <Column
            key={cat.id}
            cat={cat}
            tasks={byCategory(cat.id)}
            onAdd={addTask}
            onDelete={deleteTask}
            onMove={moveTask}
          />
        ))}
      </div>

      {/* hint */}
      <p className="text-[11px] text-zinc-400 text-center">
        Hover over a task to show move and delete buttons
      </p>
    </div>
  )
}
