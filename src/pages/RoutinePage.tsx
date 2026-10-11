import { useMemo, useState } from 'react'
import {
  format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO,
} from 'date-fns'
import { CheckCircle2, Circle, SkipForward, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { EditableTaskPanel } from '../components/tasks/EditableTaskPanel'
import { RoutineTasksTab } from '../components/tasks/RoutineTasksTab'
import { Card } from '../components/ui/Card'
import { useTaskArchive } from '../hooks/useTaskArchive'
import type { PlanTask } from '../types'

type Tab = 'today' | 'archive' | 'lists'
type Mode = 'day' | 'week' | 'month'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today',   label: '☀️ Today' },
  { id: 'archive', label: '🗂️ Archive' },
  { id: 'lists',   label: '🔁 Weekly / Monthly lists' },
]

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

function periodRange(mode: Mode, anchor: Date) {
  if (mode === 'day') return { from: anchor, to: anchor }
  if (mode === 'week') {
    return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) }
  }
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) }
}

function shift(mode: Mode, anchor: Date, dir: 1 | -1) {
  if (mode === 'day') return addDays(anchor, dir)
  if (mode === 'week') return addWeeks(anchor, dir)
  return addMonths(anchor, dir)
}

function periodLabel(mode: Mode, anchor: Date) {
  const { from, to } = periodRange(mode, anchor)
  if (mode === 'day') return format(from, 'EEEE, d MMM yyyy')
  if (mode === 'week') return `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`
  return format(from, 'MMMM yyyy')
}

function StatusIcon({ status }: { status: PlanTask['status'] }) {
  if (status === 'completed') return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
  if (status === 'skipped') return <SkipForward size={15} className="text-zinc-400 shrink-0" />
  return <Circle size={16} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
}

function DayGroup({ date, tasks, defaultOpen }: { date: string; tasks: PlanTask[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const done = tasks.filter(t => t.status === 'completed').length
  const pct = Math.round((done / tasks.length) * 100)

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 text-left"
      >
        <ChevronDown size={15} className={['text-zinc-400 transition-transform', open ? '' : '-rotate-90'].join(' ')} />
        <span className="flex-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {format(parseISO(date), 'EEEE, d MMM')}
        </span>
        <span className="text-xs text-zinc-500">{done}/{tasks.length}</span>
        <span className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <span className="block h-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {tasks.map(t => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <StatusIcon status={t.status} />
              <span
                dir="rtl"
                className={[
                  'flex-1 text-sm text-left',
                  t.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200',
                ].join(' ')}
              >
                {t.title}
              </span>
              {t.subject_name && <span className="text-xs text-zinc-400">{t.subject_name}</span>}
              <span className="text-xs text-zinc-400">{t.duration_minutes}m</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Archive() {
  const [mode, setMode] = useState<Mode>('week')
  const [anchor, setAnchor] = useState(new Date())

  const { from, to } = periodRange(mode, anchor)
  const { tasks, loading } = useTaskArchive(ymd(from), ymd(to))

  const days = useMemo(() => {
    const map = new Map<string, PlanTask[]>()
    for (const t of tasks) {
      const list = map.get(t.scheduled_date) ?? []
      list.push(t)
      map.set(t.scheduled_date, list)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [tasks])

  const done = tasks.filter(t => t.status === 'completed').length
  const skipped = tasks.filter(t => t.status === 'skipped').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                'px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                mode === m
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setAnchor(a => shift(mode, a, -1))} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 min-w-[170px] text-center">
            {periodLabel(mode, anchor)}
          </span>
          <button onClick={() => setAnchor(a => shift(mode, a, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setAnchor(new Date())} className="ml-1 px-2 py-1 rounded-lg text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950">
            Today
          </button>
        </div>
      </div>

      {tasks.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">
              {done} of {tasks.length} done{skipped > 0 && <span className="text-zinc-400 font-normal"> · {skipped} skipped</span>}
            </span>
            <span className="text-zinc-500">{pct}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      ) : days.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">No tasks in this period.</p>
      ) : (
        <div className="space-y-2">
          {days.map(([date, list]) => (
            // key includes mode so the open/closed default resets when switching view
            <DayGroup key={`${mode}-${date}`} date={date} tasks={list} defaultOpen={mode !== 'month'} />
          ))}
        </div>
      )}
    </div>
  )
}

export function RoutinePage() {
  const [tab, setTab] = useState<Tab>('today')
  const today = ymd(new Date())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Routine</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          A fresh list every day. Past days are kept in the archive, grouped by week or month.
        </p>
      </div>

      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit max-w-full overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
              tab === t.id
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div className="max-w-xl">
          <EditableTaskPanel date={today} label={format(new Date(), "'Today' · EEEE d MMM")} />
        </div>
      )}
      {tab === 'archive' && <Archive />}
      {tab === 'lists' && <RoutineTasksTab />}
    </div>
  )
}
