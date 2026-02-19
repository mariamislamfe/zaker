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

  // Add a top-level Learning Objective (parent_id = null)
  const addLO = useCallback(async (subjectId: string, title: string) => {
    if (!user) return null
    const orderIndex = items.filter(i => i.subject_id === subjectId && i.parent_id === null).length
    const { data, error } = await supabase
      .from('curriculum_items')
      .insert({ user_id: user.id, subject_id: subjectId, parent_id: null, title, order_index: orderIndex })
      .select()
      .single()
    if (error || !data) return null
    const newItem = data as CurriculumItem
    setItems(prev => [...prev, newItem])
    return newItem
  }, [user, items])

  // Add a lesson under an LO (parent_id = LO id)
  const addLesson = useCallback(async (parentId: string, title: string) => {
    if (!user) return null
    const parentLO = items.find(i => i.id === parentId)
    if (!parentLO) return null
    const orderIndex = items.filter(i => i.parent_id === parentId).length
    const { data, error } = await supabase
      .from('curriculum_items')
      .insert({
        user_id: user.id,
        subject_id: parentLO.subject_id,
        parent_id: parentId,
        title,
        order_index: orderIndex,
      })
      .select()
      .single()
    if (error || !data) return null
    const newItem = data as CurriculumItem
    setItems(prev => [...prev, newItem])
    return newItem
  }, [user, items])

  const toggleProgress = useCallback(async (
    id: string,
    field: 'studied' | 'reviewed' | 'solved',
    value: boolean,
  ) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    await supabase.from('curriculum_items').update({ [field]: value }).eq('id', id)
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    // Optimistically remove the item and all its children (lessons of an LO)
    setItems(prev => prev.filter(i => i.id !== id && i.parent_id !== id))
    await supabase.from('curriculum_items').delete().eq('id', id)
    // DB CASCADE handles child deletion
  }, [])

  // Lessons grouped by LO id
  const lessonsByLO = useMemo(() => {
    const map = new Map<string, CurriculumItem[]>()
    for (const item of items) {
      if (item.parent_id) {
        if (!map.has(item.parent_id)) map.set(item.parent_id, [])
        map.get(item.parent_id)!.push(item)
      }
    }
    return map
  }, [items])

  return { items, loading, addLO, addLesson, toggleProgress, deleteItem, lessonsByLO, refetch: fetchItems }
}
