import React, { useState, useEffect } from 'react'
import {
  Brain, Calendar, Lightbulb, Target, Wand2, Sparkles,
  Clock, TrendingUp, Flame, AlertCircle, CheckCircle2, X,
  ChevronRight, RotateCcw, CalendarDays, ListChecks,
} from 'lucide-react'
import { format, addDays, addMonths } from 'date-fns'
import { useAIInsights }    from '../hooks/useAIInsights'
import { useUserGoals }     from '../hooks/useUserGoals'
import { useStudyPlan }     from '../hooks/useStudyPlan'
import { useSubjects }      from '../hooks/useSubjects'
import { usePlanCalendar }  from '../hooks/usePlanCalendar'
import type { DayPlan }     from '../hooks/usePlanCalendar'
import { TodayPlanWidget }  from '../components/ai/TodayPlanWidget'
import { AIInsightsPanel }  from '../components/ai/AIInsightsPanel'
import { BehaviorScores as BehaviorScoresWidget } from '../components/ai/BehaviorScores'
import { SleepWakeWidget }  from '../components/ai/SleepWakeWidget'
import { PlanCalendar }     from '../components/ai/PlanCalendar'
import { PlanChatbot }      from '../components/ai/PlanChatbot'
import { Card }             from '../components/ui/Card'
import { formatHumanDuration } from '../utils/time'
import { getOverdueTasks, adjustPlan } from '../services/aiEngine'
import { useAuth } from '../contexts/AuthContext'

// ─── Tab type ──────────────────────────────────────────────────────────────────
type Tab = 'today' | 'plan' | 'insights' | 'goals'

// ─── Duration presets ─────────────────────────────────────────────────────────
const DURATION_PRESETS = [
  { label: '1M',  months: 1  },
  { label: '2M',  months: 2  },
  { label: '3M',  months: 3  },
  { label: '6M',  months: 6  },
  { label: '1 Year', months: 12 },
] as const

