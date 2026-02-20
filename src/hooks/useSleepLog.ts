import { useState, useEffect, useCallback } from 'react'
import { format, differenceInMinutes } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { SleepLog } from '../types'

// ─── useSleepLog ─────────────────────────────────────────────────────────────
// Manages daily wake/sleep logging.
// Each user gets one row per calendar day in the sleep_logs table.
// Wake time is logged in the morning; sleep time is logged at night.

export function useSleepLog() {
  const { user } = useAuth()
  const [todayLog, setTodayLog]     = useState<SleepLog | null>(null)
  const [recentLogs, setRecentLogs] = useState<SleepLog[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  const todayDate = format(new Date(), 'yyyy-MM-dd')

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(14)
    const logs = (data ?? []) as SleepLog[]
    setRecentLogs(logs)
    setTodayLog(logs.find(l => l.log_date === todayDate) ?? null)
    setLoading(false)
  }, [user, todayDate])

  useEffect(() => { fetch() }, [fetch])

  // ── Log wake time ───────────────────────────────────────────────────────────
  async function logWakeTime() {
    if (!user) return
    setSaving(true)
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('sleep_logs')
      .upsert(
        { user_id: user.id, log_date: todayDate, wake_time: now },
        { onConflict: 'user_id,log_date' },
      )
      .select()
      .single()
    if (data) {
      const log = data as SleepLog
      setTodayLog(log)
      setRecentLogs(prev => [log, ...prev.filter(l => l.log_date !== todayDate)])
    }
    setSaving(false)
  }

  // ── Log sleep time ──────────────────────────────────────────────────────────
  async function logSleepTime() {
    if (!user) return
    setSaving(true)
    const now = new Date().toISOString()

    // Calculate duration if wake_time exists
    let sleepDurationMinutes: number | null = null
    if (todayLog?.wake_time) {
      sleepDurationMinutes = differenceInMinutes(new Date(now), new Date(todayLog.wake_time))
    }

    const { data } = await supabase
      .from('sleep_logs')
      .upsert(
        {
          user_id: user.id,
          log_date: todayDate,
          sleep_time: now,
          ...(sleepDurationMinutes !== null ? { sleep_duration_minutes: sleepDurationMinutes } : {}),
        },
        { onConflict: 'user_id,log_date' },
      )
      .select()
      .single()
    if (data) {
      const log = data as SleepLog
      setTodayLog(log)
      setRecentLogs(prev => [log, ...prev.filter(l => l.log_date !== todayDate)])
    }
    setSaving(false)
  }

  // ── Derived stats ───────────────────────────────────────────────────────────

  /** Average wake hour (0-23) over the last 14 days. null if no data. */
  const avgWakeHour: number | null = (() => {
    const logs = recentLogs.filter(l => l.wake_time)
    if (!logs.length) return null
    const totalMins = logs.reduce((sum, l) => {
      const d = new Date(l.wake_time!)
      return sum + d.getHours() * 60 + d.getMinutes()
    }, 0)
    return Math.floor(totalMins / logs.length / 60)
  })()

  /** Average wake time as a formatted string, e.g. "7:15 AM". null if no data. */
  const avgWakeLabel: string | null = (() => {
    const logs = recentLogs.filter(l => l.wake_time)
    if (!logs.length) return null
    const totalMins = logs.reduce((sum, l) => {
      const d = new Date(l.wake_time!)
      return sum + d.getHours() * 60 + d.getMinutes()
    }, 0)
    const avgMins = Math.round(totalMins / logs.length)
    const h = Math.floor(avgMins / 60)
    const m = avgMins % 60
    const ampm = h < 12 ? 'AM' : 'PM'
    const hh   = h % 12 === 0 ? 12 : h % 12
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
  })()

  /** Average sleep duration in minutes. null if no data. */
  const avgSleepMinutes: number | null = (() => {
    const logs = recentLogs.filter(l => l.sleep_duration_minutes !== null)
    if (!logs.length) return null
    return Math.round(
      logs.reduce((s, l) => s + (l.sleep_duration_minutes ?? 0), 0) / logs.length,
    )
  })()

  /** How many minutes the user has been awake today (null if no wake log). */
  const awakeMinutesToday: number | null = (() => {
    if (!todayLog?.wake_time) return null
    return differenceInMinutes(new Date(), new Date(todayLog.wake_time))
  })()

  return {
    todayLog,
    recentLogs,
    loading,
    saving,
    logWakeTime,
    logSleepTime,
    avgWakeHour,
    avgWakeLabel,
    avgSleepMinutes,
    awakeMinutesToday,
    refetch: fetch,
  }
}
