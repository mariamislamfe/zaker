import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { BehaviorScores } from '../../services/aiEngine'

// ─── Circular gauge ────────────────────────────────────────────────────────────

function Gauge({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const r   = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - Math.min(100, Math.max(0, value)) / 100)
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  )
}

// ─── Single metric card ────────────────────────────────────────────────────────

function MetricCard({ label, value, label2, color }: {
  label: string; value: number; label2: string; color: string
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Gauge value={value} color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums" style={{ color }}>{value}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</p>
        <p className="text-[11px] text-zinc-400">{label2}</p>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  scores: BehaviorScores
  compact?: boolean
}

const COLORS = {
  adherence:    '#6366f1',
  productivity: '#10b981',
  focus:        '#f59e0b',
  overall:      '#3b82f6',
}

export function BehaviorScores({ scores, compact = false }: Props) {
  const TrendIcon =
    scores.trend === 'improving' ? TrendingUp  :
    scores.trend === 'declining' ? TrendingDown : Minus

  const trendColor =
    scores.trend === 'improving' ? 'text-emerald-500' :
    scores.trend === 'declining' ? 'text-red-500'     : 'text-zinc-400'

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { key: 'adherence',    label: 'Adherence',    v: scores.adherence    },
          { key: 'productivity', label: 'Productivity', v: scores.productivity },
          { key: 'focus',        label: 'Focus',        v: scores.focus        },
        ].map(({ key, label, v }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[key as keyof typeof COLORS] }} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: COLORS[key as keyof typeof COLORS] }}>{v}%</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Overall score banner */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Overall Score</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-bold tabular-nums" style={{ color: COLORS.overall }}>
              {scores.overall}
            </span>
            <span className="text-sm text-zinc-400">/ 100</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              scores.overall >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' :
              scores.overall >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'  :
                                     'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {scores.labels.overall}
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
          <TrendIcon size={16} />
          <span className="capitalize">{scores.trend}</span>
        </div>
      </div>

      {/* Three metric gauges */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Adherence"    value={scores.adherence}    label2={scores.labels.adherence}    color={COLORS.adherence}    />
        <MetricCard label="Productivity" value={scores.productivity} label2={scores.labels.productivity} color={COLORS.productivity} />
        <MetricCard label="Focus"        value={scores.focus}        label2={scores.labels.focus}        color={COLORS.focus}        />
      </div>

      {/* Mini legend */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Plan adherence',   sub: 'tasks done vs planned' },
          { label: 'Productivity',     sub: 'daily hrs vs 4h target' },
          { label: 'Focus',            sub: 'study vs break ratio'   },
        ].map(({ label, sub }) => (
          <div key={label}>
            <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
            <p className="text-[10px] text-zinc-400">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
