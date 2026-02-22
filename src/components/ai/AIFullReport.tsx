import React, { useState, useEffect, useCallback } from 'react'
import {
  Brain, AlertTriangle, Target, CalendarCheck, Lightbulb,
  RefreshCw, Loader2, Clock, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  generateAIReport, getCachedReport, setCachedReport, clearCachedReport,
  type AIReport, type TomorrowTask,
} from '../../services/aiReportService'

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  accentClass,
  children,
}: {
  icon: React.ReactNode
  title: string
  accentClass: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700 ${accentClass}`}>
        {icon}
        <span className="text-sm font-bold">{title}</span>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {[80, 60, 90, 70, 65].map((w, i) => (
        <div key={i} className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
          <div className="h-4 rounded-full bg-zinc-100 dark:bg-zinc-700 animate-pulse" style={{ width: '40%' }} />
          <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-700 animate-pulse" style={{ width: `${w}%` }} />
          <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-700 animate-pulse" style={{ width: `${w - 15}%` }} />
        </div>
      ))}
    </div>
  )
}

// ─── Tomorrow plan row ────────────────────────────────────────────────────────

function PlanRow({ item }: { item: TomorrowTask }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-700 last:border-0">
      <ChevronRight size={14} className="text-primary-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200" dir="rtl">{item.task}</p>
        {item.subject && (
          <p className="text-xs text-zinc-400 mt-0.5">{item.subject}</p>
        )}
      </div>
      <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
        <Clock size={11} />
        {item.durationMinutes}m
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIFullReport() {
  const { user } = useAuth()
  const [report,    setReport]    = useState<AIReport | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Load cached report on mount
  useEffect(() => {
    if (!user) return
    const cached = getCachedReport(user.id)
    if (cached) {
      setReport(cached)
      setHasLoaded(true)
    }
  }, [user])

  const generate = useCallback(async (force = false) => {
    if (!user) return
    if (force) clearCachedReport(user.id)
    setLoading(true)
    setError(null)
    try {
      const rep = await generateAIReport(user.id)
      setCachedReport(user.id, rep)
      setReport(rep)
      setHasLoaded(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Empty state: no report yet ────────────────────────────────────────────────
  if (!hasLoaded && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
          <Brain size={28} className="text-primary-500" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">AI Academic Report</p>
          <p className="text-sm text-zinc-400 mt-1 max-w-xs">
            K2-Think will analyze all your real data — subjects, tasks, curriculum, sleep — and give you a full report
          </p>
        </div>
        <button
          onClick={() => generate(false)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
        >
          <Brain size={16} />
          Generate Report
        </button>
      </div>
    )
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 text-sm text-zinc-400">
          <Loader2 size={15} className="animate-spin text-primary-500" />
          <span>K2-Think is analyzing your data...</span>
        </div>
        <Skeleton />
      </div>
    )
  }

  // ── Report ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Academic Performance Report
          </p>
          {report && (
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Last updated:{' '}
              {new Date(report.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={() => generate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {report && (
        <>
          {/* 1 — Behavior Insights */}
          <SectionCard
            icon={<Brain size={16} className="text-primary-500" />}
            title="🔍 Behavior Analysis"
            accentClass="text-primary-700 dark:text-primary-300"
          >
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed" dir="rtl">
              {report.behaviorInsights}
            </p>
          </SectionCard>

          {/* 2 — Risk Prediction */}
          <SectionCard
            icon={<AlertTriangle size={16} className="text-amber-500" />}
            title="⚠️ Risk Prediction"
            accentClass="text-amber-700 dark:text-amber-300"
          >
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed" dir="rtl">
              {report.riskPrediction}
            </p>
          </SectionCard>

          {/* 3 — Priorities */}
          <SectionCard
            icon={<Target size={16} className="text-emerald-500" />}
            title="🎯 Current Priorities"
            accentClass="text-emerald-700 dark:text-emerald-300"
          >
            <ol className="space-y-2">
              {report.priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300" dir="rtl">{p}</span>
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* 4 — Tomorrow Plan */}
          <SectionCard
            icon={<CalendarCheck size={16} className="text-violet-500" />}
            title="📋 Tomorrow's Plan"
            accentClass="text-violet-700 dark:text-violet-300"
          >
            {report.tomorrowPlan.length === 0 ? (
              <p className="text-sm text-zinc-400">No plan yet</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-700 -my-1">
                {report.tomorrowPlan.map((item, i) => (
                  <PlanRow key={i} item={item} />
                ))}
              </div>
            )}
            {report.tomorrowPlan.length > 0 && (
              <p className="text-xs text-zinc-400 mt-3 text-right">
                Total:{' '}
                {report.tomorrowPlan.reduce((s, t) => s + t.durationMinutes, 0)} min
                ({(report.tomorrowPlan.reduce((s, t) => s + t.durationMinutes, 0) / 60).toFixed(1)} hr)
              </p>
            )}
          </SectionCard>

          {/* 5 — Advice */}
          <SectionCard
            icon={<Lightbulb size={16} className="text-orange-500" />}
            title="💪 Coach's Advice"
            accentClass="text-orange-700 dark:text-orange-300"
          >
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed" dir="rtl">
              {report.advice}
            </p>
          </SectionCard>
        </>
      )}
    </div>
  )
}
