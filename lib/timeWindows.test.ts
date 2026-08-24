import { describe, it, expect } from 'vitest'
import {
  isInQuietHours,
  isWindowStartingNow,
  findWindowStartingNow,
  type QuietHoursSettings,
} from './timeWindows'

// Helper: a UTC instant whose New York local time is the given hour/minute.
// 2026-07-06 is EDT (UTC-4). 2026-01-05 is EST (UTC-5).
function edt(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 6, 6, hour + 4, minute))
}

function quietHours(overrides: Partial<QuietHoursSettings> = {}): QuietHoursSettings {
  return {
    quiet_hours_enabled: true,
    quiet_hours_start: '23:00',
    quiet_hours_end: '07:00',
    quiet_hours_timezone: 'America/New_York',
    ...overrides,
  }
}

describe('isInQuietHours', () => {
  it('returns false when disabled, regardless of time', () => {
    expect(isInQuietHours(quietHours({ quiet_hours_enabled: false }), edt(23, 30))).toBe(false)
    expect(isInQuietHours(quietHours({ quiet_hours_enabled: null }), edt(23, 30))).toBe(false)
  })

  describe('cross-midnight range (23:00 → 07:00)', () => {
    it('is quiet late at night, before midnight', () => {
      expect(isInQuietHours(quietHours(), edt(23, 0))).toBe(true)
      expect(isInQuietHours(quietHours(), edt(23, 59))).toBe(true)
    })

    it('is quiet after midnight, before the end', () => {
      expect(isInQuietHours(quietHours(), edt(0, 0))).toBe(true)
      expect(isInQuietHours(quietHours(), edt(6, 59))).toBe(true)
    })

    it('is not quiet during the day', () => {
      expect(isInQuietHours(quietHours(), edt(7, 0))).toBe(false)
      expect(isInQuietHours(quietHours(), edt(12, 0))).toBe(false)
      expect(isInQuietHours(quietHours(), edt(22, 59))).toBe(false)
    })
  })

  describe('same-day range (09:00 → 17:00)', () => {
    const daytime = quietHours({ quiet_hours_start: '09:00', quiet_hours_end: '17:00' })

    it('is quiet inside the range (start inclusive, end exclusive)', () => {
      expect(isInQuietHours(daytime, edt(9, 0))).toBe(true)
      expect(isInQuietHours(daytime, edt(16, 59))).toBe(true)
      expect(isInQuietHours(daytime, edt(17, 0))).toBe(false)
    })

    it('is not quiet outside the range', () => {
      expect(isInQuietHours(daytime, edt(8, 59))).toBe(false)
      expect(isInQuietHours(daytime, edt(20, 0))).toBe(false)
    })
  })

  it('respects the listener timezone', () => {
    // 23:30 in New York is 20:30 in Los Angeles — LA listener is not yet quiet
    const la = quietHours({ quiet_hours_timezone: 'America/Los_Angeles' })
    expect(isInQuietHours(la, edt(23, 30))).toBe(false)
    // But 02:30 NY = 23:30 LA → quiet
    expect(isInQuietHours(la, edt(2, 30))).toBe(true)
  })

  it('falls back to Eastern defaults when fields are null', () => {
    const nulls = quietHours({
      quiet_hours_start: null,
      quiet_hours_end: null,
      quiet_hours_timezone: null,
    })
    expect(isInQuietHours(nulls, edt(23, 30))).toBe(true)
    expect(isInQuietHours(nulls, edt(12, 0))).toBe(false)
  })
})

describe('isWindowStartingNow', () => {
  // edt(19, 5) = Monday 2026-07-06 19:05 in New York
  const monday7pm = [{ day: 1, start: '19:00', end: '21:00' }]

  it('matches when now is within tolerance after the window start', () => {
    expect(isWindowStartingNow(monday7pm, 'America/New_York', 20, edt(19, 0))).toBe(true)
    expect(isWindowStartingNow(monday7pm, 'America/New_York', 20, edt(19, 19))).toBe(true)
  })

  it('does not match before the start or past the tolerance', () => {
    expect(isWindowStartingNow(monday7pm, 'America/New_York', 20, edt(18, 59))).toBe(false)
    expect(isWindowStartingNow(monday7pm, 'America/New_York', 20, edt(19, 20))).toBe(false)
  })

  it('does not match on a different day of week', () => {
    const tuesday = [{ day: 2, start: '19:00', end: '21:00' }]
    expect(isWindowStartingNow(tuesday, 'America/New_York', 20, edt(19, 5))).toBe(false)
  })

  it('evaluates the window in the given timezone', () => {
    // 19:05 NY is 16:05 LA — an LA 16:00 window matches, an LA 19:00 window does not
    expect(isWindowStartingNow([{ day: 1, start: '16:00', end: '18:00' }], 'America/Los_Angeles', 20, edt(19, 5))).toBe(true)
    expect(isWindowStartingNow(monday7pm, 'America/Los_Angeles', 20, edt(19, 5))).toBe(false)
  })

  it('handles multiple windows and empty schedules', () => {
    const schedule = [
      { day: 0, start: '08:00', end: '10:00' },
      { day: 1, start: '19:00', end: '21:00' },
    ]
    expect(isWindowStartingNow(schedule, 'America/New_York', 20, edt(19, 5))).toBe(true)
    expect(isWindowStartingNow([], 'America/New_York', 20, edt(19, 5))).toBe(false)
  })

  it('matches a window starting exactly at midnight', () => {
    const midnight = [{ day: 1, start: '00:00', end: '02:00' }]
    expect(isWindowStartingNow(midnight, 'America/New_York', 20, edt(0, 10))).toBe(true)
  })
})

