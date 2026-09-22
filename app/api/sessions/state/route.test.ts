import { describe, it, expect, vi, beforeEach } from 'vitest'

const isRateLimitedMock = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  isRateLimited: (...args: unknown[]) => isRateLimitedMock(...args),
}))

const endSessionRoleStatesMock = vi.fn()
vi.mock('@/lib/serverSessionState', () => ({
  endSessionRoleStates: (...args: unknown[]) => endSessionRoleStatesMock(...args),
}))

import { fakeSupabase } from '@/lib/test/fakeSupabase'

let currentClient: ReturnType<typeof fakeSupabase>['client']
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => currentClient,
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

/**
 * The route reads process.env at call time, not import time, so these can
 * be set once — no actual Supabase project is contacted, fakeSupabase()
 * intercepts every call this route makes to the client it returns.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

function makeRequest(body: unknown, token: string | null = 'a-token') {
  return new NextRequest('http://localhost/api/sessions/state', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  isRateLimitedMock.mockReset()
  isRateLimitedMock.mockReturnValue(false)
  endSessionRoleStatesMock.mockReset()
})

describe('POST /api/sessions/state', () => {
  it('rejects a request with no authorization header', async () => {
    const { client } = fakeSupabase({})
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'start' }, null))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('rejects a caller who is neither the listener nor the seeker', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'stranger' },
      tables: {
        sessions: {
          data: {
            id: 's1',
            listener_id: 'l1',
            seeker_id: 'k1',
            status: 'active',
            accepted_at: '2026-09-01T00:00:00Z',
          },
          error: null,
        },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'start' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
  })

  it('refuses to end a session that is still active', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'l1' },
      tables: {
        sessions: {
          data: {
            id: 's1',
            listener_id: 'l1',
            seeker_id: 'k1',
            status: 'active',
            accepted_at: '2026-09-01T00:00:00Z',
          },
          error: null,
        },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'end' }))

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Session is still active' })
    expect(endSessionRoleStatesMock).not.toHaveBeenCalled()
  })

  it('starting a still-pending direct connect only moves the seeker, not the listener', async () => {
    const { client, calls } = fakeSupabase({
      authUser: { id: 'k1' },
      tables: {
        sessions: {
          data: {
            id: 's1',
            listener_id: 'l1',
            seeker_id: 'k1',
            status: 'active',
            accepted_at: null,
          },
          error: null,
        },
        profiles: { data: null, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'start' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })

    const profileUpdates = calls.filter((c) => c.table === 'profiles' && c.method === 'eq')
    // Only one profiles row gets touched — the seeker's — because
    // accepted_at is still null. See the route's own comment (Known Issue
    // #35): moving the listener before they've accepted would pull them
    // out of every list for a request they might still decline.
    expect(profileUpdates).toHaveLength(1)
    expect(profileUpdates[0].args).toEqual(['id', 'k1'])
  })

  it('refuses to start a session that has already ended (replayed old id)', async () => {
    const { client, calls } = fakeSupabase({
      authUser: { id: 'k1' },
      tables: {
        sessions: {
          data: {
            id: 's1',
            listener_id: 'l1',
            seeker_id: 'k1',
            status: 'ended',
            accepted_at: '2026-06-01T00:00:00Z',
            ended_at: '2026-06-01T00:30:00Z',
          },
          error: null,
        },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'start' }))

    expect(res.status).toBe(409)
    expect(calls.some((c) => c.table === 'profiles')).toBe(false)
  })

  it('refuses to end a session that ended more than 2 minutes ago', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'l1' },
      tables: {
        sessions: {
          data: {
            id: 's1',
            listener_id: 'l1',
            seeker_id: 'k1',
            status: 'ended',
            accepted_at: '2026-06-01T00:00:00Z',
            ended_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          },
          error: null,
        },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'end' }))

    expect(res.status).toBe(409)
    expect(endSessionRoleStatesMock).not.toHaveBeenCalled()
  })

  it('ends a just-ended session and restores both sides', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'k1' },
      tables: {
        sessions: [
          {
            data: {
              id: 's1',
              listener_id: 'l1',
              seeker_id: 'k1',
              status: 'ended',
              accepted_at: '2026-09-01T00:00:00Z',
              ended_at: new Date().toISOString(),
            },
            error: null,
          },
          { data: [], error: null },
        ],
        user_blocks: { data: null, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'end' }))

    expect(res.status).toBe(200)
    expect(endSessionRoleStatesMock).toHaveBeenCalledWith(
      client,
      { seekerId: 'k1', listenerId: 'l1' },
      { wasAccepted: true, restoreListener: true, restoreSeeker: true }
    )
  })

  it('does not restore a blocked listener to available', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'l1' },
      tables: {
        sessions: [
          {
            data: {
              id: 's1',
              listener_id: 'l1',
              seeker_id: 'k1',
              status: 'ended',
              accepted_at: '2026-09-01T00:00:00Z',
              ended_at: new Date().toISOString(),
            },
            error: null,
          },
          { data: [], error: null },
        ],
        // Both getActiveBlock calls see a block; the seeker being blocked too
        // is fine for this test, it just means neither side moves.
        user_blocks: { data: { id: 'b1', reason: 'test' }, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'end' }))

    expect(res.status).toBe(200)
    expect(endSessionRoleStatesMock).toHaveBeenCalledWith(
      client,
      { seekerId: 'k1', listenerId: 'l1' },
      expect.objectContaining({ restoreListener: false })
    )
  })

  it('leaves a participant alone who is already in another active session', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'k1' },
      tables: {
        sessions: [
          {
            data: {
              id: 's1',
              listener_id: 'l1',
              seeker_id: 'k1',
              status: 'ended',
              accepted_at: '2026-09-01T00:00:00Z',
              ended_at: new Date().toISOString(),
            },
            error: null,
          },
          // Listener's other-session check: they're mid-chat with someone else.
          { data: [{ id: 's2' }], error: null },
          // Seeker's other-session check: none.
          { data: [], error: null },
        ],
        user_blocks: { data: null, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'end' }))

    expect(res.status).toBe(200)
    expect(endSessionRoleStatesMock).toHaveBeenCalledWith(
      client,
      { seekerId: 'k1', listenerId: 'l1' },
      { wasAccepted: true, restoreListener: false, restoreSeeker: true }
    )
  })

  it('does not pull a seeker who has already re-requested back out of the queue', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'l1' },
      tables: {
        sessions: [
          {
            data: {
              id: 's1',
              listener_id: 'l1',
              seeker_id: 'k1',
              status: 'ended',
              accepted_at: '2026-09-01T00:00:00Z',
              ended_at: new Date().toISOString(),
            },
            error: null,
          },
          { data: [], error: null },
        ],
        user_blocks: { data: null, error: null },
        profiles: { data: { role_state: 'requesting' }, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ sessionId: 's1', phase: 'end' }))

    expect(res.status).toBe(200)
    expect(endSessionRoleStatesMock).toHaveBeenCalledWith(
      client,
      { seekerId: 'k1', listenerId: 'l1' },
      { wasAccepted: true, restoreListener: true, restoreSeeker: false }
    )
  })
})
