'use client'

import { useEffect, useState } from 'react'

// Elapsed time since `since` (an ISO timestamp), ticking every second.
// Kept as its own component so the 1s re-render stays here instead of
// re-rendering the whole chat page.
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export default function SessionTimer({ since, className = '' }: { since: string; className?: string }) {
  const start = new Date(since).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (Number.isNaN(start)) return null

  return (
    <span className={`tabular-nums ${className}`} aria-label="Time in this conversation">
      {formatElapsed(now - start)}
    </span>
  )
}
