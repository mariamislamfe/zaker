import { useState, useEffect, useCallback } from 'react'
import { format, addDays, parseISO, eachDayOfInterval } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { PlanTask } from '../types'

export interface DayPlan {
  date:           string   // 'yyyy-MM-dd'
  isToday:        boolean
  isTomorrow:     boolean
  isPast:         boolean
  tasks:          PlanTask[]
  completedCount: number
  totalCount:     number
}

export function usePlanCalendar() {
  const { user }   = useAuth()
  const [days,     setDays]     = useState<DayPlan[]>([])
  const [planInfo, setPlanInfo] = useState<{ title: string; endDate: string } | null>(null)
  const [loading,  setLoading]  = useState(true)

  const todayStr    = format(new Date(), 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Get the active goal's deadline
    const { data: goal } = await supabase
      .from('user_goals')
      .select('target_date, title')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const endDate = goal?.target_date ?? format(addDays(new Date(), 90), 'yyyy-MM-dd')
    setPlanInfo({ title: goal?.title ?? 'Study Plan', endDate })

    // Fetch all tasks in the plan range
    const { data: tasks } = await supabase
      .from('plan_tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', todayStr)
      .lte('scheduled_date', endDate)
      .order('scheduled_date')
      .order('order_index')

    // Group tasks by date
    const taskMap = new Map<string, PlanTask[]>()
    for (const t of (tasks ?? [])) {
      const d = t.scheduled_date as string
      if (!taskMap.has(d)) taskMap.set(d, [])
      taskMap.get(d)!.push(t as PlanTask)
    }

    // Generate all calendar days (including empty ones)
    const start   = parseISO(todayStr)
    const end     = parseISO(endDate)
    const allDays = eachDayOfInterval({ start, end })

    setDays(allDays.map(d => {
      const date     = format(d, 'yyyy-MM-dd')
      const dayTasks = taskMap.get(date) ?? []
      return {
        date,
        isToday:    date === todayStr,
        isTomorrow: date === tomorrowStr,
        isPast:     date < todayStr,
        tasks:      dayTasks,
        completedCount: dayTasks.filter(t => t.status === 'completed').length,
        totalCount:     dayTasks.length,
      }
    }))

    setLoading(false)
  }, [user, todayStr, tomorrowStr])

  useEffect(() => { fetch() }, [fetch])

  // Derived totals
  const totalTasks     = days.reduce((s, d) => s + d.totalCount, 0)
  const completedTasks = days.reduce((s, d) => s + d.completedCount, 0)
  const daysWithTasks  = days.filter(d => d.totalCount > 0).length

  return { days, planInfo, loading, refetch: fetch, totalTasks, completedTasks, daysWithTasks }
}
