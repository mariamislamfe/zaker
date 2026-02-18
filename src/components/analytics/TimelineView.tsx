import React, { useState } from 'react'
import type { TimelineBlock } from '../../types'
import { formatDuration } from '../../utils/time'

interface TimelineViewProps {
  blocks: TimelineBlock[]
  date: Date
}

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0..23
const MINUTES_IN_DAY = 1440

export function TimelineView({ blocks, date }: TimelineViewProps) {
  const [tooltip, setTooltip] = useState<{
    block: TimelineBlock
    x: number
    y: number
  } | null>(null)

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  if (blocks.length === 0) {
    return (
      <div className="py-12 text-center">
        <span className="text-4xl">📅</span>
        <p className="mt-3 text-sm text-zinc-400">No sessions recorded for {dateStr}.</p>
      </div>
    )
  }

  return (
    <div className="relative select-none overflow-x-auto">
      <p className="text-xs text-zinc-400 mb-3">{dateStr}</p>

      {/* Hour grid */}
      <div className="flex h-14 min-w-[600px]">
        {/* Time labels */}
        <div className="flex shrink-0 w-12 flex-col justify-between text-xs text-zinc-300 dark:text-zinc-700">
          {[0, 6, 12, 18, 24].map(h => (
            <span key={h} style={{ marginTop: h === 0 ? 0 : 'auto' }}>
              {h === 24 ? '' : `${String(h).padStart(2, '0')}:00`}
            </span>
          ))}
        </div>

        {/* Timeline track */}
        <div className="relative flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
          {/* Hour tick marks */}
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute top-0 bottom-0 border-l border-zinc-200 dark:border-zinc-700"
              style={{ left: `${(h / 24) * 100}%` }}
            />
          ))}

          {/* Session blocks */}
          {blocks.map(block => {
            const leftPct = (block.start_minutes / MINUTES_IN_DAY) * 100
            const widthPct = (block.duration_minutes / MINUTES_IN_DAY) * 100
            return (
              <div
                key={block.session_id}
                className="absolute top-2 bottom-2 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
                style={{
                  left: `${leftPct}%`,
                  width: `${Math.max(widthPct, 0.5)}%`,
                  backgroundColor: block.subject_color,
                }}
                onMouseEnter={e => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect()
                  setTooltip({ block, x: rect.left, y: rect.bottom })
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          })}
        </div>
      </div>

      {/* Hour labels row */}
      <div className="flex mt-1 ml-12 min-w-[588px]">
        {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
          <div key={h} className="flex-1 text-xs text-zinc-400" style={{ textAlign: 'left' }}>
            {`${String(h).padStart(2, '0')}:00`}
          </div>
        ))}
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg shadow-lg bg-zinc-900 text-white text-xs space-y-0.5"
          style={{ left: tooltip.x, top: tooltip.y + 8 }}
        >
          <p className="font-semibold">{tooltip.block.subject_name}</p>
          <p>
            Start: {Math.floor(tooltip.block.start_minutes / 60).toString().padStart(2, '0')}:
            {(tooltip.block.start_minutes % 60).toString().padStart(2, '0')}
          </p>
          <p>Duration: {formatDuration(tooltip.block.duration_minutes * 60)}</p>
        </div>
      )}
    </div>
  )
}
