// Gentle nudge shown after a study session that was stopped early.

const REACTIONS = [
  { threshold: 900,  msg: 'Very short session 📉 — try to push a little further, even 15 more minutes. Consistency matters more than length!', icon: '📉' },
  { threshold: 1800, msg: 'Stopped early 🙁 — try a quick small task to feel a sense of achievement. E.g. review 5 pages!', icon: '⚡' },
  { threshold: 2700, msg: 'Decent session but could be better 💪 — next time aim for 45 uninterrupted minutes.', icon: '💪' },
]

export function earlyStopFeedback(elapsedSeconds: number): { msg: string; icon: string } | null {
  for (const r of REACTIONS) {
    if (elapsedSeconds < r.threshold) return { msg: r.msg, icon: r.icon }
  }
  return null
}
