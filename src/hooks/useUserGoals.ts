import { useState, useEffect, useCallback } from 'react'
import { supabase }  from '../lib/supabase'
import { useAuth }   from '../contexts/AuthContext'
import { generateStudyPlan } from '../services/aiEngine'
import type { UserGoal }     from '../types'

export interface CreateGoalInput {
  title:       string
  description?: string
  targetDate?: string
  hoursPerDay: number
  subjectIds:  string[]
}

export function useUserGoals() {
  const { user } = useAuth()
  const [goals,   setGoals]   = useState<UserGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setGoals((data ?? []) as UserGoal[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const activeGoal = goals.find(g => g.is_active) ?? null

  // ── Create a goal + generate its study plan ───────────────────────────────
  const createGoalWithPlan = useCallback(async (input: CreateGoalInput): Promise<string | null> => {
    if (!user) return null
    setGenerating(true)
    setError(null)
    try {
      // 1. Deactivate previous goals
      await supabase.from('user_goals').update({ is_active: false }).eq('user_id', user.id)

      // 2. Insert new goal
      const { data: goal, error: gErr } = await supabase.from('user_goals').insert({
        user_id:      user.id,
        title:        input.title,
        description:  input.description ?? null,
        target_date:  input.targetDate  ?? null,
        hours_per_day: input.hoursPerDay,
        subjects:     input.subjectIds,
        is_active:    true,
      }).select().single()

      if (gErr || !goal) throw new Error(gErr?.message ?? 'Failed to create goal')

      // 3. Generate multi-day AI plan (if deadline provided)
      let planId: string | null = null
      if (input.targetDate && input.subjectIds.length) {
        const result = await generateStudyPlan({
          userId:       user.id,
          title:        `Plan: ${input.title}`,
          goalDeadline: input.targetDate,
          hoursPerDay:  input.hoursPerDay,
          subjectIds:   input.subjectIds,
        })
        planId = result.planId

        // Link plan to goal
        await supabase.from('study_plans').update({ goal_id: goal.id }).eq('id', planId)
      }

      await fetchGoals()
      return planId
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create goal')
      return null
    } finally {
      setGenerating(false)
    }
  }, [user, fetchGoals])

  const updateGoal = useCallback(async (id: string, patch: Partial<CreateGoalInput>) => {
    const update: Record<string, unknown> = {}
    if (patch.title !== undefined)       update.title        = patch.title
    if (patch.description !== undefined) update.description  = patch.description
    if (patch.targetDate !== undefined)  update.target_date  = patch.targetDate
    if (patch.hoursPerDay !== undefined) update.hours_per_day = patch.hoursPerDay
    if (patch.subjectIds !== undefined)  update.subjects     = patch.subjectIds
    await supabase.from('user_goals').update(update).eq('id', id)
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...update } as UserGoal : g))
  }, [])

  const deleteGoal = useCallback(async (id: string) => {
    await supabase.from('user_goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])

  const setActive = useCallback(async (id: string) => {
    await supabase.from('user_goals').update({ is_active: false }).eq('user_id', user!.id)
    await supabase.from('user_goals').update({ is_active: true  }).eq('id', id)
    setGoals(prev => prev.map(g => ({ ...g, is_active: g.id === id })))
  }, [user])

  return { goals, activeGoal, loading, generating, error, createGoalWithPlan, updateGoal, deleteGoal, setActive, refetch: fetchGoals }
}
