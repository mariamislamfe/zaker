import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Group, GroupMember, LeaderboardEntry, UniversityRankEntry } from '../types'

export function useGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGroups = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Fetch groups the user belongs to
    const { data } = await supabase
      .from('group_members')
      .select('group:groups(*)')
      .eq('user_id', user.id)

    const memberGroups = (data ?? []).map((r: Record<string, unknown>) => r.group as Group).filter(Boolean)
    setGroups(memberGroups)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const createGroup = useCallback(async (name: string, description: string, isPublic: boolean): Promise<Group> => {
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('groups')
      .insert({ name, description, created_by: user.id, is_public: isPublic })
      .select()
      .single()

    if (error) throw error
    const group = data as Group

    // Auto-join as admin
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'admin',
    })

    setGroups(prev => [...prev, group])
    return group
  }, [user])

  const joinGroupByCode = useCallback(async (inviteCode: string): Promise<Group> => {
    if (!user) throw new Error('Not authenticated')

    // Use a SECURITY DEFINER RPC so the invite-code lookup bypasses RLS.
    // Direct table SELECT fails for private groups before the user has joined.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('join_group_by_code', {
      p_code: inviteCode.trim().toUpperCase(),
    })

    if (error) throw new Error('Invalid invite code')

    const group = (typeof data === 'string' ? JSON.parse(data) : data) as Group

    setGroups(prev => {
      if (prev.find(g => g.id === group.id)) return prev
      return [...prev, group]
    })
    return group
  }, [user])

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }, [user])

  return { groups, loading, fetchGroups, createGroup, joinGroupByCode, leaveGroup }
}

export function useGroupMembers(groupId: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    supabase
      .from('group_members')
      .select('*, profile:profiles(*)')
      .eq('group_id', groupId)
      .then(({ data }) => {
        setMembers((data ?? []) as unknown as GroupMember[])
        setLoading(false)
      })
  }, [groupId])

  return { members, loading }
}

// RPC rows come back untyped; one mapper keeps the three leaderboards consistent.
function toEntry(row: Record<string, unknown>): LeaderboardEntry {
  return {
    user_id: row.user_id as string,
    display_name: row.display_name as string,
    education_level: (row.education_level as string | null) ?? null,
    hs_track: (row.hs_track as string | null) ?? null,
    university: (row.university as string | null) ?? null,
    faculty: (row.faculty as string | null) ?? null,
    total_seconds: Number(row.total_seconds),
    rank: Number(row.rank),
  }
}

// Fetch helper shared by the ranking hooks: re-runs when `key` changes, ignores stale responses.
function useRpcList<T>(
  key: string,
  call: () => PromiseLike<{ data: unknown; error: unknown }>,
  map: (row: Record<string, unknown>) => T,
) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    call().then(({ data }) => {
      if (cancelled) return
      setRows(((data ?? []) as Record<string, unknown>[]).map(map))
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { rows, loading }
}

export function useGroupLeaderboard(groupId: string, daysBack: number) {
  const { rows, loading } = useRpcList(
    `${groupId}|${daysBack}`,
    () => supabase.rpc('get_group_leaderboard', { p_group_id: groupId, days_back: daysBack }),
    toEntry,
  )
  return { entries: rows, loading }
}

export interface StudentFilter {
  level?: string
  track?: string
  university?: string
  faculty?: string
}

export function useStudentRanking(filter: StudentFilter, daysBack: number) {
  const { rows, loading } = useRpcList(
    `${JSON.stringify(filter)}|${daysBack}`,
    () => supabase.rpc('get_ranked_students', {
      p_days: daysBack,
      p_level: filter.level ?? null,
      p_track: filter.track ?? null,
      p_university: filter.university ?? null,
      p_faculty: filter.faculty ?? null,
    }),
    toEntry,
  )
  return { entries: rows, loading }
}

export function useUniversityRanking(faculty: string | null, daysBack: number) {
  const { rows, loading } = useRpcList<UniversityRankEntry>(
    `${faculty}|${daysBack}`,
    () => supabase.rpc('get_university_ranking', { p_days: daysBack, p_faculty: faculty }),
    row => ({
      university: row.university as string,
      student_count: Number(row.student_count),
      total_seconds: Number(row.total_seconds),
      avg_seconds: Number(row.avg_seconds),
      rank: Number(row.rank),
    }),
  )
  return { entries: rows, loading }
}
