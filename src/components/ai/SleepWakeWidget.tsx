import React from 'react'
import { Moon, Sun, Clock, Sunrise, BedDouble } from 'lucide-react'
import { useSleepLog } from '../../hooks/useSleepLog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  const ampm = h < 12 ? 'AM' : 'PM'
  const hh   = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  compact?: boolean  // true = single row for dashboard header
}

export function SleepWakeWidget({ compact = false }: Props) {
  const {
    todayLog, loading, saving,
    logWakeTime, logSleepTime,
    avgWakeLabel, avgSleepMinutes, awakeMinutesToday,
  } = useSleepLog()

  const isAwake   = !!todayLog?.wake_time && !todayLog?.sleep_time
  const isAsleep  = !!todayLog?.sleep_time
  const nothingYet = !todayLog?.wake_time

  if (loading) {
    return (
      <div className={compact ? 'h-8 w-48 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse' : 'h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse'} />
    )
  }

  // ── Compact mode (dashboard row) ───────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {nothingYet ? (
          <button
            onClick={logWakeTime}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors disabled:opacity-50"
          >
            <Sunrise size={13} />
            Log Wake Time
          </button>
        ) : isAwake ? (
          <>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <Sun size={13} />
              Awake {awakeMinutesToday !== null ? fmtDuration(awakeMinutesToday) : ''}
            </div>
            <button
              onClick={logSleepTime}
              disabled={saving}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50"
            >
              <Moon size={13} />
              Sleep
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <Moon size={13} />
            Slept {todayLog?.sleep_duration_minutes ? fmtDuration(todayLog.sleep_duration_minutes) : fmtTime(todayLog?.sleep_time ?? null)}
          </div>
        )}
      </div>
    )
  }

  // ── Full card mode ─────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={[
            'p-1.5 rounded-lg',
            isAsleep  ? 'bg-indigo-100 dark:bg-indigo-900' :
            isAwake   ? 'bg-emerald-100 dark:bg-emerald-900' :
                        'bg-amber-100 dark:bg-amber-900',
          ].join(' ')}>
            {isAsleep  ? <Moon    size={15} className="text-indigo-600 dark:text-indigo-400" /> :
             isAwake   ? <Sun     size={15} className="text-emerald-600 dark:text-emerald-400" /> :
                         <Sunrise size={15} className="text-amber-600 dark:text-amber-400" />}
          </div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Sleep Tracker
          </span>
        </div>

        {/* Status badge */}
        <span className={[
          'text-xs font-bold px-2 py-0.5 rounded-full',
          isAsleep  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' :
          isAwake   ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' :
                      'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
        ].join(' ')}>
          {isAsleep ? 'Asleep' : isAwake ? 'Awake' : 'Not logged'}
        </span>
      </div>

      {/* Today's times */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-700/50">
          <p className="text-xs text-zinc-400 mb-0.5 flex items-center gap-1">
            <Sunrise size={11} /> Woke up
          </p>
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
            {fmtTime(todayLog?.wake_time ?? null)}
          </p>
          {awakeMinutesToday !== null && !isAsleep && (
            <p className="text-xs text-emerald-500 mt-0.5 flex items-center gap-0.5">
              <Clock size={10} /> {fmtDuration(awakeMinutesToday)} awake
            </p>
          )}
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-700/50">
          <p className="text-xs text-zinc-400 mb-0.5 flex items-center gap-1">
            <BedDouble size={11} /> Went to sleep
          </p>
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
            {fmtTime(todayLog?.sleep_time ?? null)}
          </p>
          {todayLog?.sleep_duration_minutes && (
            <p className="text-xs text-indigo-500 mt-0.5">
              {fmtDuration(todayLog.sleep_duration_minutes)} awake today
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        {/* Wake button — show if not yet woken or to reset */}
        {!todayLog?.wake_time && (
          <button
            onClick={logWakeTime}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            <Sunrise size={16} />
            {saving ? 'Saving…' : 'I just woke up!'}
          </button>
        )}

        {/* Sleep button — show if awake (wake logged, no sleep yet) */}
        {isAwake && (
          <button
            onClick={logSleepTime}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            <Moon size={16} />
            {saving ? 'Saving…' : 'Going to sleep'}
          </button>
        )}

        {/* Day complete */}
        {isAsleep && (
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            <Moon size={16} />
            Day logged — sleep well!
          </div>
        )}
      </div>

      {/* Stats row */}
      {(avgWakeLabel || avgSleepMinutes !== null) && (
        <div className="flex items-center gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-700">
          {avgWakeLabel && (
            <div>
              <p className="text-[11px] text-zinc-400">Avg wake time</p>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{avgWakeLabel}</p>
            </div>
          )}
          {avgSleepMinutes !== null && (
            <div>
              <p className="text-[11px] text-zinc-400">Avg day length</p>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{fmtDuration(avgSleepMinutes)}</p>
            </div>
          )}
          <div className="ml-auto text-[10px] text-zinc-300 dark:text-zinc-600">14-day avg</div>
        </div>
      )}
    </div>
  )
}
