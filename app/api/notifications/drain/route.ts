import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import {
  decideDelivery,
  fetchEnabledKinds,
  MAX_DELIVERY_ATTEMPTS,
  QUEUE_RETENTION_DAYS,
  QUIET_HOURS_DEFER_MS,
  type DeliveryPreferences,
  type NotificationCategory,
  type NotificationKind,
} from '@/lib/notificationQueue'
import {
  fetchSubscriptionsByUser,
  isPushConfigured,
  sendPushToSubscriptions,
} from '@/lib/serverPush'

/**
 * Drains notification_queue — the delivery half of every push that isn't
 * "someone needs support".
 *
 * Runs on the same 15-minute GitHub Actions cron as everything else, which in
 * practice means gaps of up to ~35 minutes (see CLAUDE.md known issue #11).
 * That is fine here: nothing in this queue is time-critical, which is precisely
 * why it is a queue.
 */

/**
 * Rows worked per run. Sized for the serverless budget rather than throughput:
 * a batch is at most this many recipients, each with one or two devices, sent
 * SEND_CONCURRENCY at a time. A larger backlog simply drains over several
 * cron ticks.
 */
const BATCH_SIZE = 200

/** Recipients pushed in parallel. Keeps a broadcast from opening 200 sockets at once. */
const SEND_CONCURRENCY = 25

/**
 * Lease length for a claimed row. Claiming sets status='sending' and parks
 * not_before this far ahead, so `not_before` doubles as the lease expiry: if a
 * run dies mid-batch, the next one reclaims the row instead of leaving it
 * stuck in 'sending' forever.
 */
const CLAIM_LEASE_MS = 15 * 60 * 1000

export const maxDuration = 60

interface QueueRow {
  id: string
  user_id: string
  category: NotificationCategory
  kind: string
  title: string
  body: string
  url: string
  tag: string | null
  attempts: number
  expires_at: string
}

type ProfileRow = DeliveryPreferences & { id: string }

// One string literal, not a concatenation: supabase-js infers the row type from
// the literal, and splitting it across lines collapses that back to `unknown`.
const PREFERENCE_COLUMNS =
  'id, announcement_notifications_enabled, reengagement_notifications_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone'

/** Run `worker` over `items` with bounded concurrency. */
async function mapLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      await worker(items[index])
    }
  })
  await Promise.all(runners)
}

