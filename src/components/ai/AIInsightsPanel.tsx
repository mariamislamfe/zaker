import React from 'react'
import { Lightbulb, AlertTriangle, Trophy, BarChart2, RefreshCw, CheckCheck } from 'lucide-react'
import type { AIInsight } from '../../types'

// ─── Icon + color config per type ─────────────────────────────────────────────

const TYPE_CONFIG = {
  recommendation: {
    Icon:   Lightbulb,
    bg:     'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    iconCl: 'text-blue-500',
    badge:  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    label:  'Tip',
  },
  warning: {
    Icon:   AlertTriangle,
    bg:     'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    iconCl: 'text-amber-500',
    badge:  'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    label:  'Alert',
  },
  achievement: {
    Icon:   Trophy,
    bg:     'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconCl: 'text-emerald-500',
    badge:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    label:  'Achievement',
  },
  pattern: {
    Icon:   BarChart2,
    bg:     'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    iconCl: 'text-purple-500',
    badge:  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    label:  'Pattern',
  },
} as const

// ─── Single insight card ──────────────────────────────────────────────────────

function InsightCard({
  insight,
  onMarkRead,
}: {
  insight:    AIInsight
  onMarkRead: (id: string) => void
}) {
  const cfg = TYPE_CONFIG[insight.insight_type] ?? TYPE_CONFIG.recommendation
  const { Icon } = cfg

  return (
    <div className={[
      'rounded-xl border p-4 transition-all',
      cfg.bg, cfg.border,
      insight.is_read ? 'opacity-70' : '',
    ].join(' ')}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${cfg.iconCl}`}>
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">
              {insight.title}
            </h3>
            {!insight.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" title="Unread" />
            )}
          </div>

          {/* Content — respect line breaks */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
            {insight.content}
          </p>
        </div>

        {/* Mark read button */}
        {!insight.is_read && (
          <button
            onClick={() => onMarkRead(insight.id)}
            className="shrink-0 p-1.5 rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
            title="Mark as read"
          >
            <CheckCheck size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  insights:    AIInsight[]
  loading:     boolean
  refreshing:  boolean
  unreadCount: number
  onMarkRead:  (id: string) => void
  onMarkAll:   () => void
  onRefresh:   () => void
}

export function AIInsightsPanel({
  insights, loading, refreshing, unreadCount,
  onMarkRead, onMarkAll, onRefresh,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            AI Insights
          </span>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-[11px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAll}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Cards */}
      {insights.length === 0 ? (
        <div className="text-center py-10">
          <Lightbulb size={32} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">No insights yet</p>
          <p className="text-xs text-zinc-400 mb-4">Click Refresh to generate personalised insights from your study data.</p>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Generating…' : 'Generate Insights'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} onMarkRead={onMarkRead} />
          ))}
        </div>
      )}
    </div>
  )
}
