import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CalendarEvent } from '../types'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

// Shared mutations: optimistic local update, then the write.
function useEventActions(setEvents: Dispatch<SetStateAction<CalendarEvent[]>>) {
  const toggleDone = useCallback(async (id: string, done: boolean) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, done } : e))
    await supabase.from('calendar_events').update({ done }).eq('id', id)
  }, [setEvents])

  const deleteEvent = useCallback(async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    await supabase.from('calendar_events').delete().eq('id', id)
  }, [setEvents])

  return { toggleDone, deleteEvent }
}

// Events in [from, to] ('yyyy-MM-dd', inclusive) — used by the calendar grid.
export function useCalendarEvents(from: string, to: string) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('event_date', from)
      .lte('event_date', to)
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return
        setError(err ? err.message : null)
        setEvents((data ?? []) as CalendarEvent[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, from, to])

  const addEvent = useCallback(async (title: string, date: string, remindDaysBefore: number) => {
    if (!user) return
    const { data, error: err } = await supabase
      .from('calendar_events')
      .insert({ user_id: user.id, title, event_date: date, remind_days_before: remindDaysBefore })
      .select()
      .single()
    if (err) throw err
    if (data && date >= from && date <= to) setEvents(prev => [...prev, data as CalendarEvent])
  }, [user, from, to])

  return { events, loading, error, addEvent, ...useEventActions(setEvents) }
}

export interface Reminder extends CalendarEvent {
  daysLeft: number   // 0 = today, negative = overdue
}

// Not-done events whose reminder window has started (including overdue ones).
export function useReminders() {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    // remind_days_before is at most 30, so nothing further out can be due yet.
    supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('done', false)
      .lte('event_date', ymd(addDays(new Date(), 30)))
      .order('event_date', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setEvents((data ?? []) as CalendarEvent[])
      })
    return () => { cancelled = true }
  }, [user])

  const today = new Date()
  const reminders: Reminder[] = events
    .map(e => ({ ...e, daysLeft: differenceInCalendarDays(parseISO(e.event_date), today) }))
    .filter(e => !e.done && e.daysLeft <= e.remind_days_before)

  return { reminders, ...useEventActions(setEvents) }
}
