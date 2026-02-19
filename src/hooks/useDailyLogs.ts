import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { DailyLog } from '../types'

export function useDailyLogs(fromDateStr: string, toDateStr: string) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', fromDateStr)
      .lte('date', toDateStr)
    setLogs((data ?? []) as DailyLog[])
    setLoading(false)
  }, [user, fromDateStr, toDateStr])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const saveLog = useCallback(async (date: string, wakeTime: string, sleepTime: string) => {
    if (!user) return
    setSaving(true)
    const { data } = await supabase
      .from('daily_logs')
      .upsert(
        { user_id: user.id, date, wake_time: wakeTime, sleep_time: sleepTime },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()
    if (data) {
      setLogs(prev => {
        const idx = prev.findIndex(l => l.date === date)
        if (idx >= 0) { const arr = [...prev]; arr[idx] = data as DailyLog; return arr }
        return [...prev, data as DailyLog]
      })
    }
    setSaving(false)
  }, [user])

  return { logs, loading, saving, saveLog }
}
