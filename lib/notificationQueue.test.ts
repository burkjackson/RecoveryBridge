import { describe, it, expect } from 'vitest'
import { decideDelivery, type DeliveryPreferences } from './notificationQueue'

// A UTC instant whose New York local time is the given hour. 2026-07-06 is EDT (UTC-4).
function edt(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 6, 6, hour + 4, minute))
}

function prefs(overrides: Partial<DeliveryPreferences> = {}): DeliveryPreferences {
  return {
    announcement_notifications_enabled: true,
    reengagement_notifications_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '23:00',
    quiet_hours_end: '07:00',
    quiet_hours_timezone: 'America/New_York',
    ...overrides,
  }
}

describe('decideDelivery — consent', () => {
  it('sends an announcement when the preference is on', () => {
    expect(decideDelivery(prefs(), 'announcement', edt(12))).toEqual({ action: 'send' })
  })

  it('skips an announcement when the user opted out', () => {
    expect(decideDelivery(prefs({ announcement_notifications_enabled: false }), 'announcement', edt(12)))
      .toEqual({ action: 'skip', reason: 'announcements_disabled' })
  })

  it('treats a null announcement preference as on — the column defaults to true', () => {
    expect(decideDelivery(prefs({ announcement_notifications_enabled: null }), 'announcement', edt(12)))
      .toEqual({ action: 'send' })
  })

  it('sends a check-in only on an explicit opt-in', () => {
    expect(decideDelivery(prefs(), 'reengagement', edt(12))).toEqual({ action: 'send' })
  })

  it('skips a check-in when the preference is false', () => {
    expect(decideDelivery(prefs({ reengagement_notifications_enabled: false }), 'reengagement', edt(12)))
      .toEqual({ action: 'skip', reason: 'reengagement_not_opted_in' })
  })

  it('skips a check-in when the preference is null — opt-in means explicit', () => {
    expect(decideDelivery(prefs({ reengagement_notifications_enabled: null }), 'reengagement', edt(12)))
      .toEqual({ action: 'skip', reason: 'reengagement_not_opted_in' })
  })

  it('does not let the announcement preference gate a check-in, or vice versa', () => {
    const announcementsOff = prefs({ announcement_notifications_enabled: false })
    expect(decideDelivery(announcementsOff, 'reengagement', edt(12))).toEqual({ action: 'send' })

    const checkinsOff = prefs({ reengagement_notifications_enabled: false })
    expect(decideDelivery(checkinsOff, 'announcement', edt(12))).toEqual({ action: 'send' })
  })
})

describe('decideDelivery — quiet hours', () => {
  it('defers rather than dropping, so the message still lands later', () => {
    const p = prefs({ quiet_hours_enabled: true })
    expect(decideDelivery(p, 'announcement', edt(23, 30))).toEqual({
      action: 'defer',
      reason: 'quiet_hours',
    })
  })

  it('sends once quiet hours are over', () => {
    const p = prefs({ quiet_hours_enabled: true })
    expect(decideDelivery(p, 'announcement', edt(8))).toEqual({ action: 'send' })
  })

  it('checks consent before quiet hours — an opted-out row is skipped, not parked', () => {
    // Deferring an opted-out row would leave it pending until it expired,
    // re-examined on every drain for nothing.
    const p = prefs({ quiet_hours_enabled: true, announcement_notifications_enabled: false })
    expect(decideDelivery(p, 'announcement', edt(23, 30))).toEqual({
      action: 'skip',
      reason: 'announcements_disabled',
    })
  })
})
