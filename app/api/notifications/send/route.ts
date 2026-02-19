import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Simple in-memory rate limiter: max 3 requests per user per 60 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 3
const rateLimitMap = new Map<string, number[]>()

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
    try {
      const body = await request.json()
      seekerId = body.seekerId
      isRenotification = body.isRenotification === true
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
      .select('id, display_name, role_state, always_available')
      .or('role_state.eq.available,always_available.eq.true')
      .neq('id', seekerId)

    if (listenersError) throw listenersError

    if (!listeners || listeners.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No available listeners to notify',
        notified: 0
      })
    }

    // Get push subscriptions for all available listeners
    const listenerIds = listeners.map(l => l.id)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', listenerIds)

    if (subError) throw subError

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No listeners have notifications enabled',
        notified: 0
      })
    }

    // Prepare notification payload (different text for re-notifications)
    const payload = JSON.stringify({
      title: isRenotification
        ? '⏳ Someone\'s Still Waiting'
        : '🤝 Someone Needs Support',
      body: isRenotification
        ? `${seekerName} has been waiting 5+ minutes. Can you help?`
        : `${seekerName} is looking for a listener right now.`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `support-request-${seekerId}`,
      requireInteraction: true,
      data: {
        url: '/dashboard',
        seekerId: seekerId
      }
    })

    // Send notifications to all available listeners
    let successCount = 0
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        successCount++
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        console.error(`Failed to send notification to subscription ${sub.id}:`, error)

        // If subscription is invalid (4xx), remove just THIS subscription record
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
      }
    })

    await Promise.all(notificationPromises)

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${successCount} listener(s)`,
      notified: successCount,
      total: subscriptions.length,
    })

  } catch (error: unknown) {
    console.error('Error sending notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
