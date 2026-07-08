import { describe, it, expect } from 'vitest'
import { isInQuietHours, isWindowStartingNow, type QuietHoursSettings } from './timeWindows'

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
