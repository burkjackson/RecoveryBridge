import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { sendSupportRequestEmail } from '@/lib/email'
// TODO: Re-enable when Twilio verification is complete
// import { sendSMS } from '@/lib/sms'

// Simple in-memory rate limiter: max 3 requests per user per 60 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 3
const rateLimitMap = new Map<string, number[]>()

// Check if a listener is currently in their quiet hours (Do Not Disturb)
function isInQuietHours(listener: {
  quiet_hours_enabled: boolean | null
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  quiet_hours_timezone: string | null
}): boolean {
  if (!listener.quiet_hours_enabled) return false

  const tz = listener.quiet_hours_timezone || 'America/New_York'
  const start = listener.quiet_hours_start || '23:00'
  const end = listener.quiet_hours_end || '07:00'

  // Get current time in the listener's timezone
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })

  // Handle cross-midnight ranges (e.g., 23:00 → 07:00)
  if (start <= end) {
    // Same-day range (e.g., 09:00 → 17:00)
    return timeStr >= start && timeStr < end
  } else {
    // Cross-midnight range (e.g., 23:00 → 07:00)
    return timeStr >= start || timeStr < end
  }
}

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(userId) || []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) return true
  recent.push(now)
  rateLimitMap.set(userId, recent)
  return false
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.VAPID_SUBJECT || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Push notification configuration missing' }, { status: 500 })
    }

    // Configure VAPID keys for web push (at runtime, not build time)
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    // Create Supabase client with service role for server-side access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Authenticate the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Invalid authorization header' }, { status: 401 })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Rate limit check
    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
    }

    // Parse and validate request body
    let seekerId: string
    let isRenotification = false
    let clientFavoriteIds: string[] = []
    try {
      const body = await request.json()
      seekerId = body.seekerId
      isRenotification = body.isRenotification === true
      clientFavoriteIds = Array.isArray(body.favoriteListenerIds) ? body.favoriteListenerIds : []
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (typeof seekerId !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Verify that the seekerId matches the authenticated user
    if (seekerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch seekerName from the database (don't trust client-provided value)
    const { data: seekerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const seekerName = seekerProfile?.display_name || 'Someone'

    // Find all available listeners (excluding the person requesting support)
    // Include both:
    // 1. Users currently in "available" state
    // 2. Users with "always_available" enabled (should receive notifications anytime)
    const { data: listeners, error: listenersError } = await supabase
      .from('profiles')
      .select('id, display_name, email, email_notifications_enabled, role_state, always_available, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, phone_number, sms_notifications_enabled')
      .or('role_state.eq.available,always_available.eq.true')
      .neq('id', seekerId)

    if (listenersError) throw listenersError

    if (!listeners || listeners.length === 0) {
      console.log(`[notify] No available listeners for seeker ${seekerId}`)
      return NextResponse.json({
        success: true,
        message: 'No available listeners to notify',
        notified: 0
      })
    }

    console.log(`[notify] Found ${listeners.length} listener(s): ${listeners.map(l => `${l.id.slice(0,8)} role=${l.role_state} always=${l.always_available}`).join(', ')}`)

    // Filter out listeners who are in their quiet hours
    const activeListeners = listeners.filter(l => !isInQuietHours(l))

    if (activeListeners.length === 0) {
      console.log(`[notify] All ${listeners.length} listener(s) are in quiet hours`)
      return NextResponse.json({
        success: true,
        message: 'All listeners are in quiet hours',
        notified: 0
      })
    }

    // Get push subscriptions for all available listeners (excluding those in quiet hours)
    const listenerIds = activeListeners.map(l => l.id)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', listenerIds)

    if (subError) throw subError

    const activeSubs = subscriptions || []
    console.log(`[notify] Found ${activeSubs.length} push subscription(s) for ${activeListeners.length} active listener(s)`)

    // Server-side verify favorite listener IDs (never trust client list)
    let verifiedFavoriteIds = new Set<string>()
    if (clientFavoriteIds.length > 0) {
      const { data: favRows } = await supabase
        .from('user_favorites')
        .select('favorite_user_id')
        .eq('user_id', seekerId)
        .in('favorite_user_id', clientFavoriteIds)
      verifiedFavoriteIds = new Set((favRows || []).map((r: { favorite_user_id: string }) => r.favorite_user_id))
    }

    // Split subscriptions into favorites and general batches
    const favoriteSubscriptions = activeSubs.filter(sub => verifiedFavoriteIds.has(sub.user_id))
    const generalSubscriptions = activeSubs.filter(sub => !verifiedFavoriteIds.has(sub.user_id))

    // Helper to build notification payload
    function buildPayload(isFavorite: boolean) {
      return JSON.stringify({
        title: isFavorite
          ? '⭐ Someone you know needs support'
          : isRenotification
            ? '⏳ Someone\'s Still Waiting'
            : '🤝 Someone Needs Support',
        body: isRenotification
          ? `${seekerName} has been waiting 2+ minutes. Can you help?`
          : `${seekerName} is looking for a listener right now.`,
        icon: '/icon-192.png',
        // Note: badge and requireInteraction are intentionally omitted —
        // they are not supported on iOS and can cause showNotification() to
        // silently fail in the service worker on Safari/PWA.
        tag: `support-request-${seekerId}`,
        data: {
          url: '/dashboard',
          seekerId: seekerId
        }
      })
    }

    // Helper to send a batch of subscriptions
    async function sendBatch(subs: typeof activeSubs, isFavorite: boolean) {
      const payload = buildPayload(isFavorite)
      let count = 0
      const successUserIds = new Set<string>()
      await Promise.all(subs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload)
          count++
          successUserIds.add(sub.user_id)
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode
          const body = (error as { body?: string })?.body
          console.error(`[notify] Push failed for sub ${sub.id} (user ${sub.user_id?.slice(0,8)}): status=${statusCode} body=${body}`)
          if (statusCode && statusCode >= 400 && statusCode < 500) {
            console.log(`[notify] Removing invalid subscription ${sub.id}`)
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }))
      return { count, successUserIds }
    }

    // Batch 1: Favorites first (with personalized title)
    let pushSuccessCount = 0
    const pushSuccessUserIds = new Set<string>()

    if (favoriteSubscriptions.length > 0) {
      const { count, successUserIds } = await sendBatch(favoriteSubscriptions, true)
      pushSuccessCount += count
      successUserIds.forEach(id => pushSuccessUserIds.add(id))
    }

    // Batch 2: General listeners (4-second delay if favorites were notified)
    if (generalSubscriptions.length > 0) {
      if (favoriteSubscriptions.length > 0) {
        await new Promise(r => setTimeout(r, 4000))
      }
      const { count, successUserIds } = await sendBatch(generalSubscriptions, false)
      pushSuccessCount += count
      successUserIds.forEach(id => pushSuccessUserIds.add(id))
    }

    // SMS fallback: disabled until Twilio verification is complete
    // TODO: Uncomment when Twilio account is verified
    const smsCount = 0
    /*
    let smsCount = 0
    const smsEligibleListeners = activeListeners.filter(l =>
      l.sms_notifications_enabled &&
      l.phone_number &&
      !pushSuccessUserIds.has(l.id)
    )

    if (smsEligibleListeners.length > 0) {
      const smsBody = isRenotification
        ? `RecoveryBridge: ${seekerName} has been waiting 2+ minutes for support. Open the app to connect.`
        : `RecoveryBridge: ${seekerName} needs support right now. Open the app to connect.`

      const smsPromises = smsEligibleListeners.map(async (listener) => {
        const sent = await sendSMS(listener.phone_number!, smsBody)
        if (sent) smsCount++
      })

      await Promise.all(smsPromises)
    }
    */

    // Email fallback: listeners who opted in but didn't receive a push notification
    let emailCount = 0
    if (process.env.RESEND_API_KEY) {
      const emailEligible = activeListeners.filter((l: { id: string; email: string; email_notifications_enabled: boolean }) =>
        l.email_notifications_enabled &&
        l.email &&
        !pushSuccessUserIds.has(l.id)
      )

      const favEmailListeners = emailEligible.filter((l: { id: string }) => verifiedFavoriteIds.has(l.id))
      const generalEmailListeners = emailEligible.filter((l: { id: string }) => !verifiedFavoriteIds.has(l.id))

      async function sendEmailBatch(batch: typeof emailEligible, isFavorite: boolean) {
        const results = await Promise.all(
          batch.map((l: { email: string; display_name: string }) =>
            sendSupportRequestEmail({
              to: l.email,
              listenerName: l.display_name,
              seekerName,
              isFavorite,
              isRenotification,
            })
          )
        )
        return results.filter(r => r.success).length
      }

      if (favEmailListeners.length > 0) {
        emailCount += await sendEmailBatch(favEmailListeners, true)
      }
      if (generalEmailListeners.length > 0) {
        if (favEmailListeners.length > 0) {
          await new Promise(r => setTimeout(r, 4000))
        }
        emailCount += await sendEmailBatch(generalEmailListeners, false)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${pushSuccessCount} via push, ${smsCount} via SMS, ${emailCount} via email`,
      notified: pushSuccessCount + smsCount + emailCount,
      pushCount: pushSuccessCount,
      smsCount,
      emailCount,
      total: activeSubs.length,
    })

  } catch (error: unknown) {
    console.error('Error sending notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
