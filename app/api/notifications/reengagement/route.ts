import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { NOTIFICATION_COPY, REENGAGEMENT_INACTIVE_DAYS, TIME } from '@/lib/constants'
import {
  enqueueNotifications,
  fetchEnabledKinds,
  type QueuedNotificationInput,
} from '@/lib/notificationQueue'

/**
 * Monthly check-in for people who haven't been around in a while.
 *
 * This is the closest thing in the app to marketing, so it is fenced in more
 * than anything else here:
 *   - opt-IN only (reengagement_notifications_enabled defaults to false, and
 *     the drain re-checks it at send time);
 *   - at most once per calendar month, per the dedupe key;
 *   - only sent when a listener is genuinely online, so "listeners are around"
 *     is true rather than aspirational;
 *   - the copy carries no count — see NOTIFICATION_COPY.REENGAGEMENT_TITLE for
 *     why a number baked in at queue time would be a lie by the time it lands.
 */

/** Long enough to outlast a night of quiet hours, short enough that
 *  "listeners are around" is still plausibly true when it arrives. */
const REENGAGEMENT_TTL_MS = 24 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Bail before any scanning when the switch is off (see the training-nudge
  // cron for why this is worth doing ahead of the enqueue gate).
  const enabledKinds = await fetchEnabledKinds(supabase)
  if (!enabledKinds.has('reengagement')) {
    return NextResponse.json({ queued: 0, reason: 'reengagement is switched off' })
  }

  const now = new Date()

  // Is anyone actually here? Mirrors what the listener lists show: available
  // AND a heartbeat inside the online threshold. The freshness check matters —
  // a number of profiles sit at role_state='available' with heartbeats months
  // old (CLAUDE.md known issue #16), and counting those would make this
  // message untrue.
  const heartbeatCutoff = new Date(now.getTime() - TIME.HEARTBEAT_THRESHOLD_MS).toISOString()
  const { count: onlineListeners } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role_state', 'available')
    .gte('last_heartbeat_at', heartbeatCutoff)

  if (!onlineListeners || onlineListeners === 0) {
    return NextResponse.json({ queued: 0, reason: 'no listeners online' })
  }

  const inactiveBefore = new Date(
    now.getTime() - REENGAGEMENT_INACTIVE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // Filter on the preference here as well as in the drain. The drain would
  // skip these anyway, but queueing a row per opted-out user every month would
  // fill the table with rows whose only purpose is to be skipped.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('reengagement_notifications_enabled', true)
    .or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${inactiveBefore}`)

  if (error) {
    console.error('[reengagement] profile query failed', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

  const items: QueuedNotificationInput[] = ((profiles ?? []) as { id: string }[]).map(
    (profile): QueuedNotificationInput => ({
      userId: profile.id,
      category: 'reengagement',
      kind: 'reengagement',
      title: NOTIFICATION_COPY.REENGAGEMENT_TITLE,
      body: NOTIFICATION_COPY.REENGAGEMENT_BODY,
      url: '/dashboard',
      tag: `reengagement-${profile.id}`,
      dedupeKey: monthKey,
      expiresAt: new Date(now.getTime() + REENGAGEMENT_TTL_MS),
    })
  )

  const { queued, skipped } = await enqueueNotifications(supabase, items)
  return NextResponse.json({ queued, skipped, candidates: items.length, onlineListeners })
}

// Vercel cron jobs invoke their path with GET
export async function GET(request: NextRequest) {
  return POST(request)
}
