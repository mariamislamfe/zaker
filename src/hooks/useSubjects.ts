import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Subject, SubjectFormData } from '../types'

export function useSubjects() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubjects = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setSubjects((data ?? []) as Subject[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const addSubject = useCallback(async (form: SubjectFormData): Promise<Subject> => {
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('subjects')
      .insert({ ...form, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    const subject = data as Subject
    setSubjects(prev => [...prev, subject])
    return subject
  }, [user])

  const updateSubject = useCallback(async (id: string, form: Partial<SubjectFormData>) => {
    const { data, error } = await supabase
      .from('subjects')
      .update(form)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setSubjects(prev => prev.map(s => (s.id === id ? (data as Subject) : s)))
  }, [])

  const deleteSubject = useCallback(async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) throw error
    setSubjects(prev => prev.filter(s => s.id !== id))
  }, [])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await updateSubject(id, { is_active: isActive } as Partial<SubjectFormData>)
  }, [updateSubject])

  return { subjects, loading, error, fetchSubjects, addSubject, updateSubject, deleteSubject, toggleActive }
}
