import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CurriculumItem } from '../types'

export function useCurriculum() {
  const { user } = useAuth()
  const [items, setItems] = useState<CurriculumItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('curriculum_items')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
    setItems((data ?? []) as CurriculumItem[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchItems() }, [fetchItems])

  const addItem = useCallback(async (params: {
    subject_name: string
    chapter: string | null
    title: string
  }) => {
    if (!user) return null
    const orderIndex = items.filter(i => i.subject_name === params.subject_name).length
    const { data, error } = await supabase
      .from('curriculum_items')
      .insert({
        user_id: user.id,
        subject_name: params.subject_name,
        chapter: params.chapter || null,
        title: params.title,
        order_index: orderIndex,
      })
      .select()
      .single()
    if (error || !data) return null
    setItems(prev => [...prev, data as CurriculumItem])
    return data as CurriculumItem
  }, [user, items])

  const toggleProgress = useCallback(async (
    id: string,
    field: 'studied' | 'reviewed' | 'solved',
    value: boolean,
  ) => {
    // Optimistic update — no need to wait for server
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    await supabase.from('curriculum_items').update({ [field]: value }).eq('id', id)
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('curriculum_items').delete().eq('id', id)
  }, [])

  // Unique subject names in insertion order
  const subjectNames = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const item of items) {
      if (!seen.has(item.subject_name)) {
        seen.add(item.subject_name)
        result.push(item.subject_name)
      }
    }
    return result
  }, [items])

  return { items, loading, addItem, toggleProgress, deleteItem, subjectNames, refetch: fetchItems }
}
