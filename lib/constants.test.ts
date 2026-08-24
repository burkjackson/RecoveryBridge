import { describe, it, expect } from 'vitest'
import {
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
