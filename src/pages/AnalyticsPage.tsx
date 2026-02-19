import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, BarChart2, PieChart as PieIcon, Clock3, Moon, Sun } from 'lucide-react'
import {
  addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, format,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
} from 'date-fns'
import { useAnalytics } from '../hooks/useAnalytics'
import { useDailyLogs } from '../hooks/useDailyLogs'
import { Button } from '../components/ui/Button'
import { TimelineView } from '../components/analytics/TimelineView'
import { StackedBarChart, SubjectPieChart } from '../components/analytics/StudyChart'
import { Card, StatCard } from '../components/ui/Card'
import { ColorDot } from '../components/ui/Badge'
import { formatHumanDuration, toHours } from '../utils/time'
import type { AnalyticsRange, DailyLog, DailyStats } from '../types'

type ChartType = 'bar' | 'pie' | 'timeline'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function availableSeconds(wakeTime: string, sleepTime: string): number {
  let wakeMins = timeToMinutes(wakeTime)
  let sleepMins = timeToMinutes(sleepTime)
  if (sleepMins <= wakeMins) sleepMins += 24 * 60
  return (sleepMins - wakeMins) * 60
}

// ─── Day Wasted Section ───────────────────────────────────────────────────────

function DayWastedSection({
  date, studiedSeconds, logs, saving, onSave,
}: {
  date: Date
  studiedSeconds: number
  logs: DailyLog[]
  saving: boolean
  onSave: (date: string, wake: string, sleep: string) => void
}) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const log = logs.find(l => l.date === dateStr)

  const [wake, setWake] = useState(log?.wake_time?.substring(0, 5) ?? '07:00')
  const [sleep, setSleep] = useState(log?.sleep_time?.substring(0, 5) ?? '23:00')

  useEffect(() => {
    if (log) { setWake(log.wake_time.substring(0, 5)); setSleep(log.sleep_time.substring(0, 5)) }
  }, [log])

  const availSecs = availableSeconds(wake, sleep)
  const wastedSecs = Math.max(0, availSecs - studiedSeconds)
  const studiedPct = availSecs > 0 ? Math.min(100, (studiedSeconds / availSecs) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Time inputs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Sun size={15} className="text-amber-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Woke up</span>
          <input
            type="time"
            value={wake}
            onChange={e => setWake(e.target.value)}
            className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Moon size={15} className="text-indigo-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Slept</span>
          <input
            type="time"
            value={sleep}
            onChange={e => setSleep(e.target.value)}
            className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button size="sm" variant="secondary" loading={saving} onClick={() => onSave(dateStr, wake, sleep)}>
          Save
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Available', value: formatHumanDuration(availSecs), color: 'text-zinc-700 dark:text-zinc-300' },
          { label: 'Studied', value: formatHumanDuration(studiedSeconds), color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Wasted', value: formatHumanDuration(wastedSecs), color: 'text-red-500 dark:text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-zinc-400 mb-1">{label}</p>
            <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Bar */}
      <div className="h-6 rounded-full bg-red-100 dark:bg-red-900/30 overflow-hidden flex">
        <div
          className="h-full rounded-full transition-all duration-700 bg-indigo-500"
          style={{ width: `${studiedPct}%` }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> Studied {studiedPct.toFixed(0)}%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-300 dark:bg-red-700 inline-block" /> Wasted {(100 - studiedPct).toFixed(0)}%</span>
      </div>
    </div>
  )
}

// ─── Week/Month Day Grid ───────────────────────────────────────────────────────

