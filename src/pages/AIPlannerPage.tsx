import React, { useState } from 'react'
import {
  MessageSquare, CheckSquare, TrendingUp, Brain, Clock,
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { EditableTaskPanel }  from '../components/ai/EditableTaskPanel'
import { ReadinessReport }    from '../components/ai/ReadinessReport'
import { BehaviorInsights }   from '../components/ai/BehaviorInsights'
import { SmartAlerts }        from '../components/ai/SmartAlerts'
import { SleepWakeWidget }    from '../components/ai/SleepWakeWidget'
import { AIMessageFeed }      from '../components/ai/AIMessageFeed'
import { TodayPlanWidget }    from '../components/ai/TodayPlanWidget'

// ─── Tab definition ────────────────────────────────────────────────────────────
type Tab = 'messages' | 'tasks' | 'readiness' | 'insights'

const TABS: { id: Tab; label: string; labelAr: string; icon: React.ReactNode }[] = [
  { id: 'messages',  label: 'AI Insights', labelAr: 'نصايحي',   icon: <MessageSquare size={15} /> },
  { id: 'tasks',     label: 'My Tasks',    labelAr: 'تاسكاتي',  icon: <CheckSquare   size={15} /> },
  { id: 'readiness', label: 'Readiness',   labelAr: 'جاهزيتي', icon: <TrendingUp    size={15} /> },
  { id: 'insights',  label: 'Insights',    labelAr: 'تحليلي',   icon: <Brain         size={15} /> },
]

const TODAY    = format(new Date(), 'yyyy-MM-dd')
const TOMORROW = format(addDays(new Date(), 1), 'yyyy-MM-dd')

// ─── Page ──────────────────────────────────────────────────────────────────────

export function AIPlannerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messages')

  // ── Tab: Messages (نصايحي) ─────────────────────────────────────────────────
  function renderMessages() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* AI Message Feed — left 2/3 */}
        <div className="lg:col-span-2">
          <AIMessageFeed />
        </div>

        {/* Right: today's tasks + sleep */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
              <Clock size={14} className="text-zinc-500" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">النهارده</span>
            </div>
            <TodayPlanWidget date={TODAY} showGenerate={false} />
          </div>
          <SleepWakeWidget />
        </div>
      </div>
    )
  }

  // ── Tab: Tasks (تاسكاتي) ───────────────────────────────────────────────────
  function renderTasks() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableTaskPanel date={TODAY}    label="النهارده" />
        <EditableTaskPanel date={TOMORROW} label="بكرا"     />
      </div>
    )
  }

  // ── Tab: Readiness (جاهزيتي) ───────────────────────────────────────────────
  function renderReadiness() {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <ReadinessReport />
      </div>
    )
  }

  // ── Tab: Insights (تحليلي) ─────────────────────────────────────────────────
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
            <TodayPlanWidget date={TODAY} showGenerate={false} />
          </div>
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
          <p className="text-sm text-zinc-400 mt-0.5">تحليل يومي · أسبوعي · شهري — مدعوم بـ K2-Think</p>
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
              <span className="hidden sm:inline">{tab.labelAr}</span>
              <span className="sm:hidden">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────────── */}
        {activeTab === 'messages'  && renderMessages()}
        {activeTab === 'tasks'     && renderTasks()}
        {activeTab === 'readiness' && renderReadiness()}
        {activeTab === 'insights'  && renderInsights()}

      </div>
    </div>
  )
}
