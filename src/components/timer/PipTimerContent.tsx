import React, { useState } from 'react'
import { formatDuration } from '../../utils/time'
import type { BreakType } from '../../types'

interface PipTimerContentProps {
  elapsed: number
  breakElapsed: number
  status: 'idle' | 'running' | 'on_break'
  subjectName?: string
  subjectColor?: string
  activeBreakType?: BreakType | null
  onStartBreak: (type: BreakType) => void
  onEndBreak: () => void
  onStop: () => void
}

const BREAK_OPTIONS: { type: BreakType; emoji: string; label: string }[] = [
  { type: 'prayer', emoji: '🌙', label: 'Prayer' },
  { type: 'meal',   emoji: '🍽',  label: 'Meal'   },
  { type: 'rest',   emoji: '☕',  label: 'Rest'   },
]

/** Rendered inside the Document Picture-in-Picture window — inline styles only. */
export function PipTimerContent({
  elapsed,
  breakElapsed,
  status,
  subjectName,
  subjectColor,
  activeBreakType,
  onStartBreak,
  onEndBreak,
  onStop,
}: PipTimerContentProps) {
  const [showBreakMenu, setShowBreakMenu] = useState(false)

  const isBreak = status === 'on_break'
  const isRunning = status === 'running'
  const color = subjectColor ?? '#6366f1'
  const displayTime = formatDuration(isBreak ? breakElapsed : elapsed)

  // ── Inline styles (mirrors FloatingTimer dark theme) ────────────────────────
  const css = {
    root: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backgroundColor: 'rgba(15,15,20,0.97)',
      color: '#f4f4f5',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      margin: 0,
      padding: '16px',
      boxSizing: 'border-box' as const,
      userSelect: 'none' as const,
      // colored border matching subject
      outline: `2px solid ${isBreak ? '#f97316' : color}`,
      outlineOffset: '-2px',
    },
    subjectRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0 as const,
    },
    subjectName: { fontSize: 12, color: '#a1a1aa' },
    time: {
      fontFamily: '"SF Mono", "Fira Code", ui-monospace, monospace',
      fontSize: 46,
      fontWeight: 700,
      color: isBreak ? '#f97316' : color,
      lineHeight: 1,
      letterSpacing: '-0.02em',
    },
    statusLabel: {
      marginTop: 6,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      color: isBreak ? '#fb923c' : isRunning ? '#34d399' : '#71717a',
    },
    studyLine: { fontSize: 11, color: '#71717a', marginTop: 4 },
    btnRow: {
      display: 'flex',
      gap: 8,
      marginTop: 18,
      position: 'relative' as const,
    },
  } as const

  function outlineBtn(): React.CSSProperties {
    return {
      padding: '6px 14px',
      borderRadius: 8,
      backgroundColor: 'transparent',
      color: '#d4d4d8',
      border: '1px solid #3f3f46',
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      fontFamily: 'inherit',
    }
  }

  function solidBtn(): React.CSSProperties {
    return {
      padding: '6px 14px',
      borderRadius: 8,
      backgroundColor: color,
      color: '#fff',
      border: `1px solid ${color}`,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      fontFamily: 'inherit',
    }
  }

  return (
    <div style={css.root}>
      {subjectName && (
        <div style={css.subjectRow}>
          <div style={css.dot} />
          <span style={css.subjectName}>{subjectName}</span>
        </div>
      )}

      <span style={css.time}>{displayTime}</span>

      <span style={css.statusLabel}>
        {isBreak
          ? `${activeBreakType ?? 'Break'} break`
          : isRunning ? 'Studying' : 'Idle'}
      </span>

      {isBreak && (
        <span style={css.studyLine}>
          Study:{' '}
          <span style={{ color: '#a1a1aa', fontFamily: 'monospace' }}>
            {formatDuration(elapsed)}
          </span>
        </span>
      )}

      <div style={css.btnRow}>
        {/* ── Running ───────────────────────────────────── */}
        {isRunning && (
          <>
            {/* Break button + flyout */}
            <div style={{ position: 'relative' }}>
              <button
                style={outlineBtn()}
                onClick={() => setShowBreakMenu(v => !v)}
              >
                ☕ Break
              </button>

              {showBreakMenu && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: 6,
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 10,
                  overflow: 'hidden',
                  minWidth: 110,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                  zIndex: 10,
                }}>
                  {BREAK_OPTIONS.map(({ type, emoji, label }) => (
                    <button
                      key={type}
                      className="pip-break-option"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 14px',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#d4d4d8',
                        border: 'none',
                        backgroundColor: 'transparent',
                        width: '100%',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                      onClick={() => { onStartBreak(type); setShowBreakMenu(false) }}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button style={solidBtn()} onClick={onStop}>
              ■ Finish
            </button>
          </>
        )}

        {/* ── On break ──────────────────────────────────── */}
        {isBreak && (
          <>
            <button style={solidBtn()} onClick={onEndBreak}>
              ▶ Resume
            </button>
            <button style={outlineBtn()} onClick={onStop}>
              ■
            </button>
          </>
        )}
      </div>
    </div>
  )
}
