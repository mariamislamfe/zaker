import { useMemo, useState, type FormEvent } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, addMonths, parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Trash2, Check, Plus, BellRing } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useCalendarEvents } from '../../hooks/useCalendarEvents'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

const REMIND_OPTIONS = [
  { value: 0, label: 'On the day' },
  { value: 1, label: '1 day before' },
  { value: 2, label: '2 days before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarTab() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => ymd(new Date()))
  const [title, setTitle] = useState('')
  const [remind, setRemind] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Grid covers whole weeks, so it can include a few days of the neighbouring months.
  const gridDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  }), [month])

  const from = ymd(gridDays[0])
  const to = ymd(gridDays[gridDays.length - 1])
  const { events, error: loadError, addEvent, toggleDone, deleteEvent } = useCalendarEvents(from, to)

  const byDate = useMemo(() => {
    const map = new Map<string, typeof events>()
    for (const e of events) map.set(e.event_date, [...(map.get(e.event_date) ?? []), e])
    return map
  }, [events])

  const dayEvents = byDate.get(selected) ?? []

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await addEvent(title.trim(), selected, remind)
      setTitle('')
    } catch (err) {
      const msg = (err as { message?: string } | null)?.message
      setError(msg ? `Could not save: ${msg}` : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Month grid */}
      <Card padding="md" className="lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {format(month, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonth(m => addMonths(m, -1))} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => { setMonth(startOfMonth(new Date())); setSelected(ymd(new Date())) }}
              className="px-2 py-1 rounded-lg text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950"
            >
              Today
            </button>
            <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-400 mb-1">
          {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {gridDays.map(day => {
            const key = ymd(day)
            const list = byDate.get(key) ?? []
            const pending = list.filter(e => !e.done).length
            const isSel = key === selected
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={[
                  'min-h-[3.5rem] sm:min-h-[4.5rem] rounded-lg border p-1 text-left flex flex-col transition-colors',
                  isSel
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
                  isSameMonth(day, month) ? '' : 'opacity-40',
                ].join(' ')}
              >
                <span className={[
                  'text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full',
                  isToday(day) ? 'bg-primary-600 text-white' : 'text-zinc-700 dark:text-zinc-300',
                ].join(' ')}>
                  {format(day, 'd')}
                </span>
                {list.length > 0 && (
                  <span className="mt-auto flex items-center gap-1 text-[10px] font-medium truncate">
                    <span className={['w-1.5 h-1.5 rounded-full shrink-0', pending > 0 ? 'bg-amber-500' : 'bg-emerald-500'].join(' ')} />
                    <span className="hidden sm:inline text-zinc-500 truncate">{list[0].title}</span>
                    {list.length > 1 && <span className="text-zinc-400">+{list.length - 1}</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {loadError && (
          <p className="mt-3 text-xs text-red-500">Could not load events: {loadError}</p>
        )}
      </Card>

      {/* Selected day */}
      <Card padding="md" className="self-start">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {format(parseISO(selected), 'EEEE, d MMM yyyy')}
        </h3>

        <ul className="mt-3 space-y-2">
          {dayEvents.length === 0 && (
            <li className="text-xs text-zinc-400 py-2">Nothing planned for this day.</li>
          )}
          {dayEvents.map(ev => (
            <li key={ev.id} className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => toggleDone(ev.id, !ev.done)}
                title={ev.done ? 'Mark as not done' : 'Mark as done'}
                className={[
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                  ev.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-zinc-600',
                ].join(' ')}
              >
                {ev.done && <Check size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <p dir="auto" className={['text-sm truncate', ev.done ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-100'].join(' ')}>
                  {ev.title}
                </p>
                <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <BellRing size={10} />
                  {REMIND_OPTIONS.find(o => o.value === ev.remind_days_before)?.label ?? `${ev.remind_days_before} days before`}
                </p>
              </div>
              <button
                onClick={() => deleteEvent(ev.id)}
                className="p-1 text-zinc-300 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleAdd} className="mt-4 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Chemistry quiz"
            dir="auto"
            maxLength={120}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            value={remind}
            onChange={e => setRemind(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {REMIND_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>Remind me: {o.label}</option>
            ))}
          </select>
          <Button type="submit" size="sm" loading={saving} icon={<Plus size={14} />} className="w-full">
            Add to calendar
          </Button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      </Card>
    </div>
  )
}
