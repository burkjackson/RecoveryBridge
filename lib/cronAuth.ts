import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Shared auth for the cron-triggered API routes.
 *
 * Three callers, all supported everywhere:
 *   - pg_cron in Supabase (migration 065, every 10 minutes, the primary
 *     schedule) sends `x-cron-secret` with the Vault secret `cron_secret`;
 *   - GitHub Actions (a backup, throttled to every few hours) sends
 *     `x-cron-secret` or `x-cleanup-secret` with CLEANUP_SECRET_KEY;
 *   - Vercel's daily backup crons send `Authorization: Bearer ${CRON_SECRET}`
 *     and use GET rather than POST.
 *
 * Fails closed: with no secret configured anywhere, nothing is authorized, so
 * a missing env var or Vault entry can never leave a cron route open.
 */

const HEADER_NAMES = ['x-cron-secret', 'x-cleanup-secret'] as const

/** Vault secrets are generated as 64 hex characters (migration 067). */
const MIN_DB_SECRET_LENGTH = 32
const MAX_DB_SECRET_LENGTH = 256

function presentedSecrets(request: NextRequest): string[] {
  const values: string[] = []
  for (const name of HEADER_NAMES) {
    const v = request.headers.get(name)
    if (v) values.push(v)
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) values.push(authHeader.slice(7))
  return values
}

/** Env-var secrets only (CLEANUP_SECRET_KEY, CRON_SECRET). */
export function isAuthorizedCronRequest(
  request: NextRequest,
  headerName = 'x-cron-secret'
): boolean {
  const cronSecrets = [process.env.CLEANUP_SECRET_KEY, process.env.CRON_SECRET].filter(
    (s): s is string => Boolean(s)
  )
  if (cronSecrets.length === 0) return false

  const headerSecret = request.headers.get(headerName)
  if (headerSecret !== null && cronSecrets.includes(headerSecret)) return true

  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  return bearerToken !== null && cronSecrets.includes(bearerToken)
}

/**
 * Env-var secrets first (no network), then the Vault secret pg_cron uses.
 *
 * The Vault check exists because the pg_cron caller can't know the Vercel
 * env value: the secret is generated inside the database and compared there
 * by public.verify_cron_secret() (migration 067), which only the service role
 * may call. It never leaves Supabase.
 */
export async function authorizeCronRequest(request: NextRequest): Promise<boolean> {
  if (HEADER_NAMES.some((h) => isAuthorizedCronRequest(request, h))) return true

  const candidates = presentedSecrets(request).filter(
    (s) => s.length >= MIN_DB_SECRET_LENGTH && s.length <= MAX_DB_SECRET_LENGTH
  )
  if (candidates.length === 0) return false
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  for (const candidate of candidates) {
    const { data, error } = await supabase.rpc('verify_cron_secret', { candidate })
    if (error) {
      console.error('[cronAuth] verify_cron_secret failed:', error.message)
      return false
    }
    if (data === true) return true
  }
  return false
}
