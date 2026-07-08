import { describe, it, expect } from 'vitest'
import { parseReferralSource } from './constants'

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
