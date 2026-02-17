import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Configure VAPID keys for web push (at runtime, not build time)
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@recoverybridge.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
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

    const { seekerName, seekerId } = await request.json()

    // Verify that the seekerId matches the authenticated user
    if (seekerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    // Prepare notification payload
    const payload = JSON.stringify({
      title: '🤝 Someone Needs Support',
      body: `${seekerName} is looking for a listener right now.`,
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
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        return { success: true, userId: sub.user_id }
      } catch (error: any) {
        console.error(`Failed to send notification to user ${sub.user_id}:`, error)

        // If subscription is invalid (410 Gone), remove it from database
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', sub.user_id)
        }

        return { success: false, userId: sub.user_id, error: error.message }
      }
    })

    const results = await Promise.all(notificationPromises)
    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${successCount} listener(s)`,
      notified: successCount,
      total: subscriptions.length,
      results
    })

  } catch (error: any) {
    console.error('Error sending notifications:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
