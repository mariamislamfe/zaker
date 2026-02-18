import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Minus, Play, Square, Coffee, GripHorizontal, Moon, Utensils } from 'lucide-react'
import { formatDuration } from '../../utils/time'
import type { BreakType } from '../../types'

interface FloatingTimerProps {
  elapsed: number
  breakElapsed: number
  status: 'idle' | 'running' | 'on_break'
  subjectName?: string
  subjectColor?: string
  activeBreakType?: BreakType | null
  onStartBreak: (type: BreakType) => void
  onEndBreak: () => void
  onStop: () => void
  onClose: () => void   // hides the widget (doesn't stop the timer)
}

const BREAK_ICONS: Record<BreakType, React.ReactNode> = {
  prayer: <Moon size={13} />,
  meal:   <Utensils size={13} />,
  rest:   <Coffee size={13} />,
}

const STORAGE_POS_KEY = 'zaker-float-pos'

function loadPos() {
  try {
    const raw = localStorage.getItem(STORAGE_POS_KEY)
    if (raw) {
      const { x, y } = JSON.parse(raw)
      return {
        x: Math.max(0, Math.min(x, window.innerWidth - 240)),
        y: Math.max(0, Math.min(y, window.innerHeight - 180)),
      }
    }
  } catch {}
  return { x: window.innerWidth - 260, y: window.innerHeight - 200 }
}

export function FloatingTimer({
  elapsed,
  breakElapsed,
  status,
  subjectName,
  subjectColor,
  activeBreakType,
  onStartBreak,
  onEndBreak,
  onStop,
  onClose,
}: FloatingTimerProps) {
  const [pos, setPos] = useState(loadPos)
  const [minimized, setMinimized] = useState(false)
  const [showBreakMenu, setShowBreakMenu] = useState(false)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)

  const isBreak = status === 'on_break'
  const isRunning = status === 'running'
  const color = subjectColor ?? '#6366f1'
  const displayTime = formatDuration(isBreak ? breakElapsed : elapsed)

  // ─── Drag handling ───────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    }
    e.preventDefault()
  }, [pos])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const x = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 240))
      const y = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 180))
      setPos({ x, y })
    }
    function onMouseUp() {
      if (dragging.current) {
        dragging.current = false
        setPos(prev => {
          localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(prev))
          return prev
        })
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Close break menu on outside click
  useEffect(() => {
    if (!showBreakMenu) return
    const handler = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setShowBreakMenu(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [showBreakMenu])

  return (
    <div
      ref={widgetRef}
      className="fixed z-[9999] select-none"
      style={{ left: pos.x, top: pos.y, width: 232 }}
    >
      <div
        className="rounded-2xl shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: 'rgba(15,15,20,0.93)',
          borderColor: isBreak ? '#f97316' : color,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* ── Title bar (drag handle) ────────────────────────── */}
        <div
          className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal size={14} className="text-zinc-600 shrink-0" />
            {subjectName && (
              <>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium text-zinc-300 truncate">
                  {subjectName}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setMinimized(v => !v)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
              title={minimized ? 'Expand' : 'Minimize'}
            >
              <Minus size={13} />
            </button>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={onClose}
              className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Hide widget"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────── */}
        {!minimized && (
          <div className="px-4 pb-4">
            <div className="flex flex-col items-center py-2">
              <span
                className="text-[2.6rem] font-bold font-mono tabular-nums leading-none"
                style={{ color: isBreak ? '#f97316' : color }}
              >
                {displayTime}
              </span>
              <span
                className={[
                  'mt-1.5 text-[10px] font-semibold uppercase tracking-widest',
                  isBreak ? 'text-orange-400' : isRunning ? 'text-emerald-400' : 'text-zinc-500',
                ].join(' ')}
              >
                {isBreak
                  ? `${activeBreakType ?? 'Break'} break`
                  : isRunning ? 'Studying' : 'Idle'}
              </span>
            </div>

            {isBreak && (
              <p className="text-center text-[11px] text-zinc-500 mb-2 -mt-1">
                Study: <span className="font-mono text-zinc-300">{formatDuration(elapsed)}</span>
              </p>
            )}

            <div className="flex items-center gap-2 mt-1 relative">
              {isRunning && (
                <>
                  <div className="flex-1 relative">
                    <button
                      onClick={() => setShowBreakMenu(v => !v)}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/10 border border-zinc-700 transition-colors"
                    >
                      <Coffee size={13} /> Break
                    </button>

                    {showBreakMenu && (
                      <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-10">
                        {(['prayer', 'meal', 'rest'] as BreakType[]).map(t => (
                          <button
                            key={t}
                            onClick={() => { onStartBreak(t); setShowBreakMenu(false) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 capitalize transition-colors"
                          >
                            {BREAK_ICONS[t]}
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={onStop}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                    style={{ backgroundColor: color }}
                  >
                    <Square size={13} /> Finish
                  </button>
                </>
              )}

              {isBreak && (
                <>
                  <button
                    onClick={onEndBreak}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                    style={{ backgroundColor: color }}
                  >
                    <Play size={13} /> Resume
                  </button>
                  <button
                    onClick={onStop}
                    className="px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-white/10 border border-zinc-700 transition-colors"
                  >
                    <Square size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {minimized && (
          <div
            className="px-4 pb-3 flex items-center justify-center cursor-pointer"
            onClick={() => setMinimized(false)}
          >
            <span
              className="text-xl font-bold font-mono tabular-nums"
              style={{ color: isBreak ? '#f97316' : color }}
            >
              {displayTime}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
