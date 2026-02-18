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
      .limit(50)
    setSessions((data ?? []) as PracticeSession[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const saveSession = useCallback(async (params: {
    mode: 'stopwatch' | 'timer'
    targetSeconds: number
    actualSeconds: number
    grades: number[]
  }) => {
    if (!user) return null
    const { mode, targetSeconds, actualSeconds, grades } = params
    const passageCount = grades.length
    const averageGrade = passageCount > 0
      ? Math.round(grades.reduce((s, g) => s + g, 0) / passageCount)
      : null

    const { data: session, error } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        mode,
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
          user_id: user.id,
          position: i + 1,
          grade,
        }))
      )
    }

    await fetchSessions()
    return session as PracticeSession
  }, [user, fetchSessions])

  return { sessions, loading, saveSession, refetch: fetchSessions }
}
