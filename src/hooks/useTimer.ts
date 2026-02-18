import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { TimerState, BreakType } from '../types'

const STORAGE_KEY = 'zaker-timer-state'

const DEFAULT_STATE: TimerState = {
  sessionId: null,
  subjectId: null,
  startedAt: null,
  status: 'idle',
  pausedAt: null,
  totalBreakSeconds: 0,
  activeBreakId: null,
  activeBreakType: null,
  breakStartedAt: null,
}

function loadPersistedState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_STATE
}

function persistState(state: TimerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clearPersistedState() {
  localStorage.removeItem(STORAGE_KEY)
}

export function useTimer() {
  const { user } = useAuth()
  const [timerState, setTimerState] = useState<TimerState>(loadPersistedState)
  const [elapsed, setElapsed] = useState(0)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Ref so the interval always sees latest state without re-creating or reading localStorage
  const stateRef = useRef<TimerState>(timerState)
  useEffect(() => { stateRef.current = timerState }, [timerState])

  // ─── Tick — uses ref, no localStorage read every second ───────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const s = stateRef.current

      if (s.status === 'running' && s.startedAt) {
        const total = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000)
        setElapsed(Math.max(0, total - s.totalBreakSeconds))
      }

      if (s.status === 'on_break' && s.breakStartedAt) {
        setBreakElapsed(
          Math.floor((Date.now() - new Date(s.breakStartedAt).getTime()) / 1000)
        )
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, []) // intentionally empty — stateRef keeps the closure current

  // ─── Sync state to storage whenever it changes ────────────────
  const updateState = useCallback((updates: Partial<TimerState>) => {
    setTimerState(prev => {
      const next = { ...prev, ...updates }
      persistState(next)
      return next
    })
  }, [])

  // ─── Start session ───────────────────────────────────────────
  const startSession = useCallback(async (subjectId: string) => {
    if (!user) return
    if (timerState.status !== 'idle') return

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        started_at: now,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    updateState({
      sessionId: data.id,
      subjectId,
      startedAt: now,
      status: 'running',
      pausedAt: null,
      totalBreakSeconds: 0,
      activeBreakId: null,
      activeBreakType: null,
      breakStartedAt: null,
    })
    setElapsed(0)
    setBreakElapsed(0)
  }, [user, timerState.status, updateState])

  // ─── Start break ─────────────────────────────────────────────
  const startBreak = useCallback(async (breakType: BreakType) => {
    if (!user) return
    if (timerState.status !== 'running' || !timerState.sessionId) return

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('breaks')
      .insert({
        session_id: timerState.sessionId,
        user_id: user.id,
        break_type: breakType,
        started_at: now,
      })
      .select()
      .single()

    if (error) throw error

    // Update session status in DB
    await supabase
      .from('sessions')
      .update({ status: 'paused' })
      .eq('id', timerState.sessionId)

    updateState({
      status: 'on_break',
      activeBreakId: data.id,
      activeBreakType: breakType,
      breakStartedAt: now,
    })
    setBreakElapsed(0)
  }, [user, timerState, updateState])

  // ─── End break / Resume ──────────────────────────────────────
  const endBreak = useCallback(async () => {
    if (!user) return
    if (timerState.status !== 'on_break' || !timerState.activeBreakId) return

    const now = new Date().toISOString()
    const breakDuration = timerState.breakStartedAt
      ? Math.floor((Date.now() - new Date(timerState.breakStartedAt).getTime()) / 1000)
      : 0

    // Close break record
    await supabase
      .from('breaks')
      .update({ ended_at: now, duration_seconds: breakDuration })
      .eq('id', timerState.activeBreakId)

    // Resume session in DB
    if (timerState.sessionId) {
      await supabase
        .from('sessions')
        .update({ status: 'active' })
        .eq('id', timerState.sessionId)
    }

    updateState({
      status: 'running',
      activeBreakId: null,
      activeBreakType: null,
      breakStartedAt: null,
      totalBreakSeconds: timerState.totalBreakSeconds + breakDuration,
    })
    setBreakElapsed(0)
  }, [user, timerState, updateState])

  // ─── Stop / Complete session ──────────────────────────────────
  const stopSession = useCallback(async () => {
    if (!user) return
    if (!timerState.sessionId || timerState.status === 'idle') return

    const now = new Date().toISOString()
    let totalBreak = timerState.totalBreakSeconds

    // Close active break if any
    if (timerState.status === 'on_break' && timerState.activeBreakId && timerState.breakStartedAt) {
      const breakDuration = Math.floor(
        (Date.now() - new Date(timerState.breakStartedAt).getTime()) / 1000
      )
      await supabase
        .from('breaks')
        .update({ ended_at: now, duration_seconds: breakDuration })
        .eq('id', timerState.activeBreakId)
      totalBreak += breakDuration
    }

    const totalElapsed = timerState.startedAt
      ? Math.floor((Date.now() - new Date(timerState.startedAt).getTime()) / 1000)
      : 0
    const studySeconds = Math.max(0, totalElapsed - totalBreak)

    // Complete the session
    await supabase
      .from('sessions')
      .update({
        ended_at: now,
        duration_seconds: studySeconds,
        status: 'completed',
      })
      .eq('id', timerState.sessionId)

    updateState(DEFAULT_STATE)
    clearPersistedState()
    setElapsed(0)
    setBreakElapsed(0)
  }, [user, timerState, updateState])

  // ─── Discard (cancel without saving) ────────────────────────
  const discardSession = useCallback(async () => {
    if (!timerState.sessionId) return

    await supabase.from('sessions').delete().eq('id', timerState.sessionId)

    updateState(DEFAULT_STATE)
    clearPersistedState()
    setElapsed(0)
    setBreakElapsed(0)
  }, [timerState, updateState])

  return {
    timerState,
    elapsed,        // net study seconds (excludes breaks)
    breakElapsed,   // current break seconds
    startSession,
    startBreak,
    endBreak,
    stopSession,
    discardSession,
  }
}
