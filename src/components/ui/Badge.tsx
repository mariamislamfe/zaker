import React from 'react'

interface BadgeProps {
  label: string
  color?: string        // hex color for custom subject badges
  variant?: 'default' | 'outline'
  size?: 'sm' | 'md'
}

export function Badge({ label, color, variant = 'default', size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  if (color) {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full ${sizeClass}`}
        style={
          variant === 'outline'
            ? { color, borderColor: color, border: '1px solid', background: 'transparent' }
            : { color, backgroundColor: color + '20' }
        }
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full',
        sizeClass,
        variant === 'outline'
          ? 'border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
      ].join(' ')}
    >
      {label}
    </span>
  )
}

interface ColorDotProps {
  color: string
  size?: number
}

export function ColorDot({ color, size = 10 }: ColorDotProps) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}
