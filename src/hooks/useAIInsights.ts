import { useState, useEffect, useCallback } from 'react'
import { supabase }        from '../lib/supabase'
import { useAuth }         from '../contexts/AuthContext'
import { saveAIInsights, calculateScores, analyzeBehavior } from '../services/aiEngine'
import type { AIInsight }  from '../types'
import type { BehaviorScores, BehaviorProfile } from '../services/aiEngine'

export function useAIInsights() {
  const { user } = useAuth()
  const [insights,   setInsights]   = useState<AIInsight[]>([])
  const [scores,     setScores]     = useState<BehaviorScores | null>(null)
  const [profile,    setProfile]    = useState<BehaviorProfile | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // ── Fetch insights from DB ────────────────────────────────────────────────
  const fetchInsights = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    setInsights((data ?? []) as AIInsight[])
    setLoading(false)
  }, [user])

  // ── Fetch scores + profile ────────────────────────────────────────────────
  const fetchScores = useCallback(async () => {
    if (!user) return
    const [s, p] = await Promise.all([
      calculateScores(user.id),
      analyzeBehavior(user.id, 7),
    ])
    setScores(s)
    setProfile(p)
  }, [user])

  useEffect(() => {
    fetchInsights()
    fetchScores()
  }, [fetchInsights, fetchScores])

  // ── Regenerate insights (calls AI engine) ─────────────────────────────────
  const refresh = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    setError(null)
    try {
      await saveAIInsights(user.id)
      await Promise.all([fetchInsights(), fetchScores()])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh insights')
    } finally {
      setRefreshing(false)
    }
  }, [user, fetchInsights, fetchScores])

  // ── Mark a single insight as read ─────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i))
    await supabase.from('ai_insights').update({ is_read: true }).eq('id', id)
  }, [])

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!user) return
    setInsights(prev => prev.map(i => ({ ...i, is_read: true })))
    await supabase.from('ai_insights').update({ is_read: true }).eq('user_id', user.id)
  }, [user])

  const unreadCount = insights.filter(i => !i.is_read).length

  return {
    insights, scores, profile,
    loading, refreshing, error,
    unreadCount,
    markRead, markAllRead, refresh,
    refetch: fetchInsights,
  }
}
