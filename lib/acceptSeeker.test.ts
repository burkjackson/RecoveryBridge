import { describe, it, expect, vi, beforeEach } from 'vitest'

const getActiveBlockMock = vi.fn()
vi.mock('@/lib/blocks', () => ({ getActiveBlock: (...args: unknown[]) => getActiveBlockMock(...args) }))

const syncSessionRoleStatesMock = vi.fn()
vi.mock('@/lib/sessionState', () => ({
  syncSessionRoleStates: (...args: unknown[]) => syncSessionRoleStatesMock(...args),
}))

import { acceptSeeker } from './acceptSeeker'
import type { SupabaseClient } from '@supabase/supabase-js'

function fakeSupabase(insertResult: {
  data: { id: string } | null
  error: { message?: string; code?: string } | null
}) {
  return {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => insertResult,
        }),
      }),
    }),
  } as unknown as SupabaseClient
}

beforeEach(() => {
  getActiveBlockMock.mockReset()
  syncSessionRoleStatesMock.mockReset()
})

describe('acceptSeeker', () => {
  it('returns blocked and never attempts the insert when the listener is blocked', async () => {
    getActiveBlockMock.mockResolvedValue({ id: 'b1', reason: 'spam' })
    const insert = vi.fn()
    const supabase = { from: () => ({ insert }) } as unknown as SupabaseClient

    const result = await acceptSeeker(supabase, { listenerId: 'l1', seekerId: 's1' })

    expect(result).toEqual({ kind: 'blocked', reason: 'spam' })
    expect(insert).not.toHaveBeenCalled()
  })

  it('falls back to an empty reason when the block has none', async () => {
    getActiveBlockMock.mockResolvedValue({ id: 'b1', reason: null })
    const supabase = fakeSupabase({ data: null, error: null })

    const result = await acceptSeeker(supabase, { listenerId: 'l1', seekerId: 's1' })

    expect(result).toEqual({ kind: 'blocked', reason: '' })
  })

  it('creates a session and marks both participants offline', async () => {
    getActiveBlockMock.mockResolvedValue(null)
    const supabase = fakeSupabase({ data: { id: 'new1' }, error: null })

    const result = await acceptSeeker(supabase, { listenerId: 'l1', seekerId: 's1' })

    expect(result).toEqual({ kind: 'session', id: 'new1' })
    expect(syncSessionRoleStatesMock).toHaveBeenCalledWith(supabase, 'new1', 'start')
  })

  it('reports a conflict on the one-active-session-per-seeker unique violation', async () => {
    getActiveBlockMock.mockResolvedValue(null)
    const supabase = fakeSupabase({ data: null, error: { code: '23505', message: 'duplicate key' } })

    const result = await acceptSeeker(supabase, { listenerId: 'l1', seekerId: 's1' })

    expect(result).toEqual({ kind: 'conflict' })
    expect(syncSessionRoleStatesMock).not.toHaveBeenCalled()
  })

  it('returns the error message for any other insert failure', async () => {
    getActiveBlockMock.mockResolvedValue(null)
    // e.g. validate_session_participants() rejecting a seeker who is no
    // longer 'requesting' — a plain trigger exception, not a unique violation.
    const supabase = fakeSupabase({ data: null, error: { message: 'Seeker is no longer requesting support' } })

    const result = await acceptSeeker(supabase, { listenerId: 'l1', seekerId: 's1' })

    expect(result).toEqual({ kind: 'error', message: 'Seeker is no longer requesting support' })
  })
})
