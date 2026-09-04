import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getActiveBlockMock = vi.fn()
vi.mock('@/lib/blocks', () => ({ getActiveBlock: (...args: unknown[]) => getActiveBlockMock(...args) }))

const syncSessionRoleStatesMock = vi.fn()
vi.mock('@/lib/sessionState', () => ({
  syncSessionRoleStates: (...args: unknown[]) => syncSessionRoleStatesMock(...args),
}))

import { startDirectConnect } from './directConnect'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Minimal stand-in for the two query shapes the function actually runs:
 * a chainable select (existing-session checks) and an insert().select().single().
 * `selects` is consumed in call order — the first select() is always the
 * up-front existing-session check, the second (only reached on insert
 * failure) is the post-error fallback.
 */
function fakeSupabase(opts: {
  selects?: Array<{ id: string } | null>
  insertResult?: { data: { id: string } | null; error: { message?: string; code?: string } | null }
  authSession?: { access_token: string } | null
}) {
  const selects = [...(opts.selects ?? [])]
  let selectCalls = 0

  return {
    from: () => ({
      select: () => {
        const chain = {
          eq: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => ({ data: selects[selectCalls++] ?? null }),
        }
        return chain
      },
      insert: () => ({
        select: () => ({
          single: async () => opts.insertResult ?? { data: null, error: { message: 'not configured' } },
        }),
      }),
    }),
    auth: {
      getSession: async () => ({ data: { session: opts.authSession ?? null } }),
    },
  } as unknown as SupabaseClient
}

beforeEach(() => {
  getActiveBlockMock.mockReset()
  syncSessionRoleStatesMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('startDirectConnect', () => {
  it('returns blocked and never touches sessions when the seeker is blocked', async () => {
    getActiveBlockMock.mockResolvedValue({ id: 'b1', reason: 'spam' })
    const supabase = fakeSupabase({})

    const result = await startDirectConnect(supabase, { seekerId: 's1', listenerId: 'l1' })

    expect(result).toEqual({ kind: 'blocked', reason: 'spam' })
  })

  it('falls back to an empty reason when the block has none', async () => {
    getActiveBlockMock.mockResolvedValue({ id: 'b1', reason: null })
    const supabase = fakeSupabase({})

    const result = await startDirectConnect(supabase, { seekerId: 's1', listenerId: 'l1' })

    expect(result).toEqual({ kind: 'blocked', reason: '' })
  })

  it('rejoins an existing session with this listener instead of creating a new one', async () => {
    getActiveBlockMock.mockResolvedValue(null)
    const supabase = fakeSupabase({ selects: [{ id: 'existing1' }] })

    const result = await startDirectConnect(supabase, { seekerId: 's1', listenerId: 'l1' })

    expect(result).toEqual({ kind: 'session', id: 'existing1' })
    expect(syncSessionRoleStatesMock).not.toHaveBeenCalled()
  })

  it('creates a session, notifies the listener, and marks the seeker offline', async () => {
    getActiveBlockMock.mockResolvedValue(null)
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const supabase = fakeSupabase({
      selects: [null],
      insertResult: { data: { id: 'new1' }, error: null },
      authSession: { access_token: 'tok' },
    })

    const result = await startDirectConnect(supabase, { seekerId: 's1', listenerId: 'l1' })

    expect(result).toEqual({ kind: 'session', id: 'new1' })
    // The notify fetch is fire-and-forget (not awaited) — flush microtasks.
    await Promise.resolve()
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/notifications/send')
    expect(JSON.parse(init.body as string)).toEqual({ seekerId: 's1', targetListenerId: 'l1' })
    expect(syncSessionRoleStatesMock).toHaveBeenCalledWith(supabase, 'new1', 'start')
  })

  it('does not notify when there is no signed-in session to notify with', async () => {
    getActiveBlockMock.mockResolvedValue(null)
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const supabase = fakeSupabase({
      selects: [null],
      insertResult: { data: { id: 'new1' }, error: null },
      authSession: null,
    })

    await startDirectConnect(supabase, { seekerId: 's1', listenerId: 'l1' })
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to the seeker\'s newest active session when the insert loses a race', async () => {
    getActiveBlockMock.mockResolvedValue(null)
    const supabase = fakeSupabase({
      selects: [null, { id: 'fallback1' }],
      insertResult: { data: null, error: { message: 'conflict' } },
    })

    const result = await startDirectConnect(supabase, { seekerId: 's1', listenerId: 'l1' })

    expect(result).toEqual({ kind: 'session', id: 'fallback1' })
    expect(syncSessionRoleStatesMock).not.toHaveBeenCalled()
  })

  it('returns an error when the insert fails and there is no fallback session', async () => {
    getActiveBlockMock.mockResolvedValue(null)
    const supabase = fakeSupabase({
      selects: [null, null],
      insertResult: { data: null, error: { message: 'boom' } },
    })

    const result = await startDirectConnect(supabase, { seekerId: 's1', listenerId: 'l1' })

    expect(result).toEqual({ kind: 'error', message: 'boom' })
  })
})
