import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const captureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({ captureException: (...args: unknown[]) => captureException(...args) }))

import { syncSessionRoleStates } from './sessionState'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Minimal stand-in: the helper only ever reads the access token. */
function clientWithToken(token: string | null) {
  return {
    auth: {
      getSession: async () => ({ data: { session: token ? { access_token: token } : null } }),
    },
  } as unknown as SupabaseClient
}

const ok = () => new Response(null, { status: 200 })
const status = (code: number) => () => new Response(null, { status: code })

beforeEach(() => {
  captureException.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('syncSessionRoleStates', () => {
  it('reports success when the server accepts the transition', async () => {
    const fetchMock = vi.fn(ok)
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncSessionRoleStates(clientWithToken('t'), 's1', 'end')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(captureException).not.toHaveBeenCalled()
  })

  it('sends the session id and phase the server derives everything else from', async () => {
    const sent: Array<{ url: string; init: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
      sent.push({ url, init })
      return ok()
    }))

    await syncSessionRoleStates(clientWithToken('tok'), 'abc', 'start')

    expect(sent).toHaveLength(1)
    const { url, init } = sent[0]
    expect(url).toBe('/api/sessions/state')
    expect(JSON.parse(init.body as string)).toEqual({ sessionId: 'abc', phase: 'start' })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('retries once on a 5xx and succeeds on the second attempt', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(status(500)).mockImplementationOnce(ok)
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncSessionRoleStates(clientWithToken('t'), 's1', 'end')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(captureException).not.toHaveBeenCalled()
  })

  it('retries once on a network error and succeeds on the second attempt', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('offline')))
      .mockImplementationOnce(ok)
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncSessionRoleStates(clientWithToken('t'), 's1', 'end')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 4xx — the server has decided, not stumbled', async () => {
    const fetchMock = vi.fn(status(409))
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncSessionRoleStates(clientWithToken('t'), 's1', 'end')).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  // The whole point of the change: a lost sync leaves a listener out of the
  // notification pool, so it must never fail silently again.
  it('reports a persistent failure rather than swallowing it', async () => {
    vi.stubGlobal('fetch', vi.fn(status(500)))

    expect(await syncSessionRoleStates(clientWithToken('t'), 's1', 'end')).toBe(false)
    expect(captureException).toHaveBeenCalledTimes(1)
    const [error, context] = captureException.mock.calls[0] as [Error, Record<string, never>]
    expect(error.message).toContain('HTTP 500')
    expect(context).toMatchObject({ tags: { area: 'session-state', phase: 'end' } })
  })

  it('never throws, so it cannot block navigation out of a chat', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('boom'))))
    await expect(syncSessionRoleStates(clientWithToken('t'), 's1', 'end')).resolves.toBe(false)
  })

  it('stays quiet when the user is signed out — that is not a failure', async () => {
    const fetchMock = vi.fn(ok)
    vi.stubGlobal('fetch', fetchMock)

    expect(await syncSessionRoleStates(clientWithToken(null), 's1', 'end')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })
})
