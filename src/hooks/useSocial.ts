import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Group, GroupMember, LeaderboardEntry } from '../types'

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

    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (groupErr) throw new Error('Invalid invite code')

    const { error: joinErr } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'member',
    })

    if (joinErr && !joinErr.message.includes('duplicate')) throw joinErr

    setGroups(prev => {
      if (prev.find(g => g.id === group.id)) return prev
      return [...prev, group as Group]
    })
    return group as Group
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

export function useLeaderboard(groupId?: string, daysBack = 7) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      let data: Record<string, unknown>[] = []

      if (groupId) {
        const { data: rows } = await supabase.rpc('get_group_leaderboard', {
          p_group_id: groupId,
          days_back: daysBack,
        })
        data = rows ?? []
      } else {
        const { data: rows } = await supabase.rpc('get_leaderboard', { days_back: daysBack })
        data = rows ?? []
      }

      setEntries(
        data.map((row, i) => ({
          user_id: row.user_id as string,
          username: row.username as string,
          full_name: row.full_name as string | null,
          avatar_url: row.avatar_url as string | null,
          total_seconds: Number(row.total_seconds),
          rank: i + 1,
        }))
      )
      setLoading(false)
    }

    fetch()
  }, [groupId, daysBack])

  return { entries, loading }
}
