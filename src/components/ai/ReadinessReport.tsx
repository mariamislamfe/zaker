import React, { useState, useCallback } from 'react'
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Clock, Loader2, BookOpen } from 'lucide-react'
import { getReadinessReport, type ReadinessReport, type SubjectReadiness } from '../../services/aiAnalytics'
import { useAuth } from '../../contexts/AuthContext'

// ─── Circular progress ────────────────────────────────────────────────────────

function CircularScore({ pct }: { pct: number }) {
  const r   = 38
  const c   = 2 * Math.PI * r
  const arc = c * (1 - pct / 100)
  const color = pct >= 70 ? '#10b981' : pct >= 45 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-100 dark:text-zinc-700" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={arc} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{pct}%</span>
        <span className="text-[10px] text-zinc-400">جاهزية</span>
      </div>
    </div>
  )
}

// ─── Subject row ──────────────────────────────────────────────────────────────

const STATUS_META: Record<SubjectReadiness['status'], { label: string; icon: React.ReactNode; barColor: string }> = {
  done:     { label: 'مكتمل',   icon: <CheckCircle2 size={13} className="text-emerald-500" />,  barColor: 'bg-emerald-500' },
  on_track: { label: 'منتظم',   icon: <TrendingUp   size={13} className="text-primary-500" />,  barColor: 'bg-primary-500' },
  behind:   { label: 'متأخر',   icon: <Clock        size={13} className="text-amber-500" />,     barColor: 'bg-amber-400'   },
  danger:   { label: 'خطر',     icon: <AlertTriangle size={13} className="text-red-500" />,     barColor: 'bg-red-500'     },
}

function SubjectRow({ s }: { s: SubjectReadiness }) {
  const meta = STATUS_META[s.status]
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {meta.icon}
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{s.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500">{meta.label}</span>
        </div>
        <span className="text-xs font-semibold text-zinc-500">
          {s.completedSessions}/{s.totalSessions}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${meta.barColor}`}
          style={{ width: `${s.coveragePct}%` }}
        />
      </div>
      {s.daysSinceStudied !== null && s.daysSinceStudied >= 5 && s.coveragePct < 100 && (
        <p className="text-[10px] text-amber-500">آخر مراجعة: منذ {s.daysSinceStudied} أيام</p>
      )}
    </div>
  )
}

// ─── Risk meta ───────────────────────────────────────────────────────────────

const RISK_META = {
  low:      { label: 'خطر منخفض', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/30',   border: 'border-emerald-200 dark:border-emerald-800' },
  medium:   { label: 'خطر متوسط', text: 'text-amber-700 dark:text-amber-300',     bg: 'bg-amber-50 dark:bg-amber-950/30',       border: 'border-amber-200 dark:border-amber-800'   },
  high:     { label: 'خطر عالي',  text: 'text-orange-700 dark:text-orange-300',   bg: 'bg-orange-50 dark:bg-orange-950/30',     border: 'border-orange-200 dark:border-orange-800' },
  critical: { label: 'خطر حرج',   text: 'text-red-700 dark:text-red-300',         bg: 'bg-red-50 dark:bg-red-950/30',           border: 'border-red-200 dark:border-red-800'       },
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ReadinessReport() {
  const { user } = useAuth()
  const [report,  setReport]  = useState<ReadinessReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [ran,     setRan]     = useState(false)

  const fetchReport = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const r = await getReadinessReport(user.id)
      setReport(r)
      setRan(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!ran && !loading) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-700">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-500" /> تقرير الجاهزية للامتحان
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">K2-Think يحلل خطتك ويقيّم مستوى جاهزيتك</p>
        </div>
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center">
            <BookOpen size={28} className="text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">حلّل جاهزيتك للامتحان</p>
            <p className="text-xs text-zinc-400 mt-1">سيراجع الذكاء الاصطناعي تغطيتك لكل مادة وإيقاع مذاكرتك</p>
          </div>
          <button
            onClick={fetchReport}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
          >
            <Sparkles size={14} />
            حلّل خطتي الآن
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-8 flex flex-col items-center gap-3 shadow-sm">
        <Loader2 size={28} className="text-primary-500 animate-spin" />
        <p className="text-sm text-zinc-500">K2-Think بيحلل بياناتك...</p>
      </div>
    )
  }

  if (!report) return null

  const daysText = report.daysLeft !== null
    ? (report.daysLeft <= 0 ? 'الامتحان اليوم!' : `${report.daysLeft} يوم على الامتحان`)
    : 'لم يُحدد تاريخ'

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-700">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">تقرير الجاهزية</h3>
          <p className="text-xs text-zinc-400">{daysText}</p>
        </div>
        <button onClick={fetchReport} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* Score + AI summary */}
        <div className="flex gap-4 items-center">
          <CircularScore pct={report.overallPct} />
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed flex-1">{report.aiSummary}</p>
        </div>

        {/* ── Risk of Failure Prediction ── */}
        {(() => {
          const meta = RISK_META[report.riskLevel]
          return (
            <div className={`p-4 rounded-xl border ${meta.bg} ${meta.border}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${meta.text}`}>
                  Risk of Failure Prediction
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${meta.text} ${meta.border} bg-white/40 dark:bg-black/20`}>
                  {meta.label}
                </span>
              </div>
              <p className={`text-3xl font-black leading-none mb-0.5 ${meta.text}`}>
                {report.completionProbability}%
              </p>
              <p className={`text-xs opacity-60 mb-2 ${meta.text}`}>احتمال إنهاء الخطة قبل الامتحان</p>
              {report.riskFactors.length > 0 && (
                <ul className="space-y-0.5">
                  {report.riskFactors.map((f, i) => (
                    <li key={i} className={`text-xs flex items-start gap-1 ${meta.text}`}>
                      <span className="opacity-40 shrink-0 mt-0.5">›</span>{f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })()}

        {/* Subjects */}
        {report.subjects.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">تغطية المواد</p>
            {report.subjects.map(s => <SubjectRow key={s.name} s={s} />)}
          </div>
        )}

        {/* Warnings */}
        {report.warnings.length > 0 && (
          <div className="space-y-1.5">
            {report.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
                <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">توصيات</p>
            {report.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900">
                <CheckCircle2 size={13} className="text-primary-500 shrink-0 mt-0.5" />
                <p className="text-xs text-primary-700 dark:text-primary-300">{r}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Re-export Sparkles icon locally to avoid import issue
function Sparkles({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  )
}
