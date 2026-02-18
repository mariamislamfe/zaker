import React, { useState, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { PipTimerContent } from '../components/timer/PipTimerContent'
import type { BreakType } from '../types'

interface PiPTimerProps {
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

export function usePiPTimer({
  elapsed,
  breakElapsed,
  status,
  subjectName,
  subjectColor,
  activeBreakType,
  onStartBreak,
  onEndBreak,
  onStop,
}: PiPTimerProps) {
  const [isPipActive, setIsPipActive] = useState(false)
  const pipWindowRef = useRef<Window | null>(null)
  const pipRootRef = useRef<ReturnType<typeof createRoot> | null>(null)

  const isPipSupported =
    typeof window !== 'undefined' && 'documentPictureInPicture' in window

  // ── Sync timer state into PiP window every tick ───────────────────────────
  useEffect(() => {
    const root = pipRootRef.current
    if (!root) return
    root.render(
      <PipTimerContent
        elapsed={elapsed}
        breakElapsed={breakElapsed}
        status={status}
        subjectName={subjectName}
        subjectColor={subjectColor}
        activeBreakType={activeBreakType}
        onStartBreak={onStartBreak}
        onEndBreak={onEndBreak}
        onStop={onStop}
      />
    )
  }, [elapsed, breakElapsed, status, subjectName, subjectColor, activeBreakType,
      onStartBreak, onEndBreak, onStop])

  // ── Open PiP window ───────────────────────────────────────────────────────
  async function openPiP(): Promise<boolean> {
    // Focus if already open
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus()
      return true
    }

    if (!isPipSupported) return false

    try {
      const pipWin = await (window as any).documentPictureInPicture.requestWindow({
        width: 240,
        height: 230,
      })

      // Inject minimal CSS for hover effect on break options
      const style = pipWin.document.createElement('style')
      style.textContent = `
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; background: #0f0f14; }
        button { font-family: inherit; }
        .pip-break-option:hover { background-color: rgba(255,255,255,0.09) !important; }
      `
      pipWin.document.head.appendChild(style)

      const container = pipWin.document.createElement('div')
      pipWin.document.body.appendChild(container)

      const root = createRoot(container)
      pipRootRef.current = root
      pipWindowRef.current = pipWin
      setIsPipActive(true)

      // Do the initial render immediately
      root.render(
        <PipTimerContent
          elapsed={elapsed}
          breakElapsed={breakElapsed}
          status={status}
          subjectName={subjectName}
          subjectColor={subjectColor}
          activeBreakType={activeBreakType}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          onStop={onStop}
        />
      )

      // Cleanup when browser closes the PiP window
      pipWin.addEventListener('pagehide', () => {
        root.unmount()
        pipRootRef.current = null
        pipWindowRef.current = null
        setIsPipActive(false)
      })

      return true
    } catch (err) {
      console.error('PiP failed:', err)
      return false
    }
  }

  function closePiP() {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close()
    }
  }

  return { isPipActive, isPipSupported, openPiP, closePiP }
}
