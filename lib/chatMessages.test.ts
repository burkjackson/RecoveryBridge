import { describe, it, expect } from 'vitest'
import { mergeMessageLists, canEditMessage } from './chatMessages'
import type { ChatMessage } from './types/database'

function msg(id: string, created_at: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { id, session_id: 's', sender_id: 'a', content: `text ${id}`, created_at, read_at: null, ...extra }
}

describe('mergeMessageLists', () => {
  const m1 = msg('1', '2026-09-28T10:00:00Z')
  const m2 = msg('2', '2026-09-28T10:01:00Z')

  it('returns the same reference when nothing changed', () => {
    const current = [m1, m2]
    expect(mergeMessageLists(current, [m1, m2])).toBe(current)
  })

  it('appends new messages in created_at order', () => {
    const m0 = msg('0', '2026-09-28T09:59:00Z')
    const out = mergeMessageLists([m1, m2], [m0])
    expect(out.map((m) => m.id)).toEqual(['0', '1', '2'])
  })

  it('does not append the same new message twice', () => {
    const m3 = msg('3', '2026-09-28T10:02:00Z')
    expect(mergeMessageLists([m1], [m3, m3])).toHaveLength(2)
  })

  it('applies an edit to a known message', () => {
    const edited = { ...m1, content: 'fixed typo', edited_at: '2026-09-28T10:02:00Z' }
    const out = mergeMessageLists([m1, m2], [edited])
    expect(out[0].content).toBe('fixed typo')
    expect(out[0].edited_at).toBe('2026-09-28T10:02:00Z')
    expect(out[1]).toBe(m2)
  })

  it('ignores a stale copy that predates an edit already shown', () => {
    const shown = { ...m1, content: 'second version', edited_at: '2026-09-28T10:03:00Z' }
    const current = [shown]
    const stale = { ...m1, content: 'first version', edited_at: '2026-09-28T10:02:00Z' }
    expect(mergeMessageLists(current, [stale])).toBe(current)
    expect(mergeMessageLists(current, [m1])).toBe(current)
  })

  it('picks up read_at without touching content', () => {
    const read = { ...m1, read_at: '2026-09-28T10:05:00Z' }
    const out = mergeMessageLists([m1], [read])
    expect(out[0].read_at).toBe('2026-09-28T10:05:00Z')
    expect(out[0].content).toBe(m1.content)
  })

  it('never clears read_at', () => {
    const current = [{ ...m1, read_at: '2026-09-28T10:05:00Z' }]
    expect(mergeMessageLists(current, [m1])).toBe(current)
  })
})

describe('canEditMessage', () => {
  const now = new Date('2026-09-28T10:00:00Z').getTime()
  const own = { sender_id: 'a', created_at: '2026-09-28T09:58:00Z' }

  it('allows the sender inside the window on an active session', () => {
    expect(canEditMessage(own, 'a', true, now)).toBe(true)
  })

  it('refuses after 5 minutes', () => {
    expect(canEditMessage({ ...own, created_at: '2026-09-28T09:55:00Z' }, 'a', true, now)).toBe(false)
  })

  it('refuses someone else’s message', () => {
    expect(canEditMessage(own, 'b', true, now)).toBe(false)
  })

  it('refuses once the session has ended', () => {
    expect(canEditMessage(own, 'a', false, now)).toBe(false)
  })

  it('refuses without a signed-in user', () => {
    expect(canEditMessage(own, null, true, now)).toBe(false)
  })
})
