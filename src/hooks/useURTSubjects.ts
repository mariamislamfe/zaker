import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { URTSubject } from '../types'

const DEFAULT_SUBJECTS = [
  { name: 'Math',      color: '#3b82f6' },
  { name: 'Mechanics', color: '#f59e0b' },
  { name: 'English',   color: '#10b981' },
  { name: 'Physics',   color: '#8b5cf6' },
  { name: 'Chemistry', color: '#ef4444' },
]

export function useURTSubjects() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<URTSubject[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubjects = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('urt_subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
    setSubjects((data ?? []) as URTSubject[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  const seedDefaults = useCallback(async () => {
    if (!user) return
    const rows = DEFAULT_SUBJECTS.map((s, i) => ({
      user_id: user.id,
      name: s.name,
      color: s.color,
      order_index: i,
    }))
    const { data } = await supabase
      .from('urt_subjects')
      .insert(rows)
      .select()
    if (data) setSubjects(data as URTSubject[])
  }, [user])

  const addSubject = useCallback(async (name: string, color: string) => {
    if (!user) return null
    const trimmed = name.trim()
    if (!trimmed) return null
    const orderIndex = subjects.length
    const { data, error } = await supabase
      .from('urt_subjects')
      .insert({ user_id: user.id, name: trimmed, color, order_index: orderIndex })
      .select()
      .single()
    if (error || !data) return null
    const newSubject = data as URTSubject
    setSubjects(prev => [...prev, newSubject])
    return newSubject
  }, [user, subjects.length])

  const removeSubject = useCallback(async (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id))
    await supabase.from('urt_subjects').delete().eq('id', id)
  }, [])

  const subjectColor = useCallback((name: string | null): string => {
    if (!name) return '#6366f1'
    return subjects.find(s => s.name === name)?.color ?? '#6366f1'
  }, [subjects])

  return { subjects, loading, addSubject, removeSubject, seedDefaults, subjectColor }
}
