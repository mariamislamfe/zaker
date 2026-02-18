import React from 'react'
import { Moon, Utensils, Coffee } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { BreakType } from '../../types'

interface BreakModalProps {
  open: boolean
  onClose: () => void
  onStart: (type: BreakType) => void
}

const BREAK_OPTIONS: { type: BreakType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    type: 'prayer',
    label: 'Prayer',
    description: 'Salah break',
    icon: <Moon size={20} />,
    color: '#6366f1',
  },
  {
    type: 'meal',
    label: 'Meal',
    description: 'Eat & drink',
    icon: <Utensils size={20} />,
    color: '#f97316',
  },
  {
    type: 'rest',
    label: 'Rest',
    description: 'Short break',
    icon: <Coffee size={20} />,
    color: '#10b981',
  },
]

export function BreakModal({ open, onClose, onStart }: BreakModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Take a Break" maxWidth="sm">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
        Your session will be paused. Select the type of break:
      </p>
      <div className="grid grid-cols-3 gap-3">
        {BREAK_OPTIONS.map(({ type, label, description, icon, color }) => (
          <button
            key={type}
            onClick={() => { onStart(type); onClose() }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-current hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group"
            style={{ '--hover-color': color } as React.CSSProperties}
          >
            <span
              className="p-2.5 rounded-full text-white"
              style={{ backgroundColor: color }}
            >
              {icon}
            </span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
            <span className="text-xs text-zinc-400">{description}</span>
          </button>
        ))}
      </div>
      <Button variant="ghost" className="w-full mt-4" onClick={onClose}>
        Cancel
      </Button>
    </Modal>
  )
}
