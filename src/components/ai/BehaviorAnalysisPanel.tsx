import React, { useState } from 'react'
import {
  Brain, TrendingUp, Wrench, Loader2,
  CheckCircle, AlertTriangle, AlertOctagon, Lightbulb,
  Clock, ChevronRight, X, Sparkles,
} from 'lucide-react'
import {
  analyzeBehaviorQuick, predictOutcome, generateFixedPlan,
  USE_MOCK_AI,
  type BehaviorCard, type CardType, type PredictionResult, type ScheduleSlot,
} from '../../services/aiService'
import { useAuth } from '../../contexts/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CARD_STYLES: Record<CardType, { border: string; bg: string; icon: string }> = {
  positive: { border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950',  icon: 'text-emerald-600 dark:text-emerald-400' },
  insight:  { border: 'border-primary-200 dark:border-primary-800', bg: 'bg-primary-50 dark:bg-primary-950',  icon: 'text-primary-600 dark:text-primary-400' },
  warning:  { border: 'border-amber-200 dark:border-amber-800',     bg: 'bg-amber-50 dark:bg-amber-950',      icon: 'text-amber-600 dark:text-amber-400'    },
  risk:     { border: 'border-red-200 dark:border-red-800',         bg: 'bg-red-50 dark:bg-red-950',          icon: 'text-red-600 dark:text-red-400'        },
}

const CARD_ICONS: Record<CardType, React.ReactNode> = {
  positive: <CheckCircle size={14} />,
  insight:  <Lightbulb  size={14} />,
  warning:  <AlertTriangle size={14} />,
  risk:     <AlertOctagon  size={14} />,
}