async function finish(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  await supabase.from('notification_queue').update(patch).eq('id', id)
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push config missing' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const nowIso = now.toISOString()

  // Reclaim rows whose lease lapsed — a previous run claimed them and died
  // before recording an outcome.
  await supabase
    .from('notification_queue')
    .update({ status: 'pending' })
    .eq('status', 'sending')
    .lte('not_before', nowIso)

  const { data: candidates, error: selectError } = await supabase
    .from('notification_queue')
    .select('id, user_id, category, kind, title, body, url, tag, attempts, expires_at')
    .eq('status', 'pending')
    .lte('not_before', nowIso)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (selectError) {
    console.error('[drain] queue query failed', selectError)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const rows = (candidates ?? []) as QueueRow[]
  if (rows.length === 0) {
    await pruneTerminalRows(supabase, now)
    return NextResponse.json({ sent: 0, skipped: 0, deferred: 0, failed: 0 })
  }

  // Anything past its expiry is retired without sending. A check-in that says
  // "listeners are around" must not surface two days later.
  const expired = rows.filter((r) => new Date(r.expires_at) <= now)
  if (expired.length > 0) {
    await supabase
      .from('notification_queue')
      .update({ status: 'skipped', skip_reason: 'expired' })
      .in('id', expired.map((r) => r.id))
  }

  const live = rows.filter((r) => new Date(r.expires_at) > now)
  if (live.length === 0) {
    await pruneTerminalRows(supabase, now)
    return NextResponse.json({ sent: 0, skipped: expired.length, deferred: 0, failed: 0 })
  }

  // Claim. The `status='pending'` predicate is what makes this safe against an
  // overlapping run: whichever transaction gets there first is the only one
  // whose rows come back, so nobody sends the same notification twice.
  //
  // Attempts are NOT incremented here — a row parked for quiet hours can be
  // re-examined many times before it ever gets sent, and burning an attempt on
  // each pass would expire it before the recipient's morning.
  const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS).toISOString()
  const { data: claimedRows } = await supabase
    .from('notification_queue')
    .update({ status: 'sending', not_before: leaseUntil })
    .in('id', live.map((r) => r.id))
    .eq('status', 'pending')
    .select('id')

  const claimedIds = new Set((claimedRows ?? []).map((r: { id: string }) => r.id))
  const claimed = live.filter((r) => claimedIds.has(r.id))
  if (claimed.length === 0) {
    await pruneTerminalRows(supabase, now)
    return NextResponse.json({ sent: 0, skipped: expired.length, deferred: 0, failed: 0 })
  }

  // The platform switches, re-read every run. Checking here and not only at
  // enqueue is what makes a switch a real kill switch: flipping a kind off
  // cancels whatever it already queued instead of letting the backlog drain.
  const enabledKinds = await fetchEnabledKinds(supabase)

  const userIds = [...new Set(claimed.map((r) => r.user_id))]

  const { data: profileRows } = await supabase
    .from('profiles')
    .select(PREFERENCE_COLUMNS)
    .in('id', userIds)

  const profiles = new Map<string, ProfileRow>(
    ((profileRows ?? []) as ProfileRow[]).map((p) => [p.id, p])
  )

  const subscriptionsByUser = await fetchSubscriptionsByUser(supabase, userIds)

  let sent = 0
  let skipped = expired.length
  let deferred = 0
  let failed = 0

  await mapLimit(claimed, SEND_CONCURRENCY, async (row) => {
    const profile = profiles.get(row.user_id)
    if (!profile) {
      // The FK cascades on delete, so this means the profile vanished between
      // the claim and now. Nothing to deliver to.
      skipped++
      await finish(supabase, row.id, { status: 'skipped', skip_reason: 'no_profile' })
      return
    }

    if (!enabledKinds.has(row.kind as NotificationKind)) {
      skipped++
      await finish(supabase, row.id, { status: 'skipped', skip_reason: 'kind_disabled' })
      return
    }

    const decision = decideDelivery(profile, row.category, now)

    if (decision.action === 'skip') {
      skipped++
      await finish(supabase, row.id, { status: 'skipped', skip_reason: decision.reason })
      return
    }

    if (decision.action === 'defer') {
      deferred++
      await finish(supabase, row.id, {
        status: 'pending',
        not_before: new Date(now.getTime() + QUIET_HOURS_DEFER_MS).toISOString(),
      })
      return
    }

    const subs = subscriptionsByUser.get(row.user_id) ?? []
    if (subs.length === 0) {
      // Push isn't enabled on any device. Not a failure: broadcasts also land
      // as a user_notices row, which the dashboard banner surfaces on their
      // next visit.
      skipped++
      await finish(supabase, row.id, { status: 'skipped', skip_reason: 'no_subscription' })
      return
    }

    const attempts = row.attempts + 1
    let delivered = 0
    let error: string | null = null

    try {
      delivered = await sendPushToSubscriptions(
        supabase,
        subs,
        { title: row.title, body: row.body, url: row.url, tag: row.tag ?? undefined },
        `queued-${row.kind}-${row.user_id}`
      )
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e)
    }

    if (delivered > 0) {
      sent++
      await finish(supabase, row.id, { status: 'sent', sent_at: nowIso, attempts })
      return
    }

    // Every subscription rejected. sendPushToSubscriptions already deleted the
    // ones the push service called invalid, so a retry is worth it only while
    // attempts remain.
    if (attempts >= MAX_DELIVERY_ATTEMPTS) {
      failed++
      await finish(supabase, row.id, {
        status: 'failed',
        attempts,
        last_error: error ?? 'all subscriptions rejected',
      })
    } else {
      await finish(supabase, row.id, {
        status: 'pending',
        attempts,
        not_before: new Date(now.getTime() + QUIET_HOURS_DEFER_MS).toISOString(),
        last_error: error ?? 'all subscriptions rejected',
      })
    }
  })

  await pruneTerminalRows(supabase, now)

  return NextResponse.json({ sent, skipped, deferred, failed, claimed: claimed.length })
}

/** Terminal rows are kept briefly for the admin delivery report, then dropped. */
async function pruneTerminalRows(supabase: SupabaseClient, now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - QUEUE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('notification_queue')
    .delete()
    .in('status', ['sent', 'skipped', 'failed'])
    .lt('created_at', cutoff)
}

// Vercel cron jobs invoke their path with GET
export async function GET(request: NextRequest) {
  return POST(request)
}
