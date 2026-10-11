import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { PlanTask } from '../types'

// Dated tasks between two 'yyyy-MM-dd' dates (inclusive), oldest first.
// Recurring routine-list items live on 9999-12-31 and are never inside a real range.
export function useTaskArchive(from: string, to: string) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('plan_tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .order('scheduled_date', { ascending: true })
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setTasks((data ?? []) as PlanTask[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, from, to])

  return { tasks, loading }
}
