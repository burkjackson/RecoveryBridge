import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

// Server-side web push to a *specific user*, reused by the cleanup cron's
// "we couldn't connect you" follow-up and the admin outreach action. This is
// deliberately keyed to a user_id → push_subscriptions, so it reaches the
// person's device(s) regardless of whether their email address is correct.
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

export interface UserPushPayload {
  title: string
  body: string
  /** Where the notification click should land (defaults to /dashboard) */
  url?: string
  /** Notification tag for coalescing; defaults to a per-user value */
  tag?: string
}

/**
 * Send a web push to every device subscription belonging to `userId`.
 * Returns the number of successful sends. Invalid subscriptions (4xx from the
 * push service) are deleted, mirroring the self-healing in the notify route.
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: UserPushPayload
): Promise<number> {
  if (!ensureVapidConfigured()) return 0

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return 0

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icon-192.png',
    tag: payload.tag || `notice-${userId}`,
    data: { url: payload.url || '/dashboard' },
  })

  let count = 0
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, body, {
          urgency: 'normal',
          // These are gentle, non-time-critical messages; let the push service
          // hold them for a day so a closed device still gets them on wake.
          TTL: 24 * 60 * 60,
        })
        count++
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    })
  )
  return count
}
