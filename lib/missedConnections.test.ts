import { describe, it, expect } from 'vitest'
import {
  seekersNeedingFollowUp,
  summariseSessions,
  unansweredSessions,
} from './missedConnections'

const answered = (seeker_id: string | null) => ({ seeker_id, listenerReplied: true })
const ignored = (seeker_id: string | null) => ({ seeker_id, listenerReplied: false })

describe('seekersNeedingFollowUp', () => {
  it('follows up with a seeker who never got a session', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [])).toEqual([{ id: 'a' }])
  })

  // The bug this exists to prevent: an apology for a conversation that happened.
  it('excludes a seeker who actually had a conversation', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [answered('a')])).toEqual([])
  })

  // The bug found on 25 Aug 2026: a listener tapped through and never typed,
  // and the seeker was counted as helped.
  it('still follows up when the listener never replied', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [ignored('a')])).toEqual([{ id: 'a' }])
  })

  it('lets a later real conversation cancel an earlier silent one', () => {
    // Ignored at 09:54, genuinely helped at 09:56 — no apology.
    expect(seekersNeedingFollowUp([{ id: 'a' }], [ignored('a'), answered('a')])).toEqual([])
  })

  it('separates the connected from the genuinely missed in one batch', () => {
    const out = seekersNeedingFollowUp(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [answered('b'), ignored('c')]
    )
    expect(out).toEqual([{ id: 'a' }, { id: 'c' }])
  })

  it('is unbothered by several sessions for the same seeker', () => {
    const out = seekersNeedingFollowUp(
      [{ id: 'a' }, { id: 'b' }],
      [answered('a'), answered('a'), answered('a')]
    )
    expect(out).toEqual([{ id: 'b' }])
  })

  it('ignores a null seeker_id rather than treating it as a match', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [answered(null)])).toEqual([{ id: 'a' }])
  })

  it('ignores sessions belonging to other people', () => {
    expect(seekersNeedingFollowUp([{ id: 'a' }], [answered('z')])).toEqual([{ id: 'a' }])
  })

  it('preserves the caller row, not just the id', () => {
    const rows = [{ id: 'a', last_heartbeat_at: null }]
    expect(seekersNeedingFollowUp(rows, [])[0]).toBe(rows[0])
  })
})

describe('summariseSessions', () => {
  const session = { id: 's1', seeker_id: 'seek', listener_id: 'lis' }

  it('marks a session where only the seeker wrote', () => {
    const [out] = summariseSessions([session], [{ session_id: 's1', sender_id: 'seek' }])
    expect(out.seekerWrote).toBe(true)
    expect(out.listenerReplied).toBe(false)
  })

  it('marks a real two-way conversation', () => {
    const [out] = summariseSessions([session], [
      { session_id: 's1', sender_id: 'seek' },
      { session_id: 's1', sender_id: 'lis' },
    ])
    expect(out.seekerWrote).toBe(true)
    expect(out.listenerReplied).toBe(true)
  })

  it('marks a session nobody spoke in', () => {
    const [out] = summariseSessions([session], [])
    expect(out.seekerWrote).toBe(false)
    expect(out.listenerReplied).toBe(false)
  })

  it('does not let another session’s messages leak in', () => {
    const [out] = summariseSessions([session], [{ session_id: 'other', sender_id: 'lis' }])
    expect(out.listenerReplied).toBe(false)
  })

  it('ignores a null sender', () => {
    const [out] = summariseSessions([session], [{ session_id: 's1', sender_id: null }])
    expect(out.seekerWrote).toBe(false)
  })
})

describe('unansweredSessions', () => {
  it('picks out the seeker who wrote into silence', () => {
    const rows = [
      { id: 'a', seekerWrote: true, listenerReplied: false },
      { id: 'b', seekerWrote: true, listenerReplied: true },
      { id: 'c', seekerWrote: false, listenerReplied: false },
    ]
    expect(unansweredSessions(rows).map((r) => r.id)).toEqual(['a'])
  })

  it('excludes a session nobody typed in — that is a walk-away, not a snub', () => {
    expect(unansweredSessions([{ seekerWrote: false, listenerReplied: false }])).toEqual([])
  })
})
