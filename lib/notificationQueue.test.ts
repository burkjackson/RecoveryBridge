import { describe, it, expect } from 'vitest'
import { decideDelivery, enqueueNotifications, fetchEnabledKinds, type DeliveryPreferences, type QueuedNotificationInput } from './notificationQueue'
import { fakeSupabase } from './test/fakeSupabase'

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

// Minimal stand-in for the one call fetchEnabledKinds makes.
function supabaseReturning(result: { data?: unknown; error?: unknown }) {
  return {
    from: () => ({ select: () => Promise.resolve(result) }),
  } as never
}

describe('fetchEnabledKinds', () => {
  it('returns only the kinds switched on', async () => {
    const kinds = await fetchEnabledKinds(
      supabaseReturning({
        data: [
          { kind: 'broadcast', enabled: true },
          { kind: 'thank_you', enabled: false },
          { kind: 'training_nudge', enabled: true },
        ],
        error: null,
      })
    )
    expect([...kinds].sort()).toEqual(['broadcast', 'training_nudge'])
  })

  it('treats a kind with no row as off', async () => {
    // A newly added notification kind must ship inert.
    const kinds = await fetchEnabledKinds(supabaseReturning({ data: [], error: null }))
    expect(kinds.has('thank_you')).toBe(false)
  })

  it('sends nothing when the settings table cannot be read', async () => {
    // Failing open here would turn a database blip into a push to everyone.
    const kinds = await fetchEnabledKinds(
      supabaseReturning({ data: null, error: { message: 'boom' } })
    )
    expect(kinds.size).toBe(0)
  })
})

describe('enqueueNotifications — dedupe', () => {
  const nudge = (userId: string): QueuedNotificationInput => ({
    userId,
    category: 'announcement',
    kind: 'training_nudge',
    title: 'Finish training',
    body: 'A few sections left',
    dedupeKey: '2026-09',
  })
  const enabled = { data: [{ kind: 'training_nudge', enabled: true }], error: null }

  it('skips a key that was already sent or skipped, not just pending', async () => {
    // Known Issue #67: checking pending rows only re-queued the same monthly
    // nudge on every cron run.
    const { client, calls } = fakeSupabase({
      tables: {
        notification_kind_settings: enabled,
        notification_queue: [
          { data: [{ user_id: 'a', kind: 'training_nudge', dedupe_key: '2026-09' }], error: null },
          { data: [{ id: 'new-row' }], error: null },
        ],
      },
    })

    const result = await enqueueNotifications(client, [nudge('a'), nudge('b')])

    expect(result).toEqual({ queued: 1, skipped: 1, blocked: 0 })
    const statusFilter = calls.find(
      (c) => c.table === 'notification_queue' && c.method === 'eq' && c.args[0] === 'status'
    )
    expect(statusFilter).toBeUndefined()
    const insert = calls.find((c) => c.table === 'notification_queue' && c.method === 'insert')
    expect((insert?.args[0] as { user_id: string }[]).map((r) => r.user_id)).toEqual(['b'])
  })

  it('counts only rows the database actually kept', async () => {
    // Migration 066's trigger drops a duplicate without an error, so the
    // insert can return fewer rows than it was sent.
    const { client } = fakeSupabase({
      tables: {
        notification_kind_settings: enabled,
        notification_queue: [
          { data: [], error: null },
          { data: [{ id: 'kept' }], error: null },
        ],
      },
    })

    const result = await enqueueNotifications(client, [nudge('a'), nudge('b')])

    expect(result).toEqual({ queued: 1, skipped: 1, blocked: 0 })
  })

  it('never creates rows for a kind that is switched off', async () => {
    const { client, calls } = fakeSupabase({
      tables: { notification_kind_settings: { data: [], error: null } },
    })

    const result = await enqueueNotifications(client, [nudge('a')])

    expect(result).toEqual({ queued: 0, skipped: 0, blocked: 1 })
    expect(calls.some((c) => c.table === 'notification_queue')).toBe(false)
  })
})
