import { describe, it, expect, vi, beforeEach } from 'vitest'

const isRateLimitedMock = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  isRateLimited: (...args: unknown[]) => isRateLimitedMock(...args),
}))

const getActiveBlockMock = vi.fn()
vi.mock('@/lib/blocks', () => ({
  getActiveBlock: (...args: unknown[]) => getActiveBlockMock(...args),
}))

// web-push validates VAPID key formats at setVapidDetails() time — real
// keys, not the placeholder strings below, would be needed to call through
// to the real package. None of these tests get far enough to actually send
// a push, so a bare mock is all setVapidDetails needs to not throw.
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}))

import { fakeSupabase } from '@/lib/test/fakeSupabase'

let currentClient: ReturnType<typeof fakeSupabase>['client']
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => currentClient,
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/notifications/send', {
    method: 'POST',
    headers: { authorization: 'Bearer a-token' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  isRateLimitedMock.mockReset()
  isRateLimitedMock.mockReturnValue(false)
  getActiveBlockMock.mockReset()
  getActiveBlockMock.mockResolvedValue(null)
  // Checked before anything in the handler runs — see the route's own
  // early return when any of the three is missing.
  process.env.VAPID_SUBJECT = 'mailto:test@example.com'
  process.env.VAPID_PUBLIC_KEY = 'test-public-key'
  process.env.VAPID_PRIVATE_KEY = 'test-private-key'
})

describe('POST /api/notifications/send', () => {
  it('refuses a broadcast from a seeker who is not actually requesting', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'k1' },
      tables: {
        profiles: { data: { display_name: 'Kai', role_state: 'available' }, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ seekerId: 'k1' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
  })

  it('refuses a direct-connect notify when there is no active session with that listener', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'k1' },
      tables: {
        profiles: { data: { display_name: 'Kai', role_state: 'available' }, error: null },
        sessions: { data: null, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ seekerId: 'k1', targetListenerId: 'l1' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'No active session with this listener' })
  })

  it('refuses a broadcast from a seeker with an active block', async () => {
    getActiveBlockMock.mockResolvedValue({ id: 'b1', reason: 'spam' })
    const { client } = fakeSupabase({
      authUser: { id: 'k1' },
      tables: {
        profiles: { data: { display_name: 'Kai', role_state: 'requesting' }, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ seekerId: 'k1' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
  })
})
