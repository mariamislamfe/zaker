import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
  hover?: boolean
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }

export function Card({ children, className = '', padding = 'md', hover = false }: CardProps) {
  return (
    <div
      className={[
        'bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800',
        hover ? 'hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer' : '',
        paddingMap[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  color?: string
  icon?: React.ReactNode
}

export function StatCard({ label, value, sub, color, icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {label}
          </p>
          <p
            className="mt-1 text-2xl font-bold font-mono"
            style={{ color: color ?? undefined }}
          >
            {value}
          </p>
          {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
        </div>
        {icon && (
          <span className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {icon}
          </span>
        )}
      </div>
    </Card>
  )
}
