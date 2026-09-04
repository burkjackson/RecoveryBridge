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
            status: 'pending',
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
})
