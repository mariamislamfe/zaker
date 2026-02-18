import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { randomColor } from '../../utils/time'
import type { Subject, SubjectFormData } from '../../types'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#a855f7', '#f43f5e', '#84cc16', '#0ea5e9',
]

const PRESET_ICONS = [
  '📚', '📖', '✏️', '🧮', '🔬', '🧬', '💻', '🎨', '🎵', '🌍',
  '⚗️', '📐', '🗺️', '📜', '🧠', '🔭', '💡', '📝', '🎯', '🏛️',
]

interface SubjectFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: SubjectFormData) => Promise<void>
  subject?: Subject | null
}

export function SubjectForm({ open, onClose, onSave, subject }: SubjectFormProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(randomColor())
  const [icon, setIcon] = useState('📚')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (subject) {
      setName(subject.name)
      setColor(subject.color)
      setIcon(subject.icon)
    } else {
      setName('')
      setColor(randomColor())
      setIcon('📚')
    }
    setError(null)
  }, [subject, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Subject name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({ name: name.trim(), color, icon })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subject.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subject ? 'Edit Subject' : 'New Subject'}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Preview */}
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ backgroundColor: color + '15', border: `2px solid ${color}40` }}
        >
          <span className="text-3xl">{icon}</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            {name || 'Subject Name'}
          </span>
        </div>

        <Input
          label="Subject Name"
          placeholder="e.g. Mathematics"
          value={name}
          onChange={e => setName(e.target.value)}
          error={error ?? undefined}
          autoFocus
        />

        {/* Icon picker */}
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Icon</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_ICONS.map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={[
                  'w-9 h-9 flex items-center justify-center text-lg rounded-lg border-2 transition-all',
                  icon === i
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300',
                ].join(' ')}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Color</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={[
                  'w-7 h-7 rounded-full border-2 transition-all',
                  color === c ? 'border-zinc-900 dark:border-zinc-100 scale-125' : 'border-transparent',
                ].join(' ')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {/* Custom color input */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-zinc-300"
            />
            <span className="text-xs text-zinc-400 font-mono">{color}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="flex-1">
            {subject ? 'Save Changes' : 'Add Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
