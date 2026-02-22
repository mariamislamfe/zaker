import React, { useState } from 'react'
import {
  MessageSquare, CheckSquare, TrendingUp, Brain, Clock, RotateCcw,
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { EditableTaskPanel }  from '../components/ai/EditableTaskPanel'
import { ReadinessReport }    from '../components/ai/ReadinessReport'
import { BehaviorInsights }   from '../components/ai/BehaviorInsights'
import { SmartAlerts }        from '../components/ai/SmartAlerts'
import { SleepWakeWidget }    from '../components/ai/SleepWakeWidget'
import { TodayPlanWidget }    from '../components/ai/TodayPlanWidget'
import { AIFullReport }            from '../components/ai/AIFullReport'
import { BehaviorAnalysisPanel }   from '../components/ai/BehaviorAnalysisPanel'
import { RoutineTasksTab }         from '../components/ai/RoutineTasksTab'

// ─── Tab definition ────────────────────────────────────────────────────────────
type Tab = 'messages' | 'tasks' | 'routine' | 'readiness' | 'insights'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'messages',  label: 'AI Report',  icon: <MessageSquare size={15} /> },
  { id: 'tasks',     label: 'My Tasks',   icon: <CheckSquare   size={15} /> },
  { id: 'routine',   label: 'Routine',    icon: <RotateCcw     size={15} /> },
  { id: 'readiness', label: 'Readiness',  icon: <TrendingUp    size={15} /> },
  { id: 'insights',  label: 'Analysis',   icon: <Brain         size={15} /> },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

const TODAY    = format(new Date(), 'yyyy-MM-dd')
const TOMORROW = format(addDays(new Date(), 1), 'yyyy-MM-dd')

export function AIPlannerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messages')

  // ── Tab: AI Report ────────────────────────────────────────────────────────
  function renderMessages() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* AI Full Report — left 2/3 */}
        <div className="lg:col-span-2">
          <AIFullReport />
        </div>

        {/* Right: today's tasks + sleep */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
              <Clock size={14} className="text-zinc-500" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Today</span>
            </div>
            <TodayPlanWidget date={TODAY} showGenerate={false} />
          </div>
          <SleepWakeWidget />
        </div>
      </div>
    )
  }

  // ── Tab: Tasks ────────────────────────────────────────────────────────────
  function renderTasks() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableTaskPanel date={TODAY}    label="Today"    />
        <EditableTaskPanel date={TOMORROW} label="Tomorrow" />
      </div>
    )
  }

  // ── Tab: Readiness ────────────────────────────────────────────────────────
  function renderReadiness() {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <ReadinessReport />
      </div>
    )
  }

  // ── Tab: Insights ─────────────────────────────────────────────────────────
  function renderInsights() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Behavior Panel — left 2/3 */}
        <div className="lg:col-span-2">
          <BehaviorAnalysisPanel />
        </div>
        {/* Right: stats + sleep */}
        <div className="space-y-4">
          <BehaviorInsights />
          <SleepWakeWidget />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-5">

        {/* ── Page header ────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Brain size={20} className="text-primary-500" />
            AI Academic Decision Engine
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Daily · Weekly · Monthly analysis — powered by K2-Think</p>
        </div>

        {/* ── Smart Alerts ──────────────────────────────────────────────────── */}
        <SmartAlerts />

        {/* ── Tab bar ───────────────────────────────────────────────────────── */}
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
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────────── */}
        {activeTab === 'messages'  && renderMessages()}
        {activeTab === 'tasks'     && renderTasks()}
        {activeTab === 'routine'   && <RoutineTasksTab />}
        {activeTab === 'readiness' && renderReadiness()}
        {activeTab === 'insights'  && renderInsights()}

      </div>
    </div>
  )
}
