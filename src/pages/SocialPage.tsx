import React, { useState } from 'react'
import {
  Users, Plus, LogIn, Trophy, Crown, Medal, Copy, Check, Globe, Lock, Eye, EyeOff,
} from 'lucide-react'
import { useGroups, useGroupMembers, useLeaderboard } from '../hooks/useSocial'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { formatHumanDuration } from '../utils/time'
import type { Group, LeaderboardEntry } from '../types'

export function SocialPage() {
  const { user, profile, updateProfile } = useAuth()
  const { groups, loading: groupsLoading, createGroup, joinGroupByCode, leaveGroup } = useGroups()
  const { entries: globalEntries, loading: globalLoading } = useLeaderboard(undefined, 7)

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [tab, setTab] = useState<'groups' | 'global'>('groups')
  const [togglingHide, setTogglingHide] = useState(false)

  const isHidden = profile?.hidden_from_leaderboard ?? false

  async function toggleHide() {
    setTogglingHide(true)
    try { await updateProfile({ hidden_from_leaderboard: !isHidden }) } finally { setTogglingHide(false) }
  }

  // Filter self from display when hidden
  const displayedGlobalEntries = isHidden
    ? globalEntries.filter(e => e.user_id !== user?.id)
    : globalEntries

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Social</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Compete with friends and track global rankings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<LogIn size={15} />} onClick={() => setJoinOpen(true)}>
            Join Group
          </Button>
          <Button icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
            Create Group
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit">
        {(['groups', 'global'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
              tab === t
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
            ].join(' ')}
          >
            {t === 'global' ? '🌍 Global' : '👥 My Groups'}
          </button>
        ))}
      </div>

      {/* Groups tab */}
      {tab === 'groups' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Group list */}
          <div className="lg:col-span-1 space-y-3">
            {groupsLoading ? (
              [1, 2].map(i => (
                <div key={i} className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              ))
            ) : groups.length === 0 ? (
              <Card padding="lg">
                <div className="py-8 text-center">
                  <Users size={32} className="mx-auto text-zinc-300 mb-3" />
                  <p className="text-sm text-zinc-500">You haven't joined any groups yet.</p>
                  <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
                    Create one
                  </Button>
                </div>
              </Card>
            ) : (
              groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={[
                    'w-full text-left p-4 rounded-xl border-2 transition-all',
                    selectedGroup?.id === group.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{group.description}</p>
                      )}
                    </div>
                    {group.is_public ? (
                      <Globe size={14} className="text-zinc-400 shrink-0" />
                    ) : (
                      <Lock size={14} className="text-zinc-400 shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Group leaderboard */}
          <div className="lg:col-span-2">
            {selectedGroup ? (
              <GroupLeaderboard
                group={selectedGroup}
                currentUserId={user?.id ?? ''}
                onLeave={() => { leaveGroup(selectedGroup.id); setSelectedGroup(null) }}
              />
            ) : (
              <Card padding="lg">
                <div className="py-16 text-center text-zinc-400">
                  <Users size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a group to view its leaderboard.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Global leaderboard tab */}
      {tab === 'global' && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Global Leaderboard
              </h2>
              <span className="text-xs text-zinc-400 ml-1">— last 7 days</span>
            </div>
            {/* Hide from leaderboard toggle */}
            <button
              onClick={toggleHide}
              disabled={togglingHide}
              title={isHidden ? 'You are hidden — click to reappear' : 'Click to hide yourself from the leaderboard'}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                isHidden
                  ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700',
              ].join(' ')}
            >
              {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
              {isHidden ? 'Hidden from rank' : 'Hide from rank'}
            </button>
          </div>
          {isHidden && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <EyeOff size={13} />
              You are currently hidden from the global leaderboard.
            </div>
          )}
          {globalLoading ? (
            <LeaderboardSkeleton />
          ) : (
            <LeaderboardTable entries={displayedGlobalEntries} currentUserId={user?.id ?? ''} />
          )}
        </Card>
      )}

      {/* Modals */}
      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createGroup}
      />
      <JoinGroupModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoin={joinGroupByCode}
      />
    </div>
  )
}

