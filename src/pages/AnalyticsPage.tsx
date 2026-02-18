import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, BarChart2, PieChart as PieIcon, Clock3 } from 'lucide-react'
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, format } from 'date-fns'
import { useAnalytics } from '../hooks/useAnalytics'
import { useSubjects } from '../hooks/useSubjects'
import { TimelineView } from '../components/analytics/TimelineView'
import { StackedBarChart, SubjectPieChart } from '../components/analytics/StudyChart'
import { Card, StatCard } from '../components/ui/Card'
import { ColorDot } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatHumanDuration, toHours } from '../utils/time'
import type { AnalyticsRange } from '../types'

type ChartType = 'bar' | 'pie' | 'timeline'

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('week')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [refDate, setRefDate] = useState(new Date())

  const { subjectStats, dailyStats, timelineBlocks, totalSeconds, topSubject, loading } = useAnalytics(range, refDate)
  const { subjects } = useSubjects()

  function navigate(direction: 'prev' | 'next') {
    const fn = direction === 'prev'
      ? range === 'day' ? subDays : range === 'week' ? subWeeks : subMonths
      : range === 'day' ? addDays : range === 'week' ? addWeeks : addMonths
    setRefDate(d => fn(d, 1))
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
          <button
            onClick={() => navigate('prev')}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-52 text-center">
            {periodLabel}
          </span>
          <button
            onClick={() => navigate('next')}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Chart type selector */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 ml-auto">
          {range !== 'day' && (
            <ChartButton
              active={chartType === 'bar'}
              onClick={() => setChartType('bar')}
              icon={<BarChart2 size={15} />}
              label="Bar"
            />
          )}
          <ChartButton
            active={chartType === 'pie'}
            onClick={() => setChartType('pie')}
            icon={<PieIcon size={15} />}
            label="Pie"
          />
          {range === 'day' && (
            <ChartButton
              active={chartType === 'timeline'}
              onClick={() => setChartType('timeline')}
              icon={<Clock3 size={15} />}
              label="Timeline"
            />
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Study Time"
          value={formatHumanDuration(totalSeconds)}
          sub={`${toHours(totalSeconds)}h total`}
          icon={<Clock3 size={18} />}
        />
        <StatCard
          label="Top Subject"
          value={topSubject?.subject_name ?? '—'}
          sub={topSubject ? formatHumanDuration(topSubject.total_seconds) : 'No sessions'}
          color={topSubject?.subject_color}
        />
        <StatCard
          label="Sessions"
          value={String(subjectStats.reduce((n, s) => n + s.session_count, 0))}
          sub="completed"
        />
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
            {chartType === 'bar' && (
              <StackedBarChart data={dailyStats} allSubjects={subjectStats} />
            )}
            {chartType === 'pie' && (
              <SubjectPieChart data={subjectStats} />
            )}
            {chartType === 'timeline' && (
              <TimelineView blocks={timelineBlocks} date={refDate} />
            )}
          </>
        )}
      </Card>

      {/* Subject breakdown table */}
      {subjectStats.length > 0 && (
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
            Subject Breakdown
          </h2>
          <div className="space-y-4">
            {subjectStats.map((stat, idx) => {
              const pct = totalSeconds > 0 ? (stat.total_seconds / totalSeconds) * 100 : 0
              return (
                <div key={stat.subject_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-zinc-400 w-5 text-right">
                        #{idx + 1}
                      </span>
                      <ColorDot color={stat.subject_color} size={12} />
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {stat.subject_name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {stat.session_count} session{stat.session_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                        {formatHumanDuration(stat.total_seconds)}
                      </span>
                      <span className="text-xs text-zinc-400 ml-2">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: stat.subject_color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function ChartButton({
  active, onClick, icon, label,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
