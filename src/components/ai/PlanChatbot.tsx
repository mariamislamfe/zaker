import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircle, X, Send, Bot, User, CheckCircle2, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { processChatMessage, type ChatMessage } from '../../services/aiChatEngine'

// ─── Welcome message ──────────────────────────────────────────────────────────

const WELCOME: ChatMessage = {
  id:        'welcome',
  role:      'assistant',
  content:   'مرحباً! 👋 أنا مساعدك الذكي لإدارة جدول مذاكرتك.\n\nاقدر أساعدك:\n• تضيف دروس أو جلسات جديدة\n• تنقل مواعيد لأيام تانية\n• تقسّم LO إلى أجزاء أصغر\n• تعدّل أو تحذف أي تاسك\n\nI also speak English — just type!\n\nكلمني بالتفاصيل وأنا هرتب خطتك 💪',
  timestamp: new Date().toISOString(),
}

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      {[0, 150, 300].map(delay => (
        <div
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onPlanChanged?: () => void
}

export function PlanChatbot({ onPlanChanged }: Props) {
  const { user } = useAuth()

  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending || !user) return

    const content = input.trim()
    const userMsg: ChatMessage = {
      id:        Date.now().toString(),
      role:      'user',
      content,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const result = await processChatMessage(
        user.id,
        content,
        messages.map(m => ({ role: m.role, content: m.content })),
      )

      setMessages(prev => [...prev, {
        id:              (Date.now() + 1).toString(),
        role:            'assistant',
        content:         result.reply,
        actionsExecuted: result.actionsExecuted,
        timestamp:       new Date().toISOString(),
      }])

      if (result.actionsExecuted > 0) onPlanChanged?.()
    } catch {
      setMessages(prev => [...prev, {
        id:        (Date.now() + 1).toString(),
        role:      'assistant',
        content:   'حصل خطأ. حاول تاني من فضلك.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }, [input, sending, user, messages, onPlanChanged])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Count unread assistant messages (since last close) — use for badge
  const lastActionCount = messages.filter(m => m.role === 'assistant').length - 1  // -1 for welcome

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="فتح المساعد الذكي / Open AI Assistant"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 active:scale-95 text-white shadow-xl hover:shadow-2xl transition-all flex items-center justify-center"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-[390px] h-[540px] flex flex-col rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary-600 text-white shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">AI Study Planner</p>
              <p className="text-[11px] text-primary-200 leading-tight">Powered by K2Think · بالعربي والإنجليزي</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={[
                  'flex gap-2 items-end',
                  msg.role === 'user' ? 'flex-row-reverse' : '',
                ].join(' ')}
              >
                {/* Avatar */}
                <div className={[
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                  msg.role === 'user'
                    ? 'bg-primary-100 dark:bg-primary-900'
                    : 'bg-zinc-100 dark:bg-zinc-800',
                ].join(' ')}>
                  {msg.role === 'user'
                    ? <User size={12} className="text-primary-600 dark:text-primary-400" />
                    : <Bot  size={12} className="text-zinc-500" />}
                </div>

                {/* Bubble */}
                <div className={[
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line',
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-none'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-none',
                ].join(' ')}>
                  {msg.content}

                  {/* Actions executed badge */}
                  {msg.actionsExecuted != null && msg.actionsExecuted > 0 && (
                    <p className="flex items-center gap-1 mt-1.5 text-[11px] text-emerald-400 font-semibold">
                      <CheckCircle2 size={11} />
                      {msg.actionsExecuted} تغيير تم حفظه ✓
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex gap-2 items-end">
                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-zinc-500" />
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-none">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggested quick actions */}
          {messages.length === 1 && !sending && (
            <div className="px-3 pb-1 flex flex-wrap gap-1.5">
              {[
                'إيه تاسكاتي النهارده؟',
                'أضيف درس',
                'انقل تاسك',
                'اقسم LO',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50) }}
                  className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-primary-50 dark:hover:bg-primary-950 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 px-3 py-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={sending}
                placeholder="اكتب هنا... / Type here..."
                dir="auto"
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-9 h-9 rounded-xl bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
