import React, { useMemo, useRef, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, parseISO, addMonths,
} from 'date-fns'
import type { DayPlan } from '../../hooks/usePlanCalendar'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PALETTE  = [
  '#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
]

// Deterministic color from subject name
function subjectColor(name: string | null | undefined): string {
  if (!name) return PALETTE[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  days:          DayPlan[]
  planEnd:       string | null
  onDayClick?:   (day: DayPlan) => void
  selectedDate?: string
}

export function PlanCalendar({ days, planEnd, onDayClick, selectedDate }: Props) {
  const today    = format(new Date(), 'yyyy-MM-dd')
  const todayRef = useRef<HTMLButtonElement>(null)

  // Build date → DayPlan lookup
  const dayMap = useMemo(() => {
    const m = new Map<string, DayPlan>()
    for (const d of days) m.set(d.date, d)
    return m
  }, [days])

  // Calculate months to render
  const months = useMemo(() => {
    const start = new Date()
    const end   = planEnd ? parseISO(planEnd) : addMonths(start, 3)
    const list: Date[] = []
    let cur = startOfMonth(start)
    while (cur <= startOfMonth(end)) {
      list.push(new Date(cur))
      cur = addMonths(cur, 1)
    }
    return list
  }, [planEnd])

  // Scroll today into view on first render
  useEffect(() => {
    setTimeout(() => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300)
  }, [])

  return (
    <div className="overflow-y-auto space-y-8 pr-1" style={{ maxHeight: '620px' }}>
      {months.map(month => {
        const monthLabel = format(month, 'MMMM yyyy')
        const firstDay   = startOfMonth(month)
        const lastDay    = endOfMonth(month)
        const monthDays  = eachDayOfInterval({ start: firstDay, end: lastDay })
        // Monday = 0 offset
        const offset     = (getDay(firstDay) + 6) % 7

        return (
          <div key={monthLabel}>
            {/* Month header */}
            <div className="sticky top-0 z-10 py-1.5 bg-white dark:bg-zinc-800">
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{monthLabel}</h3>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-zinc-400 py-0.5">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-700 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
              {/* Offset blank cells */}
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`off-${i}`} className="bg-white dark:bg-zinc-800 min-h-[76px]" />
              ))}

              {/* Day cells */}
              {monthDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dp      = dayMap.get(dateStr)
                const isToday = dateStr === today
                const isSel   = dateStr === selectedDate
                const isPast  = dateStr < today && !isToday
                const hasTasks = (dp?.totalCount ?? 0) > 0
                const allDone  = hasTasks && dp!.completedCount === dp!.totalCount

                return (
                  <button
                    key={dateStr}
                    ref={isToday ? todayRef : undefined}
                    onClick={() => dp ? onDayClick?.(dp) : undefined}
                    className={[
                      'min-h-[76px] p-1.5 text-left transition-colors relative',
                      isToday  ? 'bg-primary-50 dark:bg-primary-950/60' :
                      isSel    ? 'bg-blue-50 dark:bg-blue-950/60' :
                      isPast   ? 'bg-zinc-50 dark:bg-zinc-800/30' :
                                 'bg-white dark:bg-zinc-800',
                      hasTasks && !isPast
                        ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/60'
                        : 'cursor-default',
                    ].join(' ')}
                  >
                    {/* Date number */}
                    <div className={[
                      'text-[11px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full leading-none',
                      isToday ? 'bg-primary-500 text-white' :
                      isSel   ? 'bg-blue-500 text-white' :
                      isPast  ? 'text-zinc-300 dark:text-zinc-600' :
                                'text-zinc-600 dark:text-zinc-400',
                    ].join(' ')}>
                      {format(day, 'd')}
                    </div>

                    {/* Task pills (max 3) */}
                    {(dp?.tasks ?? []).slice(0, 3).map(t => {
                      const color = subjectColor(t.subject_name)
                      return (
                        <div
                          key={t.id}
                          title={t.title}
                          className={[
                            'text-[9px] font-semibold px-1 py-0.5 rounded mb-0.5 truncate leading-tight',
                            t.status === 'completed' ? 'opacity-40 line-through' : '',
                          ].join(' ')}
                          style={{ backgroundColor: color + '28', color }}
                        >
                          {t.subject_name ?? t.title}
                        </div>
                      )
                    })}

                    {/* Overflow count */}
                    {(dp?.totalCount ?? 0) > 3 && (
                      <div className="text-[9px] text-zinc-400">
                        +{dp!.totalCount - 3}
                      </div>
                    )}

                    {/* All-done checkmark */}
                    {allDone && (
                      <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">✓</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
