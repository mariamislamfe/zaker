import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase }           from '../lib/supabase'
import { useAuth }            from '../contexts/AuthContext'
import { generateNextDayPlan, adjustPlan } from '../services/aiEngine'
import type { PlanTask, StudyPlan } from '../types'

export function useStudyPlan(date?: string) {
  const { user } = useAuth()
  const targetDate = date ?? format(new Date(), 'yyyy-MM-dd')

  const [plan,    setPlan]    = useState<StudyPlan | null>(null)
  const [tasks,   setTasks]   = useState<PlanTask[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Fetch plan + tasks for targetDate ─────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data: planData } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .lte('start_date', targetDate)
      .or(`end_date.gte.${targetDate},end_date.is.null`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const currentPlan = planData as StudyPlan | null
    setPlan(currentPlan)

    if (currentPlan) {
      const { data: taskData } = await supabase
        .from('plan_tasks')
        .select('*')
        .eq('plan_id', currentPlan.id)
        .eq('scheduled_date', targetDate)
        .order('order_index', { ascending: true })
      setTasks((taskData ?? []) as PlanTask[])
    } else {
      setTasks([])
    }

    setLoading(false)
  }, [user, targetDate])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  // ── Complete a task (optimistic) ──────────────────────────────────────────
  const completeTask = useCallback(async (taskId: string, actualMinutes?: number) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: 'completed', completed_at: new Date().toISOString(), actual_duration_minutes: actualMinutes ?? t.duration_minutes }
        : t,
    ))
    await supabase.from('plan_tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      actual_duration_minutes: actualMinutes,
    }).eq('id', taskId)
  }, [])

  // ── Skip a task (optimistic) ──────────────────────────────────────────────
  const skipTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'skipped' } : t))
    await supabase.from('plan_tasks').update({ status: 'skipped' }).eq('id', taskId)
  }, [])

  // ── Undo (back to pending) ────────────────────────────────────────────────
  const resetTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'pending', completed_at: null } : t))
    await supabase.from('plan_tasks').update({ status: 'pending', completed_at: null }).eq('id', taskId)
  }, [])

  // ── Generate tomorrow's plan via AI ───────────────────────────────────────
  const generateTomorrowPlan = useCallback(async () => {
    if (!user) return
    setGenerating(true)
    setError(null)
    try {
      await generateNextDayPlan(user.id)
      await fetchPlan()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan')
    } finally {
      setGenerating(false)
    }
  }, [user, fetchPlan])

  // ── Reschedule overdue tasks ──────────────────────────────────────────────
  const rescheduleOverdue = useCallback(async () => {
    if (!user) return
    const { adjusted } = await adjustPlan(user.id)
    if (adjusted > 0) await fetchPlan()
    return adjusted
  }, [user, fetchPlan])

  // ── Summary stats ─────────────────────────────────────────────────────────
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount     = tasks.length
  const plannedMinutes = tasks.reduce((s, t) => s + t.duration_minutes, 0)
  const doneMinutes    = tasks.filter(t => t.status === 'completed')
    .reduce((s, t) => s + (t.actual_duration_minutes ?? t.duration_minutes), 0)
  const progressPct    = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return {
    plan, tasks, loading, generating, error,
    completedCount, totalCount, plannedMinutes, doneMinutes, progressPct,
    completeTask, skipTask, resetTask,
    generateTomorrowPlan, rescheduleOverdue,
    refetch: fetchPlan,
  }
}
