import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const rpc = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc }) }))

import { authorizeCronRequest } from './cronAuth'

const VAULT_SECRET = 'a'.repeat(64)

function req(headers: Record<string, string>) {
  return new NextRequest('https://recoverybridge.app/api/cleanup-sessions', { method: 'POST', headers })
}

describe('authorizeCronRequest', () => {
  const env = { ...process.env }

  beforeEach(() => {
    rpc.mockReset()
    process.env.CLEANUP_SECRET_KEY = 'env-secret'
    delete process.env.CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  })

  afterEach(() => {
    process.env = { ...env }
  })

  it('accepts the env secret on either header without touching the database', async () => {
    expect(await authorizeCronRequest(req({ 'x-cron-secret': 'env-secret' }))).toBe(true)
    expect(await authorizeCronRequest(req({ 'x-cleanup-secret': 'env-secret' }))).toBe(true)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('accepts the Vault secret pg_cron sends, checked by the database', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    expect(await authorizeCronRequest(req({ 'x-cron-secret': VAULT_SECRET }))).toBe(true)
    expect(rpc).toHaveBeenCalledWith('verify_cron_secret', { candidate: VAULT_SECRET })
  })

  it('rejects a wrong secret', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    expect(await authorizeCronRequest(req({ 'x-cron-secret': 'b'.repeat(64) }))).toBe(false)
  })

  it('rejects short values without asking the database', async () => {
    expect(await authorizeCronRequest(req({ 'x-cron-secret': 'short' }))).toBe(false)
    expect(await authorizeCronRequest(req({}))).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('fails closed if the database check errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    expect(await authorizeCronRequest(req({ 'x-cron-secret': VAULT_SECRET }))).toBe(false)
  })
})
