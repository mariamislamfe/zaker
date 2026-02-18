/**
 * Format seconds into HH:MM:SS display string.
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

/**
 * Format seconds into a human-readable string like "2h 30m".
 */
export function formatHumanDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}

/**
 * Convert seconds to decimal hours, rounded to 2 decimal places.
 */
export function toHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100
}

/**
 * Generate a random hex color.
 */
export function randomColor(): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#3b82f6', '#a855f7', '#f43f5e', '#84cc16', '#0ea5e9',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Lighten a hex color for background usage.
 */
export function lightenColor(hex: string, amount = 0.85): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `rgb(${lr}, ${lg}, ${lb})`
}
