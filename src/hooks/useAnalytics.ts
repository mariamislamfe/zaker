import { useState, useEffect, useMemo } from 'react'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { AnalyticsRange, SubjectStats, DailyStats, Session, TimelineBlock } from '../types'

export function useAnalytics(range: AnalyticsRange, referenceDate: Date = new Date()) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<(Session & { subject: { name: string; color: string } })[]>([])
  const [loading, setLoading] = useState(true)

  // Use date string as a stable dep — avoids infinite loop when caller passes `new Date()` inline
  const referenceDateStr = referenceDate.toDateString()

  const { fromIso, toIso } = useMemo(() => {
    const d = new Date(referenceDateStr)
    switch (range) {
      case 'day':
        return { fromIso: startOfDay(d).toISOString(), toIso: endOfDay(d).toISOString() }
      case 'week':
        return { fromIso: startOfWeek(d, { weekStartsOn: 1 }).toISOString(), toIso: endOfWeek(d, { weekStartsOn: 1 }).toISOString() }
      case 'month':
        return { fromIso: startOfMonth(d).toISOString(), toIso: endOfMonth(d).toISOString() }
    }
  }, [range, referenceDateStr])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    function fetchData() {
      setLoading(true)
      supabase
        .from('sessions')
        .select('*, subject:subjects(name, color)')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .gte('started_at', fromIso)
        .lte('started_at', toIso)
        .order('started_at', { ascending: true })
        .then(({ data }) => {
          if (cancelled) return
          setSessions((data ?? []) as unknown as (Session & { subject: { name: string; color: string } })[])
          setLoading(false)
        })
    }

    fetchData()

    // Auto-refresh when any session changes (e.g. after stopping a timer)
    const channel = supabase
      .channel(`analytics-${user.id}-${fromIso}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `user_id=eq.${user.id}`,
      }, fetchData)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user, fromIso, toIso])

  // ─── Aggregate per subject ────────────────────────────────────
  const subjectStats: SubjectStats[] = (() => {
    const map = new Map<string, SubjectStats>()
    for (const s of sessions) {
      const existing = map.get(s.subject_id)
      if (existing) {
        existing.total_seconds += s.duration_seconds
        existing.session_count += 1
      } else {
        map.set(s.subject_id, {
          subject_id: s.subject_id,
          subject_name: s.subject?.name ?? 'Unknown',
          subject_color: s.subject?.color ?? '#6366f1',
          total_seconds: s.duration_seconds,
          session_count: 1,
        })
      }
    }
    return [...map.values()].sort((a, b) => b.total_seconds - a.total_seconds)
  })()

  // ─── Daily breakdown (for bar/stacked charts) ─────────────────
  const dailyStats: DailyStats[] = (() => {
    const map = new Map<string, DailyStats>()
    for (const s of sessions) {
      const day = format(new Date(s.started_at), 'yyyy-MM-dd')
      if (!map.has(day)) {
        map.set(day, { date: day, subjects: [], total_seconds: 0 })
      }
      const entry = map.get(day)!
      const existing = entry.subjects.find(x => x.subject_id === s.subject_id)
      if (existing) {
        existing.total_seconds += s.duration_seconds
        existing.session_count += 1
      } else {
        entry.subjects.push({
          subject_id: s.subject_id,
          subject_name: s.subject?.name ?? 'Unknown',
          subject_color: s.subject?.color ?? '#6366f1',
          total_seconds: s.duration_seconds,
          session_count: 1,
        })
      }
      entry.total_seconds += s.duration_seconds
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
  })()

  // ─── Timeline blocks for a single day ─────────────────────────
  const timelineBlocks: TimelineBlock[] = (() => {
    if (range !== 'day') return []
    return sessions.map(s => {
      const start = new Date(s.started_at)
      const startMinutes = start.getHours() * 60 + start.getMinutes()
      const durationMinutes = Math.round(s.duration_seconds / 60)
      return {
        session_id: s.id,
        subject_id: s.subject_id,
        subject_name: s.subject?.name ?? 'Unknown',
        subject_color: s.subject?.color ?? '#6366f1',
        start_minutes: startMinutes,
        duration_minutes: Math.max(durationMinutes, 5), // min 5 min for visibility
      }
    })
  })()

  const totalSeconds = subjectStats.reduce((sum, s) => sum + s.total_seconds, 0)
  const topSubject = subjectStats[0] ?? null

  // Expose date range strings for consumers (e.g. daily log fetching)
  const fromDateStr = fromIso.substring(0, 10)
  const toDateStr = toIso.substring(0, 10)

  return { sessions, loading, subjectStats, dailyStats, timelineBlocks, totalSeconds, topSubject, fromDateStr, toDateStr }
}
