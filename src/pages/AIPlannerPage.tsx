import React, { useState, useCallback } from 'react'
import {
  Sparkles, Calendar, TrendingUp, Brain,
  CalendarDays, Sun, Clock, CheckCircle2,
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { usePlanCalendar }    from '../hooks/usePlanCalendar'
import type { DayPlan }       from '../hooks/usePlanCalendar'
import { PlanBuilderCard }    from '../components/ai/PlanBuilderCard'
import { PlanCalendar }       from '../components/ai/PlanCalendar'
import { ReadinessReport }    from '../components/ai/ReadinessReport'
import { BehaviorInsights }   from '../components/ai/BehaviorInsights'
import { SmartAlerts }        from '../components/ai/SmartAlerts'
import { TodayPlanWidget }    from '../components/ai/TodayPlanWidget'
import { SleepWakeWidget }    from '../components/ai/SleepWakeWidget'

// ─── Tab definition ────────────────────────────────────────────────────────────
type Tab = 'build' | 'plan' | 'readiness' | 'insights'

const TABS: { id: Tab; label: string; labelAr: string; icon: React.ReactNode }[] = [
  { id: 'build',     label: 'Build Plan',  labelAr: 'ابني الخطة',  icon: <Sparkles   size={15} /> },
  { id: 'plan',      label: 'My Plan',     labelAr: 'خطتي',        icon: <Calendar   size={15} /> },
  { id: 'readiness', label: 'Readiness',   labelAr: 'جاهزيتي',    icon: <TrendingUp size={15} /> },
  { id: 'insights',  label: 'Insights',    labelAr: 'تحليلي',      icon: <Brain      size={15} /> },
]

// ─── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon, value, label, color = 'zinc' }: {
  icon: React.ReactNode; value: string | number; label: string; color?: string
}) {
  const colors: Record<string, string> = {
    zinc:    'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400',
    primary: 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${colors[color] ?? colors.zinc}`}>
      <span className="opacity-70">{icon}</span>
      <div>
        <p className="text-sm font-bold leading-tight">{value}</p>
        <p className="text-[10px] opacity-60 leading-tight">{label}</p>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AIPlannerPage() {
  const [activeTab,    setActiveTab]    = useState<Tab>('build')
  const [selectedDay,  setSelectedDay]  = useState<DayPlan | null>(null)
  const [calVersion,   setCalVersion]   = useState(0)

  const { days, planInfo, loading: calLoading, refetch: refetchCal,
          totalTasks, completedTasks, daysWithTasks } = usePlanCalendar()

  const handlePlanBuilt = useCallback(() => {
    refetchCal()
    setCalVersion(v => v + 1)
    setActiveTab('plan')
  }, [refetchCal])

  // ── Render content per tab ──────────────────────────────────────────────────

  function renderBuild() {
    return (
      <div className="space-y-4">
        <PlanBuilderCard onPlanBuilt={handlePlanBuilt} />

        {/* Today + Tomorrow preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
              <Sun size={14} className="text-amber-500" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">النهارده</span>
            </div>
            <TodayPlanWidget key={`today-${calVersion}`} date={format(new Date(), 'yyyy-MM-dd')} />
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
              <CalendarDays size={14} className="text-primary-500" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">بكرا</span>
            </div>
            <TodayPlanWidget key={`tomorrow-${calVersion}`} date={format(addDays(new Date(), 1), 'yyyy-MM-dd')} />
          </div>
        </div>
      </div>
    )
  }

  function renderPlan() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Calendar — left 2/3 */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-700">
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {planInfo?.title ?? 'خطة المذاكرة'}
              </h3>
              {planInfo?.endDate && (
                <p className="text-xs text-zinc-400">
                  حتى {new Date(planInfo.endDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold">
                {completedTasks}/{totalTasks}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div className="px-5 py-2 border-b border-zinc-100 dark:border-zinc-700">
              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.round((completedTasks / totalTasks) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                {Math.round((completedTasks / totalTasks) * 100)}% مكتمل · {daysWithTasks} يوم فيه tasks
              </p>
            </div>
          )}

          <div className="p-4">
            {calLoading ? (
              <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">جاري التحميل...</div>
            ) : days.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <CalendarDays size={32} className="text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm text-zinc-400">لم يتم إنشاء خطة بعد</p>
                <button
                  onClick={() => setActiveTab('build')}
                  className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  ابني خطتك الآن
                </button>
              </div>
            ) : (
              <PlanCalendar
                days={days}
                planEnd={planInfo?.endDate ?? null}
                selectedDate={selectedDay?.date}
                onDayClick={setSelectedDay}
              />
            )}
          </div>
        </div>

        {/* Day detail — right 1/3 */}
        <div className="space-y-4">
          {selectedDay ? (
            <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
                <CalendarDays size={14} className="text-primary-500" />
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                  {new Date(selectedDay.date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <TodayPlanWidget key={`${selectedDay.date}-${calVersion}`} date={selectedDay.date} />
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 text-center shadow-sm">
              <CalendarDays size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-400">اضغط على يوم لتفاصيله</p>
            </div>
          )}

          {/* Sleep widget */}
          <SleepWakeWidget />
        </div>
      </div>
    )
  }

  function renderReadiness() {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <ReadinessReport />
      </div>
    )
  }

  function renderInsights() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BehaviorInsights />
        <div className="space-y-4">
          <SleepWakeWidget />
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
              <Clock size={14} className="text-zinc-500" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">النهارده</span>
            </div>
            <TodayPlanWidget key={`insights-today-${calVersion}`} date={format(new Date(), 'yyyy-MM-dd')} />
          </div>
        </div>
      </div>
    )
  }

  // ── Header stats ──────────────────────────────────────────────────────────

  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-5">

        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Sparkles size={20} className="text-primary-500" />
              AI Study Planner
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">مدعوم بـ K2-Think — ذكاء اصطناعي لخطة مذاكرة احترافية</p>
          </div>

          {/* Stats chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatChip icon={<CheckCircle2 size={14} />} value={`${completedTasks}/${totalTasks}`} label="tasks" color="emerald" />
            <StatChip icon={<TrendingUp size={14} />}   value={`${progressPct}%`} label="إنجاز" color="primary" />
            <StatChip icon={<CalendarDays size={14} />} value={daysWithTasks} label="أيام" color="amber" />
          </div>
        </div>

        {/* ── Smart Alerts ────────────────────────────────────────────────────── */}
        <SmartAlerts />

        {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white dark:bg-zinc-800 rounded-2xl p-1.5 border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all',
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700',
              ].join(' ')}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.labelAr}</span>
              <span className="sm:hidden">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────────── */}
        {activeTab === 'build'     && renderBuild()}
        {activeTab === 'plan'      && renderPlan()}
        {activeTab === 'readiness' && renderReadiness()}
        {activeTab === 'insights'  && renderInsights()}

      </div>
    </div>
  )
}
