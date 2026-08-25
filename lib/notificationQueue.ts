import type { SupabaseClient } from '@supabase/supabase-js'
import { isInQuietHours, type QuietHoursSettings } from '@/lib/timeWindows'

/**
 * The queue behind every push that isn't "someone needs support".
 *
 * Support requests stay on the direct path in /api/notifications/send, where
 * latency is the entire point. Everything else — a thank-you note you were
 * left, an unfinished-training nudge, a monthly check-in, an admin broadcast —
 * is queued here and drained by /api/notifications/drain.
 *
 * Queueing rather than sending inline buys three things:
 *   - a broadcast to every user can't run out of serverless time halfway
 *     through, because the drain works bounded batches across cron ticks;
 *   - quiet hours can DEFER a message instead of dropping it (none of these
 *     are urgent, so "later" beats "never");
 *   - there's a row per recipient afterwards, so "who did we actually reach"
 *     is a query rather than a guess.
 */

export const NOTIFICATION_CATEGORIES = ['announcement', 'reengagement'] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export const NOTIFICATION_KINDS = [
  'thank_you',
  'training_nudge',
  'reengagement',
  'broadcast',
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

/**
 * How far ahead to push a message that arrived during the recipient's quiet
 * hours. Deliberately coarse: re-checking every 30 minutes costs one cheap
 * query per drain and lands the message within half an hour of their quiet
 * hours ending, without any timezone arithmetic to get wrong.
 */
export const QUIET_HOURS_DEFER_MS = 30 * 60 * 1000

/** Rows are given up on after this many delivery attempts. */
export const MAX_DELIVERY_ATTEMPTS = 3

/** Terminal rows older than this are pruned by the drain. */
export const QUEUE_RETENTION_DAYS = 30

/**
 * Which notification kinds are switched on platform-wide.
 *
 * This is a different question from the per-recipient consent in
 * decideDelivery(): that asks "does this person want it", this asks "do we
 * want this going out at all yet". An admin owns it, and it changes without a
 * deploy (migration 036).
 *
 * Fails closed in two ways that both matter:
 *   - a kind with no row is disabled, so a newly added notification kind
 *     ships inert until someone chooses to turn it on;
 *   - a query error disables everything rather than defaulting to send. A
 *     database blip must not become an unintended push to the whole userbase.
 */
export async function fetchEnabledKinds(
  supabase: SupabaseClient
): Promise<Set<NotificationKind>> {
  const { data, error } = await supabase
    .from('notification_kind_settings')
    .select('kind, enabled')

  if (error) {
    console.error('[notificationQueue] kind settings unreadable — sending nothing', error)
    return new Set()
  }

  return new Set(
    (data ?? [])
      .filter((row: { enabled: boolean }) => row.enabled)
      .map((row: { kind: string }) => row.kind as NotificationKind)
  )
}

/** The preference columns that govern whether a queued category may be sent. */
export interface DeliveryPreferences extends QuietHoursSettings {
  announcement_notifications_enabled: boolean | null
  reengagement_notifications_enabled: boolean | null
}

export type DeliveryDecision =
  | { action: 'send' }
  | { action: 'defer'; reason: string }
  | { action: 'skip'; reason: string }

/**
 * Decide what to do with one queued row for one recipient, right now.
 *
 * Pure so the consent and quiet-hours rules are unit-testable without a
 * database — they are the part that has to be right.
 */
export function decideDelivery(
  prefs: DeliveryPreferences,
  category: NotificationCategory,
  now: Date = new Date()
): DeliveryDecision {
  // Consent first. An opted-out row is skipped outright rather than deferred:
  // deferring would leave it pending until it expired, retrying every drain.
  if (category === 'announcement' && prefs.announcement_notifications_enabled === false) {
    return { action: 'skip', reason: 'announcements_disabled' }
  }
  if (category === 'reengagement' && prefs.reengagement_notifications_enabled !== true) {
    // Note the asymmetry: re-engagement is opt-IN, so anything other than an
    // explicit true (including null on a row written before migration 035)
    // means don't send.
    return { action: 'skip', reason: 'reengagement_not_opted_in' }
  }

  // Nothing in this queue is urgent enough to buzz someone at 3am.
  if (isInQuietHours(prefs, now)) {
    return { action: 'defer', reason: 'quiet_hours' }
  }

  return { action: 'send' }
}

export interface QueuedNotificationInput {
  userId: string
  category: NotificationCategory
  kind: NotificationKind
  title: string
  body: string
  /** Tap target; defaults to /dashboard. */
  url?: string
  /** Notification tag for coalescing. */
  tag?: string
  broadcastId?: string
  /**
   * Makes the enqueue idempotent. Anything that can run twice — an overlapping
   * cron, a client retry — must set this: the feedback row's id, the
   * broadcast's id, "YYYY-MM" for a monthly check-in.
   */
  dedupeKey?: string
  /** After this the message is stale enough that not sending beats sending. */
  expiresAt?: Date
}

interface QueueRow {
  user_id: string
  category: string
  kind: string
  title: string
  body: string
  url: string
  tag: string | null
  broadcast_id: string | null
  dedupe_key: string | null
  expires_at?: string
}

function toRow(item: QueuedNotificationInput): QueueRow {
  return {
    user_id: item.userId,
    category: item.category,
    kind: item.kind,
    title: item.title,
    body: item.body,
    url: item.url ?? '/dashboard',
    tag: item.tag ?? null,
    broadcast_id: item.broadcastId ?? null,
    dedupe_key: item.dedupeKey ?? null,
    ...(item.expiresAt ? { expires_at: item.expiresAt.toISOString() } : {}),
  }
}

/** PostgREST/Postgres unique violation. */
function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}

