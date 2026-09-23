// Timezone-aware time-window checks shared by the notification and
// scheduled-availability API routes. Pure functions (injectable `now`)
// so the cross-midnight and DST edge cases can be unit tested.
//
// Uses Intl.DateTimeFormat.formatToParts rather than parsing
// toLocaleString output — the locale string's separators vary across
// ICU/Node versions (e.g. "Mon, 19:05" vs "Mon 19:05"), which silently
// broke matching in production.

export interface QuietHoursSettings {
  quiet_hours_enabled: boolean | null
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  quiet_hours_timezone: string | null
}

export interface AvailabilityWindow {
  day: number   // 0=Sun, 1=Mon, ..., 6=Sat
  start: string // "HH:MM" 24h
  end: string   // "HH:MM" 24h
}

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Local wall-clock time in the given timezone: day of week, "HH:MM" (h23), and
// the local calendar date (used to identify one specific occurrence of a window).
function localParts(
  now: Date,
  timeZone: string
): { dayOfWeek: number; timeStr: string; dateStr: string } | null {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
  } catch {
    return null // invalid timezone string
  }
  const get = (type: Intl.DateTimeFormatPart['type']) => parts.find(p => p.type === type)?.value
  const dayOfWeek = DAY_MAP[get('weekday') ?? '']
  const hour = get('hour')
  const minute = get('minute')
  const year = get('year')
  const month = get('month')
  const day = get('day')
  if (dayOfWeek === undefined || !hour || !minute || !year || !month || !day) return null
  return { dayOfWeek, timeStr: `${hour}:${minute}`, dateStr: `${year}-${month}-${day}` }
}

// Check if a listener is currently in their quiet hours (Do Not Disturb)
export function isInQuietHours(listener: QuietHoursSettings, now: Date = new Date()): boolean {
  if (!listener.quiet_hours_enabled) return false

  const tz = listener.quiet_hours_timezone || 'America/New_York'
  const start = listener.quiet_hours_start || '23:00'
  const end = listener.quiet_hours_end || '07:00'

  const local = localParts(now, tz)
  if (!local) return false
  const { timeStr } = local

  if (start <= end) {
    // Same-day range (e.g., 09:00 → 17:00)
    return timeStr >= start && timeStr < end
  } else {
    // Cross-midnight range (e.g., 23:00 → 07:00)
    return timeStr >= start || timeStr < end
  }
}

function toMinutes(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

/**
 * Find an availability window that started within the last `toleranceMin`
 * minutes (in the user's timezone), and return a key identifying that specific
 * occurrence of it.
 *
 * The key is what makes a generous tolerance safe. The cron cadence is not
 * dependable — GitHub Actions throttles the nominal every-15-minutes schedule,
 * and gaps of 30+ minutes are routine — so the tolerance has to be wide
 * enough that some run
 * lands inside it. Without a key, a wide tolerance would re-notify on every run
 * inside the window; the caller stores the key and skips anyone already
 * notified for that occurrence, so each window start produces exactly one push.
 *
 * The match is also capped at the window's own end, so a late-firing cron never
 * announces a window that has already closed.
 */
export function findWindowStartingNow(
  windows: AvailabilityWindow[],
  timezone: string,
  toleranceMin: number,
  now: Date = new Date()
): { window: AvailabilityWindow; key: string } | null {
  const local = localParts(now, timezone)
  if (!local) return null
  const currentMinutes = toMinutes(local.timeStr)
  if (currentMinutes === null) return null

  // A window that started late yesterday (e.g. 23:15) can still be inside its
  // tolerance after local midnight — the cron's actual cadence is generous
  // and irregular (see the header comment), so "now" and "the window's
  // start" can land on opposite sides of a day boundary in the listener's
  // own timezone. Matching strictly on `w.day === local.dayOfWeek` skipped
  // those windows outright, no matter how generous the tolerance was.
  // Fetching yesterday's local calendar day lets a window matched that way
  // be measured on its own day's clock (today's time-of-day + 24h).
  const yesterday = localParts(new Date(now.getTime() - 24 * 60 * 60 * 1000), timezone)

  // Collect every match, then take the one that started most recently. Schedules
  // are normally non-overlapping, so this picks the same window either way; when
  // they do overlap it keeps the result independent of array order, which the
  // caller's dedupe key depends on.
  let best: { window: AvailabilityWindow; startMin: number; dateStr: string } | null = null

  for (const w of windows) {
    let currentForWindow: number
    let dateStr: string
    if (w.day === local.dayOfWeek) {
      currentForWindow = currentMinutes
      dateStr = local.dateStr
    } else if (yesterday && w.day === yesterday.dayOfWeek) {
      currentForWindow = currentMinutes + 1440
      dateStr = yesterday.dateStr
    } else {
      continue
    }

    const startMin = toMinutes(w.start)
    if (startMin === null) continue

    // A window whose end is at or before its start runs past midnight.
    const endMin = toMinutes(w.end)
    const effectiveEnd = endMin === null || endMin <= startMin ? startMin + 1440 : endMin
    const cap = Math.min(startMin + toleranceMin, effectiveEnd)

    if (currentForWindow >= startMin && currentForWindow < cap) {
      if (!best || startMin > best.startMin) best = { window: w, startMin, dateStr }
    }
  }

  if (!best) return null
  return { window: best.window, key: `${best.dateStr}|${best.window.day}|${best.window.start}` }
}

// Boolean convenience wrapper around findWindowStartingNow.
export function isWindowStartingNow(
  windows: AvailabilityWindow[],
  timezone: string,
  toleranceMin: number,
  now: Date = new Date()
): boolean {
  return findWindowStartingNow(windows, timezone, toleranceMin, now) !== null
}
