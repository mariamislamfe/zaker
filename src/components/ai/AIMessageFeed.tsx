import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import {
  getDailyMessage, getWeeklyMessage, getMonthlyMessage,
  msgCacheKey, type AIMessage,
} from '../../services/aiMessages'
import { useAuth } from '../../contexts/AuthContext'

// ─── Type meta ────────────────────────────────────────────────────────────────

const TYPE_META: Record<AIMessage['type'], { label: string; badge: string; dot: string }> = {
  daily:   { label: 'تحليل يومي',   badge: 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300',   dot: 'bg-primary-500'   },
  weekly:  { label: 'تحليل أسبوعي', badge: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',     dot: 'bg-violet-500'    },
  monthly: { label: 'تحليل شهري',   badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',          dot: 'bg-amber-500'     },
}

// ─── Single message card ──────────────────────────────────────────────────────

function MessageCard({
  type, msg, loading, onRefresh,
}: {
  type: AIMessage['type']
  msg: AIMessage | null
  loading: boolean
  onRefresh: () => void
}) {
  const meta = TYPE_META[type]

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot} shrink-0`} />
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${meta.badge}`}>
            {meta.label}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
        >
          {loading
            ? <Loader2 size={13} className="animate-spin" />
            : <RefreshCw size={13} />
          }
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 size={13} className="animate-spin shrink-0" />
            <span>K2-Think بيحلل...</span>
          </div>
        ) : msg ? (
          <>
            <div className="flex items-start gap-2.5">
              <span className="text-xl leading-none shrink-0 mt-0.5">{msg.icon}</span>
              <p
                className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed flex-1"
                dir="rtl"
              >
                {msg.content}
              </p>
            </div>
            <p className="text-[10px] text-zinc-400 mt-2 text-right">
              {new Date(msg.generatedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-400">جاري التحميل...</p>
        )}
      </div>
    </div>
  )
}

// ─── Main feed ────────────────────────────────────────────────────────────────

export function AIMessageFeed() {
  const { user } = useAuth()

  const [messages, setMessages] = useState<Record<AIMessage['type'], AIMessage | null>>({
    daily: null, weekly: null, monthly: null,
  })
  const [loading, setLoading] = useState<Record<AIMessage['type'], boolean>>({
    daily: false, weekly: false, monthly: false,
  })
  const [initialized, setInitialized] = useState(false)

  const loadMessage = useCallback(async (type: AIMessage['type'], force = false) => {
    if (!user) return

    // Try cache first (unless forced refresh)
    if (!force) {
      const cached = localStorage.getItem(msgCacheKey(type, user.id))
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as AIMessage
          setMessages(prev => ({ ...prev, [type]: parsed }))
          return
        } catch { /* invalid cache, regenerate */ }
      }
    }

    setLoading(prev => ({ ...prev, [type]: true }))
    try {
      const fn = type === 'daily' ? getDailyMessage
               : type === 'weekly' ? getWeeklyMessage
               : getMonthlyMessage
      const msg = await fn(user.id)
      localStorage.setItem(msgCacheKey(type, user.id), JSON.stringify(msg))
      setMessages(prev => ({ ...prev, [type]: msg }))
    } catch { /* silently fail — non-critical */ }
    finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }, [user])

  useEffect(() => {
    if (!user || initialized) return
    setInitialized(true)
    // Load all three in parallel
    loadMessage('daily')
    loadMessage('weekly')
    loadMessage('monthly')
  }, [user, initialized, loadMessage])

  const TYPES: AIMessage['type'][] = ['daily', 'weekly', 'monthly']

  return (
    <div className="space-y-3">
      {TYPES.map(type => (
        <MessageCard
          key={type}
          type={type}
          msg={messages[type]}
          loading={loading[type]}
          onRefresh={() => loadMessage(type, true)}
        />
      ))}
    </div>
  )
}
