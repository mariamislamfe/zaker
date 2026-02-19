import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { PracticeSession } from '../types'

export function usePractice() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setSessions((data ?? []) as PracticeSession[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const saveSession = useCallback(async (params: {
    mode: 'stopwatch' | 'timer'
    subject: string | null
    targetSeconds: number
    actualSeconds: number
    grades: number[]
  }) => {
    if (!user) return null
    const { mode, subject, targetSeconds, actualSeconds, grades } = params
    const passageCount = grades.length
    const averageGrade = passageCount > 0
      ? Math.round(grades.reduce((s, g) => s + g, 0) / passageCount)
      : null

    const { data: session, error } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        mode,
        subject: subject ?? null,
        target_seconds: targetSeconds,
        actual_seconds: actualSeconds,
        passage_count: passageCount,
        average_grade: averageGrade,
      })
      .select()
      .single()

    if (error || !session) return null

    if (grades.length > 0) {
      await supabase.from('practice_passages').insert(
        grades.map((grade, i) => ({
          practice_session_id: session.id,
          position: i + 1,
          grade,
        }))
      )
    }

    await fetchSessions()
    return session as PracticeSession
  }, [user, fetchSessions])

  // Fetch passages (grades) for a specific session
  const getPassages = useCallback(async (sessionId: string): Promise<number[]> => {
    const { data } = await supabase
      .from('practice_passages')
      .select('grade')
      .eq('practice_session_id', sessionId)
      .order('position')
    return (data ?? []).map((p: { grade: number }) => p.grade)
  }, [])

  // Update an existing session's passages + recalculate averages
  const updateSession = useCallback(async (
    sessionId: string,
    grades: number[],
    subject?: string | null,
  ) => {
    if (!user) return

    // Replace passages
    await supabase.from('practice_passages').delete().eq('practice_session_id', sessionId)

    if (grades.length > 0) {
      await supabase.from('practice_passages').insert(
        grades.map((grade, i) => ({
          practice_session_id: sessionId,
          position: i + 1,
          grade,
        }))
      )
    }

    const passageCount = grades.length
    const averageGrade = passageCount > 0
      ? Math.round(grades.reduce((s, g) => s + g, 0) / passageCount)
      : null

    const updatePayload: Record<string, unknown> = { passage_count: passageCount, average_grade: averageGrade }
    if (subject !== undefined) updatePayload.subject = subject

    await supabase.from('practice_sessions').update(updatePayload).eq('id', sessionId)
    await fetchSessions()
  }, [user, fetchSessions])

  return { sessions, loading, saveSession, updateSession, getPassages, refetch: fetchSessions }
}
