import { describe, it, expect } from 'vitest'
import {
  formatTimeAgo,
  isHeartbeatStale,
  isListenerOnline,
  parseReferralSource,
  trainingNudgeBody,
  trainingSectionsRemaining,
  LISTENER_TRAINING_SECTION_IDS,
} from './constants'

describe('parseReferralSource', () => {
  it('returns null for empty values', () => {
    expect(parseReferralSource(null)).toBeNull()
    expect(parseReferralSource(undefined)).toBeNull()
    expect(parseReferralSource('')).toBeNull()
  })

  it('parses bare category values', () => {
    expect(parseReferralSource('facebook')).toEqual({ emoji: '👍', label: 'Facebook', detail: null })
    expect(parseReferralSource('friend_family')).toEqual({ emoji: '🤝', label: 'Friend/Family', detail: null })
    expect(parseReferralSource('other')).toEqual({ emoji: '💬', label: 'Other', detail: null })
  })

  it('parses prefixed podcast and website entries with details', () => {
    expect(parseReferralSource('podcast: The Recovery Show')).toEqual({
      emoji: '🎙️', label: 'Podcast', detail: 'The Recovery Show',
    })
    expect(parseReferralSource('website: sobernation.com')).toEqual({
      emoji: '🌐', label: 'Website/Blog', detail: 'sobernation.com',
    })
  })

  it('treats unrecognized free text as Other with the text as detail', () => {
    expect(parseReferralSource('my therapist recommended it')).toEqual({
      emoji: '💬', label: 'Other', detail: 'my therapist recommended it',
    })
  })
})

describe('trainingSectionsRemaining', () => {
  const total = LISTENER_TRAINING_SECTION_IDS.length

  it('counts every section as remaining when nothing is acknowledged', () => {
    expect(trainingSectionsRemaining(null)).toBe(total)
    expect(trainingSectionsRemaining({})).toBe(total)
  })

  it('subtracts acknowledged sections', () => {
    expect(trainingSectionsRemaining({ presence: true, crisis: true })).toBe(total - 2)
  })

  it('ignores sections explicitly un-ticked', () => {
    expect(trainingSectionsRemaining({ presence: true, crisis: false })).toBe(total - 1)
  })

  it('reaches zero when all are acknowledged', () => {
    const all = Object.fromEntries(LISTENER_TRAINING_SECTION_IDS.map((id) => [id, true]))
    expect(trainingSectionsRemaining(all)).toBe(0)
  })

  it('ignores unknown keys so a removed section cannot push the count negative', () => {
    const all = Object.fromEntries(LISTENER_TRAINING_SECTION_IDS.map((id) => [id, true]))
    expect(trainingSectionsRemaining({ ...all, 'retired-section': true })).toBe(0)
  })
})

describe('trainingNudgeBody', () => {
  it('uses the singular for one remaining section', () => {
    expect(trainingNudgeBody(1)).toContain('one section left')
  })

  it('names the count for more than one', () => {
    expect(trainingNudgeBody(3)).toContain('3 sections')
  })
})

describe('formatTimeAgo', () => {
  const agoMs = (ms: number) => new Date(Date.now() - ms)

  it('returns an empty string for a missing timestamp', () => {
    expect(formatTimeAgo(null)).toBe('')
    expect(formatTimeAgo(undefined)).toBe('')
  })

  it('says "just now" under a minute', () => {
    expect(formatTimeAgo(agoMs(30 * 1000))).toBe('just now')
  })

  it('uses singular at exactly one unit', () => {
    expect(formatTimeAgo(agoMs(60 * 1000))).toBe('1 minute ago')
    expect(formatTimeAgo(agoMs(60 * 60 * 1000))).toBe('1 hour ago')
    expect(formatTimeAgo(agoMs(24 * 60 * 60 * 1000))).toBe('1 day ago')
  })

  // The case that prompted this: a listener opening a chat 13 minutes late.
  it('reports minutes for a recent gap', () => {
    expect(formatTimeAgo(agoMs(13 * 60 * 1000))).toBe('13 minutes ago')
  })

  it('rolls up to hours and days', () => {
    expect(formatTimeAgo(agoMs(3 * 60 * 60 * 1000))).toBe('3 hours ago')
    expect(formatTimeAgo(agoMs(50 * 60 * 60 * 1000))).toBe('2 days ago')
  })
})

describe('isHeartbeatStale', () => {
  it('treats a missing heartbeat as stale', () => {
    expect(isHeartbeatStale(null)).toBe(true)
  })

  it('treats a recent heartbeat as fresh', () => {
    expect(isHeartbeatStale(new Date(Date.now() - 5 * 60 * 1000).toISOString())).toBe(false)
  })

  it('treats a heartbeat over an hour old as stale', () => {
    expect(isHeartbeatStale(new Date(Date.now() - 90 * 60 * 1000).toISOString())).toBe(true)
  })
})

describe('isListenerOnline', () => {
  it('is online with a fresh heartbeat', () => {
    expect(
      isListenerOnline({
        always_available: false,
        last_heartbeat_at: new Date(Date.now() - 60 * 1000).toISOString(),
      })
    ).toBe(true)
  })

  it('is offline with a stale heartbeat', () => {
    expect(
      isListenerOnline({
        always_available: false,
        last_heartbeat_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      })
    ).toBe(false)
  })

  it('is offline with no heartbeat at all', () => {
    expect(isListenerOnline({ always_available: false, last_heartbeat_at: null })).toBe(false)
  })

  // The bug this exists to prevent: two always_available accounts kept
  // receiving support pushes with heartbeats ~a day stale, which is correct —
  // this is the one place a stale heartbeat must NOT gate delivery.
  it('bypasses the heartbeat entirely when always_available is set', () => {
    expect(
      isListenerOnline({
        always_available: true,
        last_heartbeat_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    ).toBe(true)
    expect(isListenerOnline({ always_available: true, last_heartbeat_at: null })).toBe(true)
  })
})
