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

// Local wall-clock time in the given timezone: day of week + "HH:MM" (h23).
function localParts(now: Date, timeZone: string): { dayOfWeek: number; timeStr: string } | null {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
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
  if (dayOfWeek === undefined || !hour || !minute) return null
  return { dayOfWeek, timeStr: `${hour}:${minute}` }
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

// Did any availability window start within the last `toleranceMin` minutes
// (in the user's timezone)? Tolerance must exceed the trigger cadence so
// scheduler jitter can't skip a window.
export function isWindowStartingNow(
  windows: AvailabilityWindow[],
  timezone: string,
  toleranceMin: number,
  now: Date = new Date()
): boolean {
  const local = localParts(now, timezone)
  if (!local) return false
  const [h, m] = local.timeStr.split(':').map(Number)
  const currentMinutes = h * 60 + m

  return windows.some(w => {
    if (w.day !== local.dayOfWeek) return false
    const [sh, sm] = w.start.split(':').map(Number)
    if (isNaN(sh) || isNaN(sm)) return false
    const windowStartMinutes = sh * 60 + sm
    return currentMinutes >= windowStartMinutes && currentMinutes < windowStartMinutes + toleranceMin
  })
}
