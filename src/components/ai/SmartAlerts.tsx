import React, { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { getSmartAlerts, type SmartAlert } from '../../services/aiAnalytics'
import { useAuth } from '../../contexts/AuthContext'

const LEVEL_META = {
  danger:  { icon: <AlertCircle  size={13} />, bg: 'bg-red-50 dark:bg-red-950/30',    border: 'border-red-200 dark:border-red-800',    text: 'text-red-700 dark:text-red-300'    },
  warning: { icon: <AlertTriangle size={13} />, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
  info:    { icon: <Info          size={13} />, bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300'   },
}

interface Props {
  className?: string
}

export function SmartAlerts({ className = '' }: Props) {
  const { user }    = useAuth()
  const [alerts,    setAlerts]    = useState<SmartAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!user) return
    try {
      const a = await getSmartAlerts(user.id)
      setAlerts(a)
    } catch {
      // silently fail — alerts are non-critical
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className={`space-y-1.5 ${className}`}>
      {visible.map(alert => {
        const meta = LEVEL_META[alert.level]
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${meta.bg} ${meta.border}`}
          >
            <span className={meta.text}>{meta.icon}</span>
            <p className={`flex-1 text-xs font-medium ${meta.text}`}>{alert.message}</p>
            <button
              onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
              className={`${meta.text} opacity-50 hover:opacity-100 transition-opacity shrink-0`}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
