import React from 'react'
import { formatDuration } from '../../utils/time'

interface TimerDisplayProps {
  elapsed: number
  breakElapsed: number
  status: 'idle' | 'running' | 'on_break'
  subjectName?: string
  subjectColor?: string
  compact?: boolean
}

export function TimerDisplay({
  elapsed,
  breakElapsed,
  status,
  subjectName,
  subjectColor,
  compact = false,
}: TimerDisplayProps) {
  const isBreak = status === 'on_break'
  const isRunning = status === 'running'
  const color = subjectColor ?? '#6366f1'
  const displayTime = formatDuration(isBreak ? breakElapsed : elapsed)

  // ─── Compact mode (floating widget) ─────────────────────────
  if (compact) {
    return (
      <div className="flex flex-col items-center select-none">
        <span
          className="text-3xl font-bold font-mono tabular-nums leading-none"
          style={{ color: isBreak ? '#f97316' : color }}
        >
          {displayTime}
        </span>
        <span
          className={[
            'mt-1 text-[10px] font-semibold uppercase tracking-widest',
            isBreak ? 'text-orange-400' : isRunning ? 'text-emerald-400' : 'text-zinc-400',
          ].join(' ')}
        >
          {isBreak ? 'Break' : isRunning ? 'Studying' : 'Idle'}
        </span>
      </div>
    )
  }

  // ─── Full display ────────────────────────────────────────────
  // Circle: w-56 h-56 = 224px
  // "00:00:00" at text-4xl (2.25rem): 8 chars × ~22px ≈ 176px → fits inside 224px safely
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 select-none">
      {subjectName && (
        <div className="flex items-center gap-2 mb-5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{subjectName}</span>
        </div>
      )}

      <div className="relative flex items-center justify-center">
        {/* Soft glow — no animate-ping to reduce CPU */}
        {isRunning && (
          <span
            className="absolute rounded-full blur-2xl opacity-10 w-full h-full pointer-events-none"
            style={{ backgroundColor: color }}
          />
        )}

        <div
          className="w-56 h-56 rounded-full border-4 flex flex-col items-center justify-center transition-colors duration-300"
          style={{
            borderColor: isBreak ? '#f97316' : color,
            boxShadow: isRunning ? `0 0 28px ${color}22` : 'none',
          }}
        >
          {/* px-3 gives inner breathing room so digits never clip the border */}
          <span className="text-4xl font-bold font-mono tabular-nums leading-none text-zinc-900 dark:text-zinc-100 px-3 text-center">
            {displayTime}
          </span>

          <span
            className={[
              'mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]',
              isBreak ? 'text-orange-500' : isRunning ? 'text-emerald-500' : 'text-zinc-400',
            ].join(' ')}
          >
            {isBreak ? 'On Break' : isRunning ? 'Studying' : 'Idle'}
          </span>
        </div>
      </div>

      {isBreak && (
        <p className="mt-5 text-sm text-zinc-400">
          Study time so far:{' '}
          <span className="font-mono font-semibold text-zinc-600 dark:text-zinc-300">
            {formatDuration(elapsed)}
          </span>
        </p>
      )}
    </div>
  )
}
