import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatHumanDuration } from '../../utils/time'

interface Props {
  sessionId: string
  currentDurationSeconds: number
  subjectName: string
  subjectColor: string
  onClose: () => void
  onSaved: () => void
}

export function EditSessionModal({
  sessionId, currentDurationSeconds, subjectName, subjectColor, onClose, onSaved,
}: Props) {
  const [hours,   setHours]   = useState(Math.floor(currentDurationSeconds / 3600))
  const [minutes, setMinutes] = useState(Math.floor((currentDurationSeconds % 3600) / 60))
  const [saving,  setSaving]  = useState(false)

  const newDuration = hours * 3600 + minutes * 60
  const unchanged = newDuration === currentDurationSeconds

  async function handleSave() {
    if (newDuration <= 0 || unchanged) return
    setSaving(true)
    await supabase.from('sessions').update({ duration_seconds: newDuration }).eq('id', sessionId)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-800">

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subjectColor }} />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Edit Session Time</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 ml-[22px]">{subjectName}</p>

        {/* Duration inputs */}
        <div className="flex items-end gap-3 mb-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">Hours</label>
            <input
              type="number" min={0} max={12} value={hours}
              onChange={e => setHours(Math.max(0, Math.min(12, +e.target.value || 0)))}
              className="w-full px-3 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-center font-mono text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            />
          </div>
          <span className="text-2xl font-bold text-zinc-300 dark:text-zinc-600 pb-3">:</span>
          <div className="flex-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">Minutes</label>
            <input
              type="number" min={0} max={59} value={minutes}
              onChange={e => setMinutes(Math.max(0, Math.min(59, +e.target.value || 0)))}
              className="w-full px-3 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-center font-mono text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Preview */}
        <p className="text-center text-xs text-zinc-400 mb-5">
          {newDuration > 0 ? formatHumanDuration(newDuration) : 'Enter a duration'}
          {!unchanged && currentDurationSeconds > 0 && (
            <span className="text-zinc-300 dark:text-zinc-600"> (was {formatHumanDuration(currentDurationSeconds)})</span>
          )}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || newDuration <= 0 || unchanged}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Check size={15} />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
