import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, CheckCircle2, AlertCircle, Loader2, Lightbulb } from 'lucide-react'
import { buildPlanFromDescription, type BuildPlanResult } from '../../services/aiPlanBuilder'
import { useAuth } from '../../contexts/AuthContext'

// ─── Quick example prompts ─────────────────────────────────────────────────────

const EXAMPLES = [
  'عندي امتحان فيزياء بعد 3 أسابيع، كيناماتيكس 5 سيشن، ديناميكس 8 سيشن، وأنا ضعيف في الثيرمو 6 سيشن',
  'I have a Math exam in 2 weeks: Calculus 4 sessions, Linear Algebra 6 sessions, Statistics 3 sessions',
  'امتحان كيمياء بعد شهر: عضوي 10 سيشن، غير عضوي 7 سيشن، فيزيائية 4 سيشن',
]

// ─── Typing animation ─────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
      <Loader2 size={14} className="animate-spin" />
      <span>الذكاء الاصطناعي بيحلل ويبني خطتك...</span>
      <span className="flex gap-0.5">
        {[0,150,300].map(d => (
          <span key={d} className="w-1 h-1 rounded-full bg-primary-500 animate-bounce inline-block" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ result, onBuildAnother }: { result: BuildPlanResult; onBuildAnother: () => void }) {
  if (!result.success) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700 dark:text-red-300">{result.reply}</p>
          <button onClick={onBuildAnother} className="mt-2 text-xs text-red-500 underline">حاول تاني</button>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {/* AI reply */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">{result.reply}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-800 text-center">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{result.tasksCreated}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">task تم إنشاؤها</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 text-center">
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {result.examDate ? new Date(result.examDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) : '—'}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">تاريخ الامتحان</p>
        </div>
      </div>

      <button
        onClick={onBuildAnother}
        className="w-full py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        ابني خطة جديدة
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  onPlanBuilt?: () => void
}

export function PlanBuilderCard({ onPlanBuilt }: Props) {
  const { user }   = useAuth()
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<BuildPlanResult | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  async function handleBuild() {
    if (!input.trim() || loading || !user) return
    setLoading(true)
    setResult(null)
    try {
      const res = await buildPlanFromDescription(user.id, input.trim())
      setResult(res)
      if (res.success) {
        onPlanBuilt?.()
        setInput('')
      }
    } catch {
      setResult({ success: false, reply: 'حصل خطأ غير متوقع. حاول تاني.', tasksCreated: 0, examDate: null })
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleBuild()
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-primary-600 to-violet-600 text-white">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <h2 className="text-base font-bold">AI Study Plan Builder</h2>
        </div>
        <p className="text-xs text-white/70">صف امتحانك ومواد مذاكرتك — K2-Think هيبني خطتك الكاملة في ثوانٍ</p>
      </div>

      <div className="p-4 space-y-3">

        {result ? (
          <ResultCard result={result} onBuildAnother={() => setResult(null)} />
        ) : (
          <>
            {/* Textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
                dir="auto"
                placeholder="مثال: عندي امتحان فيزياء بعد 3 أسابيع، كيناماتيكس 5 سيشن، ديناميكس 8 سيشن، وأنا ضعيف في الثيرمو 6 سيشن..."
                rows={3}
                className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 leading-relaxed"
              />
              <p className="absolute bottom-2 left-3 text-[10px] text-zinc-300 dark:text-zinc-600 select-none">Ctrl+Enter للإرسال</p>
            </div>

            {/* Thinking animation */}
            {loading && <ThinkingDots />}

            {/* Send button */}
            {!loading && (
              <button
                onClick={handleBuild}
                disabled={!input.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Sparkles size={15} />
                ابني خطتي الآن
                <Send size={13} />
              </button>
            )}

            {/* Quick examples */}
            <div>
              <p className="flex items-center gap-1 text-[11px] text-zinc-400 mb-1.5">
                <Lightbulb size={11} /> أمثلة سريعة:
              </p>
              <div className="space-y-1">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(ex); textareaRef.current?.focus() }}
                    className="w-full text-right text-[11px] text-zinc-500 dark:text-zinc-400 px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors leading-snug"
                    dir="auto"
                  >
                    {ex.length > 80 ? ex.slice(0, 80) + '…' : ex}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
