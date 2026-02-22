import React, { useState } from 'react'
import { X, Check, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useSubjects } from '../../hooks/useSubjects'

interface Props {
  defaultDate?: string  // yyyy-MM-dd
  onClose: () => void
  onSaved: () => void
}

export function AddSessionModal({ defaultDate, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { subjects } = useSubjects()

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [date,      setDate]      = useState(defaultDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [hours,     setHours]     = useState(1)
  const [minutes,   setMinutes]   = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (!user)      { setError('Not logged in');       return }
    if (!subjectId) { setError('Select a subject');    return }
    const dur = hours * 3600 + minutes * 60
    if (dur <= 0)   { setError('Duration must be > 0'); return }

    const startedAt = new Date(`${date}T${startTime}:00`).toISOString()
    const endedAt   = new Date(new Date(startedAt).getTime() + dur * 1000).toISOString()

    setSaving(true)
    const { error: err } = await supabase.from('sessions').insert({
      user_id:          user.id,
      subject_id:       subjectId,
      started_at:       startedAt,
      ended_at:         endedAt,
      duration_seconds: dur,
      status:           'completed',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
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
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-primary-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Log Past Session</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">Subject</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              {subjects.length === 0 && <option value="">No subjects</option>}
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date + Start time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">Date</label>
              <input
                type="date" value={date}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">Started at</label>
              <input
                type="time" value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">Duration</label>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <input
                  type="number" min={0} max={12} value={hours}
                  onChange={e => setHours(Math.max(0, Math.min(12, +e.target.value || 0)))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-center font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                />
                <p className="text-center text-[10px] text-zinc-400 mt-1">hours</p>
              </div>
              <span className="text-xl font-bold text-zinc-300 dark:text-zinc-600 pb-5">:</span>
              <div className="flex-1">
                <input
                  type="number" min={0} max={59} value={minutes}
                  onChange={e => setMinutes(Math.max(0, Math.min(59, +e.target.value || 0)))}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-center font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                />
                <p className="text-center text-[10px] text-zinc-400 mt-1">minutes</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Check size={15} />}
            Log Session
          </button>
        </div>
      </div>
    </div>
  )
}
