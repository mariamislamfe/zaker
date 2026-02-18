import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X, Timer } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { FloatingTimer } from '../timer/FloatingTimer'
import { usePiPTimer } from '../../hooks/usePiPTimer'
import { useTimerContext } from '../../contexts/TimerContext'
import { useSubjects } from '../../hooks/useSubjects'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Fallback in-browser widget for browsers that don't support Document PiP
  const [fallbackVisible, setFallbackVisible] = useState(false)

  const { timerState, elapsed, breakElapsed, startBreak, endBreak, stopSession } = useTimerContext()
  const { subjects } = useSubjects()

  const activeSubject = subjects.find(s => s.id === timerState.subjectId)
  const isActive = timerState.status !== 'idle'

  const { isPipActive, isPipSupported, openPiP, closePiP } = usePiPTimer({
    elapsed,
    breakElapsed,
    status: timerState.status,
    subjectName: activeSubject?.name,
    subjectColor: activeSubject?.color,
    activeBreakType: timerState.activeBreakType,
    onStartBreak: startBreak,
    onEndBreak: endBreak,
    onStop: stopSession,
  })

  async function handleMiniTimerClick() {
    if (isPipActive) {
      closePiP()
      return
    }
    if (isPipSupported) {
      const opened = await openPiP()
      if (!opened) setFallbackVisible(v => !v)
    } else {
      setFallbackVisible(v => !v)
    }
  }

  const miniTimerOn = isPipActive || fallbackVisible

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 flex">
            <Sidebar />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 lg:justify-end">
          {/* Mobile: hamburger + logo */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 lg:hidden flex-1">
            Zaker
          </span>

          {/* Mini Timer / PiP button — only when a session is active */}
          {isActive && (
            <button
              onClick={handleMiniTimerClick}
              title={
                isPipActive
                  ? 'Close overlay window'
                  : isPipSupported
                  ? 'Pop out — stays on top of everything'
                  : 'Toggle mini timer'
              }
              className={[
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                miniTimerOn
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800',
              ].join(' ')}
            >
              <Timer size={14} />
              <span className="hidden sm:inline">Mini Timer</span>
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Fallback in-browser floating widget (non-PiP browsers) */}
      {isActive && fallbackVisible && (
        <FloatingTimer
          elapsed={elapsed}
          breakElapsed={breakElapsed}
          status={timerState.status}
          subjectName={activeSubject?.name}
          subjectColor={activeSubject?.color}
          activeBreakType={timerState.activeBreakType}
          onStartBreak={startBreak}
          onEndBreak={endBreak}
          onStop={stopSession}
          onClose={() => setFallbackVisible(false)}
        />
      )}
    </div>
  )
}
