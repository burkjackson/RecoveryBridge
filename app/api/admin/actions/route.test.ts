import { describe, it, expect, vi, beforeEach } from 'vitest'

const isRateLimitedMock = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  isRateLimited: (...args: unknown[]) => isRateLimitedMock(...args),
}))

const fetchEnabledKindsMock = vi.fn()
const enqueueNotificationsMock = vi.fn()
vi.mock('@/lib/notificationQueue', async () => {
  const actual = await vi.importActual<typeof import('@/lib/notificationQueue')>(
    '@/lib/notificationQueue'
  )
  return {
    ...actual,
    fetchEnabledKinds: (...args: unknown[]) => fetchEnabledKindsMock(...args),
    enqueueNotifications: (...args: unknown[]) => enqueueNotificationsMock(...args),
  }
})

import { fakeSupabase } from '@/lib/test/fakeSupabase'

let currentClient: ReturnType<typeof fakeSupabase>['client']
vi.mock('@supabase/supabase-js', async () => {
  const actual = await vi.importActual<typeof import('@supabase/supabase-js')>(
    '@supabase/supabase-js'
  )
  return {
    ...actual,
    createClient: () => currentClient,
  }
})

import { POST } from './route'
import { NextRequest } from 'next/server'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/actions', {
    method: 'POST',
    headers: { authorization: 'Bearer a-token' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  isRateLimitedMock.mockReset()
  isRateLimitedMock.mockReturnValue(false)
  fetchEnabledKindsMock.mockReset()
  enqueueNotificationsMock.mockReset()
})

describe('POST /api/admin/actions', () => {
  it('rejects a caller whose profile is not an admin', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'u1' },
      tables: {
        profiles: { data: { is_admin: false }, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ action: 'update_report', reportId: 'r1', status: 'resolved' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
  })

  it('rejects an unrecognized action', async () => {
    const { client } = fakeSupabase({
      authUser: { id: 'admin1' },
      tables: {
        profiles: { data: { is_admin: true }, error: null },
      },
    })
    currentClient = client

    const res = await POST(makeRequest({ action: 'do_something_undefined' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Unknown action' })
  })

  it('refuses to send a broadcast while announcements are switched off (409, not 400/403)', async () => {
    // The review's own prose reads like a validation failure, but this is
    // deliberately its own status: it isn't that the request was malformed
    // (400) or that the admin lacks permission (403) — the request is well
    // formed and the caller is a verified admin, it's that sending would
    // conflict with the current on/off state of the switch. 409 is what the
    // route actually returns.
    fetchEnabledKindsMock.mockResolvedValue(new Set())

    const { client } = fakeSupabase({
      authUser: { id: 'admin1' },
      tables: {
        profiles: { data: { is_admin: true }, error: null },
      },
    })
    currentClient = client

    const res = await POST(
      makeRequest({
        action: 'send_broadcast',
        title: 'Heads up',
        body: 'New feature is live.',
        audience: 'all',
      })
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'Announcements are switched off. Turn them on above to send one.',
    })
    expect(fetchEnabledKindsMock).toHaveBeenCalled()
  })
})
