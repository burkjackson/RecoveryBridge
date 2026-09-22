import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

// Server-side web push to a *specific user*, reused by the cleanup cron's
// "we couldn't connect you" follow-up, the admin outreach action, and the
// notification queue drain. This is deliberately keyed to a user_id →
// push_subscriptions, so it reaches the person's device(s) regardless of
// whether their email address is correct.
//
// (The seeker-broadcast path in app/api/notifications/send/route.ts predates
// this and inlines its own webpush calls; it isn't refactored here to keep that
// hot path untouched.)

let vapidConfigured = false

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

/**
 * True only when the push service says the subscription no longer exists
 * (404 Not Found / 410 Gone). Anything else — 429 throttling during a burst,
 * 413, 400, or a 403 from a VAPID key mismatch between environments — is not
 * proof the device is gone. Every send path used to delete on any 4xx, which
 * quietly cut working listeners off from support requests; one misconfigured
 * deploy returning 403 would have wiped every subscription at once.
 */
export function isSubscriptionGone(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number })?.statusCode
  return statusCode === 404 || statusCode === 410
}

/** Give up on a single push endpoint after this long, so one hung push
 *  service can't stall a whole route (they run with maxDuration=30). */
export const PUSH_SEND_TIMEOUT_MS = 10 * 1000

/** How long the push service should hold a support push for a phone that is
 *  asleep or offline. This was 60s, so a phone dozing for a minute never got
 *  the request at all — while a direct connect stays open for 10+ minutes and
 *  a seeker stays 'requesting' for 30. Tapping a late one is safe: /connect
 *  and the chat page both re-check the current state. */
export const SUPPORT_PUSH_TTL_SECONDS = {
  directConnect: 10 * 60,
  broadcast: 15 * 60,
} as const

/** Whether the VAPID env vars needed to send anything are present. */
export function isPushConfigured(): boolean {
  return ensureVapidConfigured()
}

export interface UserPushPayload {
  title: string
  body: string
  /** Where the notification click should land (defaults to /dashboard) */
  url?: string
  /** Notification tag for coalescing; defaults to a per-user value */
  tag?: string
}

/** A push_subscriptions row, as stored. */
export interface StoredPushSubscription {
  id: string
  user_id: string
  subscription: webpush.PushSubscription
}

function buildPayload(payload: UserPushPayload, fallbackTag: string): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icon-192.png',
    tag: payload.tag || fallbackTag,
    data: { url: payload.url || '/dashboard' },
  })
}

/**
 * Fetch push subscriptions for many users in one query, grouped by user.
 *
 * The queue drain works a batch of recipients at a time, and doing this per
 * user would mean one round trip each — the thing that makes a broadcast to
 * every user run out of serverless time.
 */
export async function fetchSubscriptionsByUser(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, StoredPushSubscription[]>> {
  const byUser = new Map<string, StoredPushSubscription[]>()
  if (userIds.length === 0) return byUser

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, subscription')
    .in('user_id', [...new Set(userIds)])

  for (const sub of (subs ?? []) as StoredPushSubscription[]) {
    const list = byUser.get(sub.user_id)
    if (list) list.push(sub)
    else byUser.set(sub.user_id, [sub])
  }
  return byUser
}

/**
 * Send one payload to an already-fetched set of subscriptions. Returns the
 * number of successful sends. Subscriptions the push service reports as gone
 * (404/410) are deleted; other failures are logged and the row is kept.
 */
export async function sendPushToSubscriptions(
  supabase: SupabaseClient,
  subs: StoredPushSubscription[],
  payload: UserPushPayload,
  fallbackTag: string
): Promise<number> {
  if (!ensureVapidConfigured() || subs.length === 0) return 0

  const body = buildPayload(payload, fallbackTag)

  let count = 0
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, body, {
          urgency: 'normal',
          // These are gentle, non-time-critical messages; let the push service
          // hold them for a day so a closed device still gets them on wake.
          TTL: 24 * 60 * 60,
          timeout: PUSH_SEND_TIMEOUT_MS,
        })
        count++
      } catch (error: unknown) {
        if (isSubscriptionGone(error)) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error(`[push] send failed for sub ${sub.id}:`, (error as { statusCode?: number })?.statusCode)
        }
      }
    })
  )
  return count
}

/**
 * Send a web push to every device subscription belonging to `userId`.
 * Returns the number of successful sends.
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: UserPushPayload
): Promise<number> {
  if (!ensureVapidConfigured()) return 0

  const byUser = await fetchSubscriptionsByUser(supabase, [userId])
  const subs = byUser.get(userId) ?? []
  return sendPushToSubscriptions(supabase, subs, payload, `notice-${userId}`)
}