describe('findWindowStartingNow', () => {
  const monday7pm = [{ day: 1, start: '19:00', end: '21:00' }]

  it('returns a key identifying the specific occurrence', () => {
    const match = findWindowStartingNow(monday7pm, 'America/New_York', 90, edt(19, 5))
    expect(match?.key).toBe('2026-07-06|1|19:00')
    expect(match?.window).toEqual(monday7pm[0])
  })

  it('returns the same key across every run inside the window', () => {
    // This is what makes a wide tolerance safe: the caller stores the key, so
    // three cron runs inside one window still produce a single push.
    const keys = [edt(19, 0), edt(19, 21), edt(20, 15)].map(
      t => findWindowStartingNow(monday7pm, 'America/New_York', 90, t)?.key
    )
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe('2026-07-06|1|19:00')
  })

  it('keys the same weekly window differently on a later date', () => {
    const thisWeek = findWindowStartingNow(monday7pm, 'America/New_York', 90, edt(19, 5))
    // Same wall-clock Monday slot, one week on.
    const nextWeek = findWindowStartingNow(
      monday7pm,
      'America/New_York',
      90,
      new Date(Date.UTC(2026, 6, 13, 23, 5))
    )
    expect(nextWeek?.key).toBe('2026-07-13|1|19:00')
    expect(nextWeek?.key).not.toBe(thisWeek?.key)
  })

  it('still catches a window start that the cron cadence skipped over', () => {
    // The bug this fixes: no run landed in the first 20 minutes, so the old
    // tolerance missed the window entirely. A 35-minute gap is within observed
    // cron behaviour.
    expect(isWindowStartingNow(monday7pm, 'America/New_York', 20, edt(19, 35))).toBe(false)
    expect(findWindowStartingNow(monday7pm, 'America/New_York', 90, edt(19, 35))).not.toBeNull()
  })

  it('never announces a window that has already ended', () => {
    // Tolerance is 90 min but the window is only 30 — matching must stop at 09:30,
    // not run on for an hour after the window closed.
    const shortWindow = [{ day: 1, start: '09:00', end: '09:30' }]
    expect(findWindowStartingNow(shortWindow, 'America/New_York', 90, edt(9, 29))).not.toBeNull()
    expect(findWindowStartingNow(shortWindow, 'America/New_York', 90, edt(9, 30))).toBeNull()
    expect(findWindowStartingNow(shortWindow, 'America/New_York', 90, edt(10, 0))).toBeNull()
  })

  it('allows the full tolerance for a window running past midnight', () => {
    // end <= start means the window crosses midnight, so the end must not be
    // read as "already over" the moment it starts.
    const overnight = [{ day: 1, start: '22:00', end: '02:00' }]
    expect(findWindowStartingNow(overnight, 'America/New_York', 90, edt(22, 45))).not.toBeNull()
    expect(findWindowStartingNow(overnight, 'America/New_York', 90, edt(23, 31))).toBeNull()
  })

  it('picks the most recently started window when two overlap', () => {
    // Array order must not decide, or the stored dedupe key could flip between
    // runs and buzz the same person twice.
    const a = { day: 1, start: '09:00', end: '12:00' }
    const b = { day: 1, start: '09:30', end: '11:00' }
    const at945 = edt(9, 45)
    expect(findWindowStartingNow([a, b], 'America/New_York', 90, at945)?.key).toBe('2026-07-06|1|09:30')
    expect(findWindowStartingNow([b, a], 'America/New_York', 90, at945)?.key).toBe('2026-07-06|1|09:30')
  })

  it('returns null when nothing matches', () => {
    expect(findWindowStartingNow(monday7pm, 'America/New_York', 90, edt(18, 59))).toBeNull()
    expect(findWindowStartingNow([], 'America/New_York', 90, edt(19, 5))).toBeNull()
  })
})