const INSERT_CHUNK_SIZE = 500

/**
 * Queue notifications, skipping any that are already pending.
 *
 * Idempotency is belt-and-braces on purpose. The pre-filter below keeps the
 * common case cheap (one SELECT, one INSERT), and the partial unique index
 * from migration 035 catches the race the pre-filter can't — two cron runs
 * overlapping — at which point the chunk is retried row by row so one
 * duplicate doesn't discard the rest of the batch.
 */
export async function enqueueNotifications(
  supabase: SupabaseClient,
  items: QueuedNotificationInput[]
): Promise<{ queued: number; skipped: number; blocked: number }> {
  if (items.length === 0) return { queued: 0, skipped: 0, blocked: 0 }

  // The platform switch is checked here rather than in each caller, so a new
  // notification kind can't reach anyone by someone forgetting to add a gate.
  // Rows for a disabled kind are never created at all.
  const enabledKinds = await fetchEnabledKinds(supabase)
  const allowed = items.filter((i) => enabledKinds.has(i.kind))
  const blocked = items.length - allowed.length
  if (allowed.length === 0) return { queued: 0, skipped: 0, blocked }

  items = allowed

  const deduped = items.filter((i) => i.dedupeKey)
  let alreadyPending = new Set<string>()

  if (deduped.length > 0) {
    const { data: existing } = await supabase
      .from('notification_queue')
      .select('user_id, kind, dedupe_key')
      .eq('status', 'pending')
      .in('kind', [...new Set(deduped.map((i) => i.kind))])
      .in('dedupe_key', [...new Set(deduped.map((i) => i.dedupeKey as string))])

    alreadyPending = new Set(
      (existing ?? []).map(
        (r: { user_id: string; kind: string; dedupe_key: string }) =>
          `${r.user_id}|${r.kind}|${r.dedupe_key}`
      )
    )
  }

  // Also de-duplicate within the batch itself, so a caller that builds the
  // same row twice doesn't trip the unique index on its own insert.
  const seen = new Set<string>()
  const toInsert: QueueRow[] = []
  let skipped = 0

  for (const item of items) {
    if (item.dedupeKey) {
      const key = `${item.userId}|${item.kind}|${item.dedupeKey}`
      if (alreadyPending.has(key) || seen.has(key)) {
        skipped++
        continue
      }
      seen.add(key)
    }
    toInsert.push(toRow(item))
  }

  let queued = 0
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK_SIZE)
    const { error } = await supabase.from('notification_queue').insert(chunk)

    if (!error) {
      queued += chunk.length
      continue
    }

    if (!isUniqueViolation(error)) throw error

    // Lost a race with a concurrent enqueue. Retry individually so the
    // duplicate is the only row dropped.
    for (const row of chunk) {
      const { error: rowError } = await supabase.from('notification_queue').insert(row)
      if (!rowError) queued++
      else if (isUniqueViolation(rowError)) skipped++
      else throw rowError
    }
  }

  return { queued, skipped, blocked }
}