function DayGrid({
  days,
  dailyStats,
  logs,
  onClickDay,
}: {
  days: Date[]
  dailyStats: DailyStats[]
  logs: DailyLog[]
  onClickDay: (d: Date) => void
}) {
  const statsMap = new Map(dailyStats.map(s => [s.date, s.total_seconds]))
  const logsMap = new Map(logs.map(l => [l.date, l]))

  return (
    <div className="flex flex-wrap gap-2">
      {days.map(d => {
        const dateStr = format(d, 'yyyy-MM-dd')
        const studied = statsMap.get(dateStr) ?? 0
        const log = logsMap.get(dateStr)
        const avail = log ? availableSeconds(log.wake_time.substring(0, 5), log.sleep_time.substring(0, 5)) : 8 * 3600
        const wasted = Math.max(0, avail - studied)
        const studiedPct = avail > 0 ? Math.min(100, (studied / avail) * 100) : 0
        const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

        return (
          <button
            key={dateStr}
            onClick={() => onClickDay(d)}
            title={`${format(d, 'EEE MMM d')}\nStudied: ${formatHumanDuration(studied)}\n${log ? `Wasted: ${formatHumanDuration(wasted)}` : 'No daily log set'}`}
            className={[
              'flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800',
              isToday ? 'ring-2 ring-primary-400 dark:ring-primary-500' : '',
            ].join(' ')}
          >
            {/* Bar */}
            <div className="w-10 h-20 rounded-lg overflow-hidden flex flex-col-reverse bg-red-100 dark:bg-red-900/20">
              <div
                className="w-full rounded-t-sm transition-all duration-500 bg-indigo-500"
                style={{ height: `${studiedPct}%`, minHeight: studied > 0 ? 4 : 0 }}
              />
            </div>
            {/* Label */}
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{format(d, 'EEE')}</span>
            <span className="text-[10px] text-zinc-400">{format(d, 'd')}</span>
            {studied > 0 && (
              <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400">
                {Math.floor(studied / 3600)}h{Math.floor((studied % 3600) / 60) > 0 ? `${Math.floor((studied % 3600) / 60)}m` : ''}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Wasted Time Card ─────────────────────────────────────────────────────────

function WastedTimeCard({
  range, refDate, dailyStats, logs, saving, onSave, onDayClick,
}: {
  range: AnalyticsRange
  refDate: Date
  dailyStats: DailyStats[]
  logs: DailyLog[]
  saving: boolean
  onSave: (date: string, wake: string, sleep: string) => void
  onDayClick: (d: Date) => void
}) {
  const days = (() => {
    if (range === 'week') {
      const start = startOfWeek(refDate, { weekStartsOn: 1 })
      return eachDayOfInterval({ start, end: endOfWeek(refDate, { weekStartsOn: 1 }) })
    }
    if (range === 'month') {
      return eachDayOfInterval({ start: startOfMonth(refDate), end: endOfMonth(refDate) })
    }
    return []
  })()

  const studiedOnDay = dailyStats.find(s => s.date === format(refDate, 'yyyy-MM-dd'))?.total_seconds ?? 0

  return (
    <Card padding="lg">
      <div className="flex items-center gap-2 mb-5">
        <Moon size={16} className="text-indigo-400" />
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Daily Breakdown — Wasted Time
        </h2>
      </div>

      {range === 'day' ? (
        <DayWastedSection
          date={refDate}
          studiedSeconds={studiedOnDay}
          logs={logs}
          saving={saving}
          onSave={onSave}
        />
      ) : (
        <div>
          <p className="text-xs text-zinc-400 mb-4">
            Rectangles show studied (indigo) vs wasted (red) time per day.
            {' '}<span className="text-primary-500 cursor-pointer" onClick={() => onDayClick(refDate)}>Click any day</span> to see its breakdown. Set wake/sleep times in Day view.
          </p>
          <DayGrid days={days} dailyStats={dailyStats} logs={logs} onClickDay={onDayClick} />

          {/* Week/Month totals */}
          {(() => {
            const totalStudied = dailyStats.reduce((s, d) => s + d.total_seconds, 0)
            const logsMap = new Map(logs.map(l => [l.date, l]))
            const totalAvail = days.reduce((sum, d) => {
              const log = logsMap.get(format(d, 'yyyy-MM-dd'))
              return sum + (log ? availableSeconds(log.wake_time.substring(0, 5), log.sleep_time.substring(0, 5)) : 0)
            }, 0)
            const totalWasted = Math.max(0, totalAvail - totalStudied)
            if (totalAvail === 0) return null
            return (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-3 gap-3 text-center">
                <div><p className="text-xs text-zinc-400 mb-1">Total Available</p><p className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">{formatHumanDuration(totalAvail)}</p></div>
                <div><p className="text-xs text-zinc-400 mb-1">Total Studied</p><p className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">{formatHumanDuration(totalStudied)}</p></div>
                <div><p className="text-xs text-zinc-400 mb-1">Total Wasted</p><p className="text-sm font-bold font-mono text-red-500">{formatHumanDuration(totalWasted)}</p></div>
              </div>
            )
          })()}
        </div>
      )}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('week')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [refDate, setRefDate] = useState(new Date())

  const { subjectStats, dailyStats, timelineBlocks, totalSeconds, topSubject, loading, fromDateStr, toDateStr } = useAnalytics(range, refDate)
  const { logs, saving: logSaving, saveLog } = useDailyLogs(fromDateStr, toDateStr)

  function navigate(direction: 'prev' | 'next') {
    const fn = direction === 'prev'
      ? range === 'day' ? subDays : range === 'week' ? subWeeks : subMonths
      : range === 'day' ? addDays : range === 'week' ? addWeeks : addMonths
    setRefDate(d => fn(d, 1))
  }

  function navigateToDay(d: Date) {
    setRange('day')
    setRefDate(d)
  }

  const periodLabel = (() => {
    if (range === 'day') return format(refDate, 'EEEE, MMM d yyyy')
    if (range === 'week') {
      const start = format(refDate, 'MMM d')
      const end = format(addDays(refDate, 6), 'MMM d, yyyy')
      return `${start} – ${end}`
    }
    return format(refDate, 'MMMM yyyy')
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Track your study habits over time.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Range selector */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {(['day', 'week', 'month'] as AnalyticsRange[]).map(r => (
            <button
              key={r}
              onClick={() => { setRange(r); if (r !== 'day') setChartType('bar') }}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
                range === r
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Period navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('prev')} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-52 text-center">
            {periodLabel}
          </span>
          <button onClick={() => navigate('next')} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Chart type selector */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 ml-auto">
          {range !== 'day' && (
            <ChartButton active={chartType === 'bar'} onClick={() => setChartType('bar')} icon={<BarChart2 size={15} />} label="Bar" />
          )}
          <ChartButton active={chartType === 'pie'} onClick={() => setChartType('pie')} icon={<PieIcon size={15} />} label="Pie" />
          {range === 'day' && (
            <ChartButton active={chartType === 'timeline'} onClick={() => setChartType('timeline')} icon={<Clock3 size={15} />} label="Timeline" />
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Study Time" value={formatHumanDuration(totalSeconds)} sub={`${toHours(totalSeconds)}h total`} icon={<Clock3 size={18} />} />
        <StatCard label="Top Subject" value={topSubject?.subject_name ?? '—'} sub={topSubject ? formatHumanDuration(topSubject.total_seconds) : 'No sessions'} color={topSubject?.subject_color} />
        <StatCard label="Sessions" value={String(subjectStats.reduce((n, s) => n + s.session_count, 0))} sub="completed" />
      </div>

      {/* Main chart */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
          {chartType === 'timeline' ? 'Daily Timeline' : chartType === 'pie' ? 'Subject Distribution' : 'Study Hours'}
        </h2>
        {loading ? (
          <div className="h-60 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ) : (
          <>
            {chartType === 'bar' && <StackedBarChart data={dailyStats} allSubjects={subjectStats} />}
            {chartType === 'pie' && <SubjectPieChart data={subjectStats} />}
            {chartType === 'timeline' && <TimelineView blocks={timelineBlocks} date={refDate} />}
          </>
        )}
      </Card>

      {/* Subject breakdown table */}
      {subjectStats.length > 0 && (
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">Subject Breakdown</h2>
          <div className="space-y-4">
            {subjectStats.map((stat, idx) => {
              const pct = totalSeconds > 0 ? (stat.total_seconds / totalSeconds) * 100 : 0
              return (
                <div key={stat.subject_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-zinc-400 w-5 text-right">#{idx + 1}</span>
                      <ColorDot color={stat.subject_color} size={12} />
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{stat.subject_name}</span>
                      <span className="text-xs text-zinc-400">{stat.session_count} session{stat.session_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold font-mono text-zinc-700 dark:text-zinc-300">{formatHumanDuration(stat.total_seconds)}</span>
                      <span className="text-xs text-zinc-400 ml-2">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: stat.subject_color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Wasted Time / Daily Breakdown */}
      <WastedTimeCard
        range={range}
        refDate={refDate}
        dailyStats={dailyStats}
        logs={logs}
        saving={logSaving}
        onSave={saveLog}
        onDayClick={navigateToDay}
      />
    </div>
  )
}

function ChartButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={['flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', active ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
