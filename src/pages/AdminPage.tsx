import React, { useEffect, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Users, Clock, Send, Trash2, Megaphone, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Card, StatCard } from '../components/ui/Card'
import { formatHumanDuration } from '../utils/time'

// ─── Change this to your admin email ──────────────────────────────────────────
const ADMIN_EMAIL = 'mariamislam.stem26@gmail.com'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminMessage {
  id: string
  created_at: string
  title: string
  content: string
  target_user_id: string | null
  is_active: boolean
}

interface UserRow {
  id: string
  username: string
  full_name: string | null
}

interface UserStudyStat {
  user_id: string
  username: string
  full_name: string | null
  total_seconds: number
  session_count: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { user } = useAuth()

  // Guard: only admin can view this page
  if (user?.email !== ADMIN_EMAIL) return <Navigate to="/" replace />

  return <AdminDashboard />
}

function AdminDashboard() {
  const { user } = useAuth()

  // ── Stats ────────────────────────────────────────────────────────────────
  const [userCount,    setUserCount]    = useState<number | null>(null)
  const [totalHours,   setTotalHours]   = useState<number | null>(null)
  const [userStats,    setUserStats]    = useState<UserStudyStat[]>([])
  const [rpcAvailable, setRpcAvailable] = useState(true)

  // ── Message composer ─────────────────────────────────────────────────────
  const [title, setTitle]         = useState('')
  const [content, setContent]     = useState('')
  const [broadcastMode, setBroadcastMode] = useState(true)
  const [targetUser, setTargetUser]       = useState<string>('')
  const [sending, setSending]             = useState(false)
  const [sendError, setSendError]         = useState<string | null>(null)

  // ── Existing messages ─────────────────────────────────────────────────────
  const [messages, setMessages]   = useState<AdminMessage[]>([])
  const [users, setUsers]         = useState<UserRow[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)

    const [profilesRes, messagesRes, usersRes, totalRes, userStatsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('admin_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, username, full_name').order('username'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc('admin_get_total_study_seconds') as Promise<{ data: number | null; error: unknown }>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc('admin_get_user_study_stats')    as Promise<{ data: UserStudyStat[] | null; error: unknown }>,
    ])

    setUserCount(profilesRes.count ?? 0)
    setMessages((messagesRes.data ?? []) as AdminMessage[])
    setUsers((usersRes.data ?? []) as UserRow[])

    if (totalRes.error || userStatsRes.error) {
      // RPC not created yet — fall back to own-user sessions with a warning
      setRpcAvailable(false)
      const { data: fallback } = await supabase.from('sessions').select('duration_seconds').eq('status', 'completed')
      setTotalHours((fallback ?? []).reduce((s, r) => s + (r.duration_seconds ?? 0), 0))
      setUserStats([])
    } else {
      setRpcAvailable(true)
      setTotalHours(totalRes.data ?? 0)
      setUserStats(userStatsRes.data ?? [])
    }

    setLoadingStats(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  async function handleSend() {
    if (!title.trim() || !content.trim()) return
    if (!broadcastMode && !targetUser) { setSendError('Select a user'); return }
    setSending(true)
    setSendError(null)
    const { error } = await supabase.from('admin_messages').insert({
      title:          title.trim(),
      content:        content.trim(),
      target_user_id: broadcastMode ? null : targetUser,
      is_active:      true,
      created_by:     user!.id,
    })
    if (error) { setSendError(error.message); setSending(false); return }
    setTitle('')
    setContent('')
    setTargetUser('')
    setSending(false)
    await fetchStats()
  }

  async function handleDeactivate(id: string) {
    await supabase.from('admin_messages').update({ is_active: false }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_active: false } : m))
  }

  async function handleDelete(id: string) {
    await supabase.from('admin_messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Admin Panel</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Zaker app management dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Total Users"
          value={loadingStats ? '…' : String(userCount ?? 0)}
          sub="registered accounts"
          icon={<Users size={18} />}
        />
        <StatCard
          label="Total Study Time"
          value={loadingStats ? '…' : formatHumanDuration(totalHours ?? 0)}
          sub={rpcAvailable ? 'across all users' : 'your data only — run SQL first'}
          icon={<Clock size={18} />}
        />
      </div>

      {/* RPC missing warning */}
      {!loadingStats && !rpcAvailable && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
          <p className="font-semibold mb-1">⚠️ Admin RPC functions not found</p>
          <p className="text-xs">Run <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">supabase/admin_stats.sql</code> in your Supabase SQL editor to see stats for all users.</p>
        </div>
      )}

      {/* Per-user study breakdown */}
      {!loadingStats && userStats.length > 0 && (
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-4">
            Study Time by User
          </h2>
          <div className="space-y-2">
            {userStats.map((u, idx) => {
              const pct = (totalHours ?? 0) > 0 ? (u.total_seconds / (totalHours ?? 1)) * 100 : 0
              return (
                <div key={u.user_id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-400 w-5 text-right">#{idx + 1}</span>
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{u.username}</span>
                      {u.full_name && <span className="text-xs text-zinc-400">{u.full_name}</span>}
                      <span className="text-xs text-zinc-400">{u.session_count} session{u.session_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                        {formatHumanDuration(u.total_seconds)}
                      </span>
                      <span className="text-xs text-zinc-400 ml-2">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Message Composer */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-4">
          Send Message
        </h2>

        {/* Broadcast / Targeted toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setBroadcastMode(true)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              broadcastMode
                ? 'bg-primary-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            ].join(' ')}
          >
            <Megaphone size={15} /> Broadcast
          </button>
          <button
            onClick={() => setBroadcastMode(false)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              !broadcastMode
                ? 'bg-primary-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            ].join(' ')}
          >
            <User size={15} /> Targeted
          </button>
        </div>

        {/* Target user picker */}
        {!broadcastMode && (
          <select
            value={targetUser}
            onChange={e => setTargetUser(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.username}{u.full_name ? ` — ${u.full_name}` : ''}
              </option>
            ))}
          </select>
        )}

        {/* Title */}
        <input
          type="text"
          placeholder="Message title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />

        {/* Content */}
        <textarea
          rows={4}
          placeholder="Message content..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />

        {sendError && (
          <p className="mb-3 text-xs text-red-500">{sendError}</p>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !content.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          <Send size={15} />
          {sending ? 'Sending...' : 'Send Message'}
        </button>
      </Card>

      {/* Existing messages */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-4">
          Existing Messages ({messages.length})
        </h2>

        {messages.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map(m => {
              const targetName = m.target_user_id
                ? (users.find(u => u.id === m.target_user_id)?.username ?? m.target_user_id.slice(0, 8))
                : 'Broadcast'
              return (
                <div
                  key={m.id}
                  className={[
                    'flex items-start justify-between gap-3 p-3 rounded-lg border',
                    m.is_active
                      ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'
                      : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-50',
                  ].join(' ')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {m.target_user_id ? <User size={11} className="inline mr-0.5" /> : <Megaphone size={11} className="inline mr-0.5" />}
                        {targetName}
                      </span>
                      {!m.is_active && (
                        <span className="text-xs text-zinc-400">(inactive)</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{m.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{m.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {m.is_active && (
                      <button
                        onClick={() => handleDeactivate(m.id)}
                        title="Disable"
                        className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
                      >
                        <Megaphone size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      title="Delete"
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
