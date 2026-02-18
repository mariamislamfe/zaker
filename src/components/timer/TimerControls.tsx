import React, { useState } from 'react'
import { Play, Square, Coffee, ChevronDown, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { BreakModal } from './BreakModal'
import type { Subject, BreakType } from '../../types'

interface TimerControlsProps {
  status: 'idle' | 'running' | 'on_break'
  subjects: Subject[]
  selectedSubjectId: string | null
  onSelectSubject: (id: string) => void
  onStart: () => void
  onStartBreak: (type: BreakType) => void
  onEndBreak: () => void
  onStop: () => void
  onDiscard: () => void
  startLoading?: boolean
}

export function TimerControls({
  status,
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onStart,
  onStartBreak,
  onEndBreak,
  onStop,
  onDiscard,
  startLoading = false,
}: TimerControlsProps) {
  const [breakModalOpen, setBreakModalOpen] = useState(false)
  const [showSubjects, setShowSubjects] = useState(false)

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const activeSubjects = subjects.filter(s => s.is_active)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Subject selector (only when idle) */}
      {status === 'idle' && (
        <div className="relative w-72">
          <button
            onClick={() => setShowSubjects(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:border-primary-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              {selectedSubject ? (
                <>
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedSubject.color }}
                  />
                  <span>{selectedSubject.icon} {selectedSubject.name}</span>
                </>
              ) : (
                <span className="text-zinc-400">Select a subject...</span>
              )}
            </span>
            <ChevronDown size={16} className={`transition-transform ${showSubjects ? 'rotate-180' : ''}`} />
          </button>

          {showSubjects && (
            <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
              {activeSubjects.length === 0 ? (
                <p className="px-4 py-3 text-sm text-zinc-400">No active subjects. Add one first.</p>
              ) : (
                activeSubjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onSelectSubject(s.id); setShowSubjects(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{s.icon} {s.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {status === 'idle' && (
          <Button
            size="lg"
            onClick={onStart}
            disabled={!selectedSubjectId}
            loading={startLoading}
            icon={<Play size={18} />}
          >
            Start Session
          </Button>
        )}

        {status === 'running' && (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setBreakModalOpen(true)}
              icon={<Coffee size={18} />}
            >
              Take Break
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={onStop}
              icon={<Square size={18} />}
            >
              Finish
            </Button>
          </>
        )}

        {status === 'on_break' && (
          <>
            <Button
              variant="success"
              size="lg"
              onClick={onEndBreak}
              icon={<Play size={18} />}
            >
              Resume Study
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={onStop}
              icon={<Square size={18} />}
            >
              End Session
            </Button>
          </>
        )}

        {/* Discard button (always shown when active) */}
        {status !== 'idle' && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onDiscard}
            icon={<Trash2 size={16} />}
          />
        )}
      </div>

      <BreakModal
        open={breakModalOpen}
        onClose={() => setBreakModalOpen(false)}
        onStart={onStartBreak}
      />
    </div>
  )
}
