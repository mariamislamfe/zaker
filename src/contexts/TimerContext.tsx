import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { TimerState, BreakType } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimerContextValue {
  timerState: TimerState
  elapsed: number
  breakElapsed: number
  startSession: (subjectId: string) => Promise<void>
  startBreak: (type: BreakType) => Promise<void>
  endBreak: () => Promise<void>
  stopSession: () => Promise<void>
  discardSession: () => Promise<void>
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined)

// ─── Persistence helpers ──────────────────────────────────────────────────────

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

function loadState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_STATE
}

function save(state: TimerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clear() {
  localStorage.removeItem(STORAGE_KEY)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [timerState, setTimerState] = useState<TimerState>(loadState)
  const [elapsed, setElapsed] = useState(0)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const stateRef = useRef<TimerState>(timerState)

  // Keep ref in sync for use in the interval
  useEffect(() => { stateRef.current = timerState }, [timerState])

  // ─── 1-second tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
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
    return () => clearInterval(id)
  }, []) // intentionally empty — stateRef keeps it current

  const update = useCallback((updates: Partial<TimerState>) => {
    setTimerState(prev => {
      const next = { ...prev, ...updates }
      save(next)
      return next
    })
  }, [])

  // ─── Start ─────────────────────────────────────────────────────────────────
  const startSession = useCallback(async (subjectId: string) => {
    if (!user || stateRef.current.status !== 'idle') return
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, subject_id: subjectId, started_at: now, status: 'active' })
      .select().single()
    if (error) throw error
    update({ sessionId: data.id, subjectId, startedAt: now, status: 'running',
             pausedAt: null, totalBreakSeconds: 0, activeBreakId: null,
             activeBreakType: null, breakStartedAt: null })
    setElapsed(0); setBreakElapsed(0)
  }, [user, update])

  // ─── Break ─────────────────────────────────────────────────────────────────
  const startBreak = useCallback(async (breakType: BreakType) => {
    const s = stateRef.current
    if (!user || s.status !== 'running' || !s.sessionId) return
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('breaks')
      .insert({ session_id: s.sessionId, user_id: user.id, break_type: breakType, started_at: now })
      .select().single()
    if (error) throw error
    await supabase.from('sessions').update({ status: 'paused' }).eq('id', s.sessionId)
    update({ status: 'on_break', activeBreakId: data.id, activeBreakType: breakType, breakStartedAt: now })
    setBreakElapsed(0)
  }, [user, update])

  const endBreak = useCallback(async () => {
    const s = stateRef.current
    if (!user || s.status !== 'on_break' || !s.activeBreakId) return
    const now = new Date().toISOString()
    const breakDuration = s.breakStartedAt
      ? Math.floor((Date.now() - new Date(s.breakStartedAt).getTime()) / 1000) : 0
    await supabase.from('breaks')
      .update({ ended_at: now, duration_seconds: breakDuration }).eq('id', s.activeBreakId)
    if (s.sessionId)
      await supabase.from('sessions').update({ status: 'active' }).eq('id', s.sessionId)
    update({ status: 'running', activeBreakId: null, activeBreakType: null,
             breakStartedAt: null, totalBreakSeconds: s.totalBreakSeconds + breakDuration })
    setBreakElapsed(0)
  }, [user, update])

  // ─── Stop ──────────────────────────────────────────────────────────────────
  const stopSession = useCallback(async () => {
    const s = stateRef.current
    if (!user || !s.sessionId || s.status === 'idle') return
    const now = new Date().toISOString()
    let totalBreak = s.totalBreakSeconds

    if (s.status === 'on_break' && s.activeBreakId && s.breakStartedAt) {
      const bd = Math.floor((Date.now() - new Date(s.breakStartedAt).getTime()) / 1000)
      await supabase.from('breaks').update({ ended_at: now, duration_seconds: bd }).eq('id', s.activeBreakId)
      totalBreak += bd
    }

    const totalElapsed = s.startedAt
      ? Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000) : 0
    const studySeconds = Math.max(0, totalElapsed - totalBreak)

    await supabase.from('sessions')
      .update({ ended_at: now, duration_seconds: studySeconds, status: 'completed' })
      .eq('id', s.sessionId)

    update(DEFAULT_STATE); clear(); setElapsed(0); setBreakElapsed(0)
  }, [user, update])

  // ─── Discard ───────────────────────────────────────────────────────────────
  const discardSession = useCallback(async () => {
    const s = stateRef.current
    if (!s.sessionId) return
    await supabase.from('sessions').delete().eq('id', s.sessionId)
    update(DEFAULT_STATE); clear(); setElapsed(0); setBreakElapsed(0)
  }, [update])

  return (
    <TimerContext.Provider value={{
      timerState, elapsed, breakElapsed,
      startSession, startBreak, endBreak, stopSession, discardSession,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTimerContext() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimerContext must be used within TimerProvider')
  return ctx
}