function gauge(value: number): 'green' | 'yellow' | 'red' {
  return value >= 70 ? 'green' : value >= 40 ? 'yellow' : 'red'
}
const GAUGE_COLOR = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500' }
const STATUS_TEXT: Record<PredictionResult['status'], { label: string; cls: string }> = {
  green:  { label: '✅ Excellent condition',  cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' },
  yellow: { label: '⚠️ Needs improvement',   cls: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'           },
  red:    { label: '🚨 Danger — Act now',     cls: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'                       },
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function BehaviorCards({ cards }: { cards: BehaviorCard[] }) {
  return (
    <div className="space-y-3">
      {cards.map(card => {
        const s = CARD_STYLES[card.type]
        return (
          <div key={card.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${s.border} ${s.bg}`}>
            <span className="text-xl shrink-0 mt-0.5">{card.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={s.icon}>{CARD_ICONS[card.type]}</span>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{card.title}</p>
                {card.metric && (
                  <span className="ml-auto text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 shrink-0">{card.metric}</span>
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed" dir="rtl">{card.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GaugeBar({ label, value, unit = '%' }: { label: string; value: number; unit?: string }) {
  const color = GAUGE_COLOR[gauge(value)]
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{value}{unit}</span>
      </div>
      <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function PredictionPanel({ data }: { data: PredictionResult }) {
  const s = STATUS_TEXT[data.status]
  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-center py-2.5 rounded-xl border text-sm font-bold ${s.cls}`}>
        {s.label}
      </div>
      <div className="space-y-3">
        <GaugeBar label="Exam Readiness"        value={data.examReadiness} />
        <GaugeBar label="Completion Probability" value={data.completionProb} />
        <GaugeBar label="Burnout Risk"          value={data.burnoutRisk} />
      </div>
      <div className="px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed" dir="rtl">
          {data.summary}
        </p>
      </div>
    </div>
  )
}

function ScheduleTimeline({ slots }: { slots: ScheduleSlot[] }) {
  const typeLabel = { study: 'Study', review: 'Review', break: 'Break' }
  return (
    <div className="space-y-2">
      {slots.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-12 text-xs font-mono text-zinc-400 shrink-0 text-right">{s.time}</span>
          <div
            className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{
              backgroundColor: s.type === 'break' ? undefined : `${s.subjectColor}18`,
              borderLeft: `3px solid ${s.type === 'break' ? '#94a3b8' : s.subjectColor}`,
            }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{s.task}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-400">{s.subject}</span>
                <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
                <span className="text-[10px] text-zinc-400">{typeLabel[s.type]}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
              <Clock size={10} />
              {s.durationMinutes}m
            </div>
          </div>
          {i < slots.length - 1 && (
            <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-700 shrink-0" />
          )}
        </div>
      ))}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-700">
        <p className="text-xs text-zinc-400">
          Total: {slots.filter(s => s.type !== 'break').reduce((a, s) => a + s.durationMinutes, 0)} min study
        </p>
        <p className="text-[10px] text-zinc-300 dark:text-zinc-600 italic">Recommendations only — add manually if you like them</p>
      </div>
    </div>
  )
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({
  icon, label, sublabel, onClick, loading, active, gradient,
}: {
  icon: React.ReactNode; label: string; sublabel: string
  onClick: () => void; loading: boolean; active: boolean; gradient: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={[
        'relative flex flex-col items-start gap-1.5 p-4 rounded-2xl border transition-all text-left',
        active
          ? `${gradient} border-transparent text-white shadow-lg scale-[1.02]`
          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md',
      ].join(' ')}
    >
      <div className="flex items-center justify-between w-full">
        <span className={active ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
        </span>
        {active && <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />}
      </div>
      <div>
        <p className={`text-sm font-bold ${active ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{label}</p>
        <p className={`text-[11px] ${active ? 'text-white/70' : 'text-zinc-400'}`}>{sublabel}</p>
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveFeature = 'behavior' | 'predict' | 'plan' | null

export function BehaviorAnalysisPanel() {
  const { user } = useAuth()
  const [active,     setActive]     = useState<ActiveFeature>(null)
  const [loading,    setLoading]    = useState<ActiveFeature>(null)
  const [cards,      setCards]      = useState<BehaviorCard[] | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [schedule,   setSchedule]   = useState<ScheduleSlot[] | null>(null)

  async function run<T>(
    feature: ActiveFeature,
    fn: () => Promise<T>,
    setter: (v: T) => void,
  ) {
    if (!user) return
    setLoading(feature)
    try {
      const result = await fn()
      setter(result)
      setActive(feature)
    } catch { /* silently fallback */ }
    finally { setLoading(null) }
  }

  return (
    <div className="space-y-5">

      {/* AI status banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800">
        <Sparkles size={14} className="text-primary-500 shrink-0" />
        <p className="text-xs text-primary-700 dark:text-primary-300">
          {USE_MOCK_AI
            ? 'Demo Mode — smart simulated data'
            : 'K2-Think V2 — analyzing your real data'}
        </p>
      </div>

      {/* 3-button action grid */}
      <div className="grid grid-cols-3 gap-3">
        <ActionBtn
          icon={<Brain size={18} />}
          label="Analyze Behavior"
          sublabel="Patterns + weak spots"
          gradient="bg-gradient-to-br from-primary-600 to-primary-800"
          active={active === 'behavior'}
          loading={loading === 'behavior'}
          onClick={() => run('behavior', () => analyzeBehaviorQuick(user!.id), setCards)}
        />
        <ActionBtn
          icon={<TrendingUp size={18} />}
          label="What If I Continue?"
          sublabel="Predict future performance"
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          active={active === 'predict'}
          loading={loading === 'predict'}
          onClick={() => run('predict', () => predictOutcome(user!.id), setPrediction)}
        />
        <ActionBtn
          icon={<Wrench size={18} />}
          label="Fix My Plan"
          sublabel="Optimized schedule recommendations"
          gradient="bg-gradient-to-br from-violet-600 to-purple-700"
          active={active === 'plan'}
          loading={loading === 'plan'}
          onClick={() => run('plan', () => generateFixedPlan(user!.id), setSchedule)}
        />
      </div>

      {/* Results area */}
      {active && (
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">

          {/* Result header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              {active === 'behavior' && <><Brain size={14} className="text-primary-500" /><span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Behavior Analysis</span></>}
              {active === 'predict'  && <><TrendingUp size={14} className="text-amber-500" /><span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Performance Forecast</span></>}
              {active === 'plan'     && <><Wrench size={14} className="text-violet-500" /><span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Schedule Recommendations</span></>}
            </div>
            <button
              onClick={() => setActive(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-4 py-4">
            {active === 'behavior' && cards      && <BehaviorCards cards={cards} />}
            {active === 'predict'  && prediction && <PredictionPanel data={prediction} />}
            {active === 'plan'     && schedule   && <ScheduleTimeline slots={schedule} />}
          </div>
        </div>
      )}
    </div>
  )
}
