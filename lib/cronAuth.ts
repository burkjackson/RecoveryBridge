import type { NextRequest } from 'next/server'

/**
 * Shared auth for the cron-triggered API routes.
 *
 * Two callers with two conventions, both supported everywhere: GitHub Actions
 * (the real 15-minute cadence) sends a secret header, and Vercel's own crons —
 * kept as a daily backup — send `Authorization: Bearer ${CRON_SECRET}` and use
 * GET rather than POST.
 *
 * Fails closed: with no secret configured in the environment, nothing is
 * authorized, so a missing env var can never leave a cron route open.
 */
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