// ─── Stat mini-card ────────────────────────────────────────────────────────────
function MiniStat({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
      <div className="p-2 rounded-lg" style={{ backgroundColor: (color ?? '#6366f1') + '20' }}>
        <span style={{ color: color ?? '#6366f1' }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-400 truncate">{label}</p>
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{value}</p>
        {sub && <p className="text-[11px] text-zinc-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Goal form ─────────────────────────────────────────────────────────────────
function GoalForm({
  subjects, onSave, onCancel, saving,
}: {
  subjects:  { id: string; name: string; color: string }[]
  onSave:    (v: { title: string; targetDate: string; hoursPerDay: number; subjectIds: string[]; description: string }) => void
  onCancel:  () => void
  saving:    boolean
}) {
  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [hoursPerDay,  setHoursPerDay]  = useState(4)
  const [selected,     setSelected]     = useState<string[]>([])
  const [customDate,   setCustomDate]   = useState('')
  const [presetMonths, setPresetMonths] = useState<number | null>(null)

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const minDate    = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const targetDate = presetMonths !== null
    ? format(addMonths(new Date(), presetMonths), 'yyyy-MM-dd')
    : customDate

  function handlePreset(months: number) {
    setPresetMonths(prev => prev === months ? null : months)
    setCustomDate('')
  }

  const valid = title.trim().length > 0 && selected.length > 0

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Goal title *</label>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Complete the full curriculum"
          className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Description <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="What do you want to achieve?"
          className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* Duration presets */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Plan duration
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {DURATION_PRESETS.map(p => (
            <button
              key={p.months}
              onClick={() => handlePreset(p.months)}
              className={[
                'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all',
                presetMonths === p.months
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-primary-300',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">or pick exact date:</span>
          <input
            type="date" value={customDate} onChange={e => { setCustomDate(e.target.value); setPresetMonths(null) }}
            min={minDate}
            className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {targetDate && (
          <p className="mt-1.5 text-xs text-primary-600 dark:text-primary-400 font-medium">
            Plan ends: {targetDate}
          </p>
        )}
      </div>

      {/* Hours per day */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Hours / day: <span className="text-primary-600 dark:text-primary-400 font-bold">{hoursPerDay}h</span>
        </label>
        <input
          type="range" min={1} max={12} value={hoursPerDay}
          onChange={e => setHoursPerDay(+e.target.value)}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5"><span>1h</span><span>12h</span></div>
      </div>

      {/* Subjects */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Subjects *</label>
        <div className="flex flex-wrap gap-2">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={[
                'px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-all',
                selected.includes(s.id) ? 'text-white shadow-sm' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400',
              ].join(' ')}
              style={selected.includes(s.id) ? { borderColor: s.color, backgroundColor: s.color } : {}}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onSave({ title: title.trim(), targetDate, hoursPerDay, subjectIds: selected, description })}
          disabled={!valid || saving}
          className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Wand2 size={15} />
          {saving ? 'Generating…' : 'Generate AI Plan'}
        </button>
      </div>
      {!valid && <p className="text-xs text-amber-500">Fill in the title and select at least one subject.</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AIPlannerPage() {
  const { user } = useAuth()

  const [tab, setTab]                       = useState<Tab>('today')
  const [showGoalForm, setShowGoalForm]     = useState(false)
  const [planSuccess, setPlanSuccess]       = useState<string | null>(null)
  const [overdueCount, setOverdueCount]     = useState(0)
  const [redistributing, setRedistributing] = useState(false)
  const [redistDone, setRedistDone]         = useState(false)
  const [selectedDay, setSelectedDay]       = useState<DayPlan | null>(null)
  const [planVersion, setPlanVersion]       = useState(0)   // increments on chatbot changes

  const { subjects }   = useSubjects()
  const activeSubjects = subjects.filter(s => s.is_active)

  const {
    insights, scores, profile,
    loading: insightsLoading, refreshing,
    unreadCount, markRead, markAllRead, refresh,
  } = useAIInsights()

  const {
    goals, activeGoal, generating: goalGenerating, error: goalError,
    createGoalWithPlan,
  } = useUserGoals()

  const {
    days: calDays, planInfo, loading: calLoading,
    totalTasks, completedTasks, daysWithTasks,
    refetch: refetchCal,
  } = usePlanCalendar()

  const todayDate    = format(new Date(), 'yyyy-MM-dd')
  const tomorrowDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const {
    completedCount: todayDone,
    totalCount:     todayTotal,
    progressPct:    todayPct,
  } = useStudyPlan(todayDate)

  // Auto-fetch insights if none exist
  useEffect(() => {
    if (!insightsLoading && insights.length === 0) refresh().catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightsLoading])

  // Check for overdue tasks on load
  useEffect(() => {
    if (!user) return
    getOverdueTasks(user.id).then(setOverdueCount).catch(() => {})
  }, [user])

  async function handleCreateGoal(v: {
    title: string; targetDate: string; hoursPerDay: number
    subjectIds: string[]; description: string
  }) {
    const planId = await createGoalWithPlan({
      title:       v.title,
      description: v.description || undefined,
      targetDate:  v.targetDate  || undefined,
      hoursPerDay: v.hoursPerDay,
      subjectIds:  v.subjectIds,
    })
    if (planId) {
      setShowGoalForm(false)
      setPlanSuccess(`Plan created! ${v.targetDate ? `Runs until ${v.targetDate}.` : ''}`)
      await refetchCal()
      setTab('plan')
      setTimeout(() => setPlanSuccess(null), 6000)
    }
  }

  async function handleRedistribute() {
    if (!user) return
    setRedistributing(true)
    await adjustPlan(user.id)
    setOverdueCount(0)
    setRedistributing(false)
    setRedistDone(true)
    await refetchCal()
    setTimeout(() => setRedistDone(false), 5000)
  }

  function handlePlanChanged() {
    refetchCal()
    setPlanVersion(v => v + 1)
  }

  function handleDayClick(day: DayPlan) {
    setSelectedDay(prev => prev?.date === day.date ? null : day)
  }

  // ── Tab definitions ──────────────────────────────────────────────────────
  const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode; badge?: number }> = [
    { key: 'today',    label: 'Today',    icon: <Calendar     size={15} />, badge: todayTotal > 0 ? todayTotal - todayDone : undefined },
    { key: 'plan',     label: 'Plan',     icon: <CalendarDays size={15} /> },
    { key: 'insights', label: 'Insights', icon: <Lightbulb    size={15} />, badge: unreadCount > 0 ? unreadCount : undefined },
    { key: 'goals',    label: 'Goals',    icon: <Target       size={15} /> },
  ]

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Brain size={24} className="text-primary-500" />
            AI Planner
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your personal academic coach — plans, monitors, and adapts to your habits.
          </p>
        </div>
        {scores && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <Sparkles size={14} className="text-primary-500" />
            <span className="text-sm font-bold tabular-nums text-primary-600 dark:text-primary-400">{scores.overall}</span>
            <span className="text-xs text-zinc-400">overall</span>
          </div>
        )}
      </div>

      {/* ── Banners ─────────────────────────────────────────────────── */}
      {planSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 size={16} /><span>{planSuccess}</span>
          <button onClick={() => setPlanSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
        </div>
      )}

      {overdueCount > 0 && !redistDone && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="flex-1 text-sm text-amber-700 dark:text-amber-300">
            You have <span className="font-bold">{overdueCount} missed task{overdueCount !== 1 ? 's' : ''}</span> from previous days.
          </p>
          <button
            onClick={handleRedistribute} disabled={redistributing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
          >
            <RotateCcw size={13} className={redistributing ? 'animate-spin' : ''} />
            {redistributing ? 'Distributing…' : 'Redistribute'}
          </button>
          <button onClick={() => setOverdueCount(0)} className="text-amber-400 hover:text-amber-600 shrink-0"><X size={14} /></button>
        </div>
      )}

      {redistDone && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 size={16} /> Missed tasks redistributed across the next 3 days.
        </div>
      )}

      {/* ── Quick stats ─────────────────────────────────────────────── */}
      {scores && profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat icon={<CheckCircle2 size={16} />} label="Today's Progress"
            value={`${todayPct}%`} sub={`${todayDone}/${todayTotal} tasks`} color="#6366f1" />
          <MiniStat icon={<Flame size={16} />} label="Current Streak"
            value={`${profile.currentStreak} day${profile.currentStreak !== 1 ? 's' : ''}`}
            sub={`Longest: ${profile.longestStreak}d`} color="#f59e0b" />
          <MiniStat icon={<Clock size={16} />} label="Avg Daily Study"
            value={formatHumanDuration(profile.avgDailySeconds)} sub="last 30 days" color="#10b981" />
          <MiniStat icon={<TrendingUp size={16} />} label="Consistency"
            value={`${profile.consistencyScore}%`} sub="days with sessions" color="#3b82f6" />
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 w-fit">
        {TABS.map(t => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className={[
              'relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300',
            ].join(' ')}
          >
            {t.icon}{t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Tab: Today
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'today' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SleepWakeWidget />
            <Card padding="lg">
              <TodayPlanWidget date={todayDate} showGenerate={false} />
            </Card>
            <Card padding="lg">
              <TodayPlanWidget date={tomorrowDate} showGenerate />
            </Card>
          </div>

          <div className="space-y-4">
            {scores ? (
              <Card padding="lg">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                  This Week's Scores
                </p>
                <BehaviorScoresWidget scores={scores} />
              </Card>
            ) : (
              <Card padding="lg">
                <div className="h-48 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </Card>
            )}
            {insights.filter(i => !i.is_read).slice(0, 2).length > 0 && (
              <Card padding="lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Top Insights</p>
                  <button onClick={() => setTab('insights')} className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-0.5 hover:underline">
                    See all <ChevronRight size={12} />
                  </button>
                </div>
                <div className="space-y-3">
                  {insights.filter(i => !i.is_read).slice(0, 2).map(ins => (
                    <div key={ins.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{ins.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{ins.content}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          Tab: Plan (Quick + Full Calendar)
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'plan' && (
        <div className="space-y-6">
          {/* Row 1: Quick plan + Goal builder */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-primary-500" />
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Quick Plan — Tomorrow</h2>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                AI builds tomorrow's schedule from your weak areas, curriculum, and average wake time.
              </p>
              <TodayPlanWidget date={tomorrowDate} showGenerate compact={false} />
            </Card>

            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-primary-500" />
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Goal-Based Study Plan</h2>
              </div>

              {showGoalForm ? (
                <GoalForm
                  subjects={activeSubjects}
                  onSave={handleCreateGoal}
                  onCancel={() => setShowGoalForm(false)}
                  saving={goalGenerating}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Choose a duration (1M, 2M, 3M, 6M…) and AI generates the full calendar plan, weighted by your weak subjects.
                  </p>
                  {goalError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                      <AlertCircle size={13} />{goalError}
                    </div>
                  )}
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Wand2 size={16} /> Create New Plan
                  </button>
                  {activeGoal && (
                    <div className="p-3 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950">
                      <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-0.5">Active Goal</p>
                      <p className="text-sm font-medium text-primary-800 dark:text-primary-200">{activeGoal.title}</p>
                      {activeGoal.target_date && (
                        <p className="text-xs text-primary-500 mt-0.5">Deadline: {activeGoal.target_date}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Row 2: Full plan calendar */}
          <Card padding="lg">
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-primary-500" />
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {planInfo ? planInfo.title : 'Full Study Plan'}
                </h2>
                {planInfo && (
                  <span className="text-xs text-zinc-400">until {planInfo.endDate}</span>
                )}
              </div>
              {/* Plan stats */}
              {totalTasks > 0 && (
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <ListChecks size={13} />
                    {completedTasks}/{totalTasks} tasks
                  </span>
                  <span>{daysWithTasks} days planned</span>
                  <div className="w-20 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {calLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : totalTasks === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">No plan yet</p>
                <p className="text-xs text-zinc-400 mb-4">Create a goal above to generate your full study calendar</p>
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
                >
                  <Wand2 size={15} /> Create Plan
                </button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Calendar (2/3) */}
                <div className="lg:col-span-2">
                  <PlanCalendar
                    days={calDays}
                    planEnd={planInfo?.endDate ?? null}
                    onDayClick={handleDayClick}
                    selectedDate={selectedDay?.date}
                  />
                </div>

                {/* Day detail (1/3) */}
                <div>
                  {selectedDay ? (
                    <div key={`${selectedDay.date}-${planVersion}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                            {selectedDay.isToday ? '📅 Today' : selectedDay.isTomorrow ? '📅 Tomorrow' : '📅 Selected Day'}
                          </p>
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{selectedDay.date}</p>
                        </div>
                        <button onClick={() => setSelectedDay(null)} className="text-zinc-400 hover:text-zinc-600">
                          <X size={14} />
                        </button>
                      </div>
                      <TodayPlanWidget date={selectedDay.date} showGenerate={selectedDay.isToday || selectedDay.isTomorrow} />
                      <p className="mt-3 text-[11px] text-zinc-400 text-center">
                        Use the chat button to edit this day's tasks
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <CalendarDays size={28} className="text-zinc-300 dark:text-zinc-600 mb-2" />
                      <p className="text-sm text-zinc-400">Click any day to view its tasks</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          Tab: Insights
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'insights' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card padding="lg">
              <AIInsightsPanel
                insights={insights} loading={insightsLoading} refreshing={refreshing}
                unreadCount={unreadCount} onMarkRead={markRead} onMarkAll={markAllRead} onRefresh={refresh}
              />
            </Card>
          </div>
          <div className="space-y-4">
            {scores ? (
              <Card padding="lg">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">Behaviour Scores</p>
                <BehaviorScoresWidget scores={scores} />
              </Card>
            ) : (
              <Card padding="lg">
                <div className="h-40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </Card>
            )}
            {profile && profile.weekdaySeconds.some(v => v > 0) && (
              <Card padding="lg">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Avg Study by Weekday</p>
                <div className="space-y-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    const secs = profile.weekdaySeconds[i]
                    const max  = Math.max(...profile.weekdaySeconds, 1)
                    return (
                      <div key={day} className="flex items-center gap-2">
                        <span className="text-xs w-7 text-zinc-400">{day}</span>
                        <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-primary-400 transition-all duration-500" style={{ width: `${Math.round((secs / max) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-zinc-400 w-10 text-right tabular-nums">
                          {secs >= 3600 ? `${(secs / 3600).toFixed(1)}h` : `${Math.round(secs / 60)}m`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          Tab: Goals
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'goals' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">My Goals</h2>
              <button
                onClick={() => setShowGoalForm(v => !v)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Target size={12} />{showGoalForm ? 'Cancel' : '+ New goal'}
              </button>
            </div>

            {showGoalForm ? (
              <GoalForm subjects={activeSubjects} onSave={handleCreateGoal} onCancel={() => setShowGoalForm(false)} saving={goalGenerating} />
            ) : goals.length === 0 ? (
              <div className="text-center py-10">
                <Target size={32} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-sm text-zinc-400 mb-4">No goals yet</p>
                <button onClick={() => setShowGoalForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
                  <Wand2 size={15} /> Create First Goal
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map(goal => (
                  <div key={goal.id} className={[
                    'p-4 rounded-xl border transition-all',
                    goal.is_active
                      ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800',
                  ].join(' ')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{goal.title}</p>
                        {goal.description && <p className="text-xs text-zinc-400 mt-0.5">{goal.description}</p>}
                      </div>
                      {goal.is_active && (
                        <span className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-primary-500 text-white">Active</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                      {goal.target_date && <span className="flex items-center gap-1"><Calendar size={11} /> {goal.target_date}</span>}
                      <span className="flex items-center gap-1"><Clock size={11} /> {goal.hours_per_day}h/day</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
              <Sparkles size={15} className="text-primary-500" />
              How AI Planning Works
            </h2>
            <div className="space-y-4">
              {[
                { step:'1', color:'#6366f1', title:'Analyse Behaviour',
                  desc:'AI analyses your sessions, break patterns, avg wake time, and curriculum progress.' },
                { step:'2', color:'#f59e0b', title:'Detect Weak Areas',
                  desc:'Subjects neglected or with low URT grades get more time in the schedule.' },
                { step:'3', color:'#10b981', title:'Generate Full Calendar',
                  desc:'Creates tasks day-by-day for your chosen duration (1M / 3M / 6M…), starting at your avg wake time.' },
                { step:'4', color:'#3b82f6', title:'Adapt with Chat',
                  desc:'Use the chat button to add tasks, split LOs, reschedule, or ask questions — AI handles it instantly.' },
              ].map(({ step, color, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ backgroundColor: color }}>{step}</div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Floating AI Chatbot ─────────────────────────────────────── */}
      <PlanChatbot onPlanChanged={handlePlanChanged} />
    </div>
  )
}
