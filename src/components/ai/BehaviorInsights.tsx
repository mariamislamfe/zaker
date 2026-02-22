import React, { useState, useCallback } from 'react'
import { Brain, RefreshCw, Loader2, BarChart3 } from 'lucide-react'
import { getBehaviorInsights, type BehaviorData } from '../../services/aiAnalytics'
import { useAuth } from '../../contexts/AuthContext'

// ─── Insight tile ─────────────────────────────────────────────────────────────

const COLOR_MAP = {
  green:  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-100 dark:border-emerald-900' },
  yellow: { bg: 'bg-amber-50 dark:bg-amber-950/30',     text: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-100 dark:border-amber-900'   },
  red:    { bg: 'bg-red-50 dark:bg-red-950/30',         text: 'text-red-700 dark:text-red-300',         border: 'border-red-100 dark:border-red-900'       },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30',       text: 'text-blue-700 dark:text-blue-300',       border: 'border-blue-100 dark:border-blue-900'     },
}

// ─── Main component ────────────────────────────────────────────────────────────

export function BehaviorInsights() {
  const { user }  = useAuth()
  const [data,    setData]    = useState<BehaviorData | null>(null)
  const [loading, setLoading] = useState(false)
  const [ran,     setRan]     = useState(false)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const d = await getBehaviorInsights(user.id)
      setData(d)
      setRan(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  if (!ran && !loading) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Brain size={16} className="text-violet-500" /> Study Behavior Analysis
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Analyzes your study patterns over the last 30 days</p>
        </div>
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
            <BarChart3 size={28} className="text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Discover your study patterns</p>
            <p className="text-xs text-zinc-400 mt-1">Best day, worst day, sleep impact, and more</p>
          </div>
          <button
            onClick={fetch}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            <Brain size={14} />
            Analyze My Behavior
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-8 flex flex-col items-center gap-3 shadow-sm">
        <Loader2 size={28} className="text-violet-500 animate-spin" />
        <p className="text-sm text-zinc-500">K2-Think analyzing your behavior...</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-700">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Behavior Analysis</h3>
          <p className="text-xs text-zinc-400">Last 30 days</p>
        </div>
        <button onClick={fetch} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">

        {!data.hasEnoughData ? (
          <div className="text-center py-4">
            <p className="text-sm text-zinc-500">Need more data — start logging your daily tasks!</p>
          </div>
        ) : (
          <>
            {/* Insight tiles grid */}
            <div className="grid grid-cols-2 gap-2">
              {data.insights.map((insight, i) => {
                const c = COLOR_MAP[insight.color]
                return (
                  <div key={i} className={`p-3 rounded-xl border ${c.bg} ${c.border}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base leading-none">{insight.icon}</span>
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{insight.label}</span>
                    </div>
                    <p className={`text-sm font-bold leading-tight ${c.text}`}>{insight.value}</p>
                  </div>
                )
              })}
            </div>

            {/* AI narrative */}
            <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-primary-50 dark:from-violet-950/30 dark:to-primary-950/30 border border-violet-100 dark:border-violet-900">
              <div className="flex items-start gap-2">
                <Brain size={14} className="text-violet-500 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{data.aiNarrative}</p>
              </div>
            </div>

            {/* Streak badge */}
            {data.studyStreak >= 2 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
                <span className="text-lg">🔥</span>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {data.studyStreak} days in a row — keep it up!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