// ─── Group Leaderboard ────────────────────────────────────────────────────────

function GroupLeaderboard({
  group, currentUserId, onLeave,
}: {
  group: Group; currentUserId: string; onLeave: () => void
}) {
  const { entries, loading } = useLeaderboard(group.id, 7)
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card padding="lg">
      {/* Group header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{group.name}</h2>
          {group.description && (
            <p className="text-sm text-zinc-500 mt-0.5">{group.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {group.invite_code}
          </button>
          <Button variant="ghost" size="sm" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>

      {loading ? (
        <LeaderboardSkeleton />
      ) : (
        <LeaderboardTable entries={entries} currentUserId={currentUserId} />
      )}
    </Card>
  )
}

// ─── Leaderboard Table ────────────────────────────────────────────────────────

function LeaderboardTable({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-400">No data yet.</p>
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => {
        const isMe = entry.user_id === currentUserId
        const rankIcon =
          entry.rank === 1 ? <Crown size={16} className="text-amber-400" /> :
          entry.rank === 2 ? <Medal size={16} className="text-zinc-400" /> :
          entry.rank === 3 ? <Medal size={16} className="text-amber-600" /> :
          <span className="text-xs font-bold text-zinc-400 font-mono w-4 text-center">#{entry.rank}</span>

        return (
          <div
            key={entry.user_id}
            className={[
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
              isMe
                ? 'bg-primary-50 dark:bg-primary-950 border-2 border-primary-200 dark:border-primary-800'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800',
            ].join(' ')}
          >
            {/* Rank */}
            <div className="w-6 flex items-center justify-center shrink-0">{rankIcon}</div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-semibold text-primary-700 dark:text-primary-300 shrink-0">
              {entry.username?.[0]?.toUpperCase() ?? '?'}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                {entry.username}
                {isMe && <span className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full">You</span>}
              </p>
              {entry.full_name && (
                <p className="text-xs text-zinc-400 truncate">{entry.full_name}</p>
              )}
            </div>

            {/* Time */}
            <span className="text-sm font-semibold font-mono text-zinc-700 dark:text-zinc-300 shrink-0">
              {formatHumanDuration(entry.total_seconds)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      ))}
    </div>
  )
}

// ─── Create Group Modal ───────────────────────────────────────────────────────

function CreateGroupModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, description: string, isPublic: boolean) => Promise<Group>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Group name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      await onCreate(name.trim(), description.trim(), isPublic)
      setName(''); setDescription(''); setIsPublic(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Study Group" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. CS Study Buddies"
          value={name}
          onChange={e => setName(e.target.value)}
          error={error ?? undefined}
        />
        <Textarea
          label="Description (optional)"
          placeholder="What's this group about?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
            className="w-4 h-4 rounded text-primary-600"
          />
          <div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Public group
            </span>
            <p className="text-xs text-zinc-400">Anyone can find and view this group's leaderboard.</p>
          </div>
        </label>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1">Create Group</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Join Group Modal ─────────────────────────────────────────────────────────

function JoinGroupModal({ open, onClose, onJoin }: {
  open: boolean
  onClose: () => void
  onJoin: (code: string) => Promise<Group>
}) {
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setJoining(true)
    setError(null)
    try {
      await onJoin(code.trim())
      setCode('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a Group" maxWidth="sm">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Enter the 8-character invite code shared by your friend.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Invite Code"
          placeholder="e.g. AB12CD34"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          error={error ?? undefined}
          className="font-mono tracking-widest text-center text-lg"
        />
        <div className="flex gap-3">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={joining} className="flex-1">Join Group</Button>
        </div>
      </form>
    </Modal>
  )
}
