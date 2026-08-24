import { describe, it, expect } from 'vitest'
import { seekersNeedingFollowUp } from './missedConnections'

describe('seekersNeedingFollowUp', () => {
  it('follows up with a seeker who never got a session', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [])).toEqual([{ id: 'a' }])
  })

  // The bug this exists to prevent: an apology for a conversation that happened.
  it('excludes a seeker who actually had a conversation', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [{ seeker_id: 'a' }])).toEqual([])
  })

  it('separates the connected from the genuinely missed in one batch', () => {
    const out = seekersNeedingFollowUp(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [{ seeker_id: 'b' }]
    )
    expect(out).toEqual([{ id: 'a' }, { id: 'c' }])
  })

  it('is unbothered by several sessions for the same seeker', () => {
    const out = seekersNeedingFollowUp(
      [{ id: 'a' }, { id: 'b' }],
      [{ seeker_id: 'a' }, { seeker_id: 'a' }, { seeker_id: 'a' }]
    )
    expect(out).toEqual([{ id: 'b' }])
  })

  it('ignores a null seeker_id rather than treating it as a match', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [{ seeker_id: null }])).toEqual([{ id: 'a' }])
  })

  it('ignores sessions belonging to other people', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [{ seeker_id: 'z' }])).toEqual([{ id: 'a' }])
  })

  it('preserves the caller row, not just the id', () => {
    const rows = [{ id: 'a', last_heartbeat_at: null }]
    expect(seekersNeedingFollowUp(rows, [])[0]).toBe(rows[0])
  })

  it('handles an empty batch', () => {
    expect(seekersNeedingFollowUp([], [{ seeker_id: 'a' }])).toEqual([])
  })
})
