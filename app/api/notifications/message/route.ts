import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Notify the OTHER participant of an active chat session that a new message
// arrived — but only if they aren't already looking at that chat.
//
// Two layers decide that, because the obvious one isn't trustworthy everywhere:
//  1. Server-side (here, authoritative): wait a beat, then check whether the
//     message got marked read. A recipient with the chat on screen marks it
//     read within a second or two (realtime INSERT, or the chat's 3s poll), and
//     the chat page only sets read_at while the page is actually visible. Read
//     already => they're looking at it => no push.
//  2. Service worker (fast path): suppresses on window visibility. iOS Safari
//     doesn't reliably populate WindowClient.visibilityState inside a push
//     handler, which is exactly why layer 1 exists.
// Deciding here also avoids sending a push the service worker then swallows —
// browsers penalise repeatedly-silent pushes (Chrome surfaces its own generic
// "site updated in background" notice; Safari can revoke permission).
//
// Deliberately lightweight: no quiet-hours filtering. This fires only inside a
// live 1:1 conversation the recipient already agreed to, so a reply should
// reach them even during their support-request Do Not Disturb window.

// How long to give the recipient's client to acknowledge the message before we
// conclude they aren't looking. Covers the chat's 3s polling fallback plus
// round-trip latency; short enough that a real unread reply isn't noticeably
// delayed, and keeps the whole request well inside the serverless time limit.
const PRESENCE_GRACE_MS = 5000

// Simple in-memory rate limiter: max 10 message-notifications per user per 60s.
// A rapid back-and-forth shouldn't fire a push per keystroke-fast message; the
// collapsing tag already de-stacks them, and this caps abuse.
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10
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

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Authenticate the request (Bearer token = the message sender)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Parse body
    let sessionId: string
    let messageId: string | undefined
    try {
      const body = await request.json()
      sessionId = body.sessionId
      messageId = typeof body.messageId === 'string' ? body.messageId : undefined
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Verify the session is active and the sender is a participant. This is the
    // authorization gate: a user can only ping the counterpart of a session
    // they're actually in.
    const { data: session } = await supabase
      .from('sessions')
      .select('id, listener_id, seeker_id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'No active session' }, { status: 403 })
    }
    if (session.listener_id !== user.id && session.seeker_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const recipientId = session.listener_id === user.id ? session.seeker_id : session.listener_id

    // Presence check (see note at top): give the recipient's client a moment to
    // acknowledge the message, then skip the push if it's already been read —
    // that means the chat is on their screen right now.
    if (messageId) {
      const { data: message } = await supabase
        .from('messages')
        .select('id, session_id, sender_id, read_at')
        .eq('id', messageId)
        .maybeSingle()

      // Only trust an id that really is this sender's message in this session,
      // so a caller can't probe unrelated messages through this endpoint.
      const messageBelongsHere =
        message && message.session_id === sessionId && message.sender_id === user.id

      if (messageBelongsHere) {
        if (message.read_at) {
          return NextResponse.json({
            success: true,
            notified: 0,
            message: 'Recipient already read it — skipping push',
          })
        }

        await new Promise((r) => setTimeout(r, PRESENCE_GRACE_MS))

        const { data: recheck } = await supabase
          .from('messages')
          .select('read_at')
          .eq('id', messageId)
          .maybeSingle()

        if (recheck?.read_at) {
          return NextResponse.json({
            success: true,
            notified: 0,
            message: 'Recipient is viewing this chat — skipping push',
          })
        }
      }
    }

    // Sender's name for the notification title (never trust a client-supplied value)
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    const senderName = senderProfile?.display_name || 'Someone'

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', recipientId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, notified: 0, message: 'No subscriptions' })
    }

    // Privacy: never put message content on a lock screen. Sender name only.
    const payload = JSON.stringify({
      title: '💬 New message',
      body: `${senderName} sent you a message.`,
      icon: '/icon-192.png',
      // Collapsing tag: rapid replies replace each other instead of stacking.
      tag: `chat-message-${sessionId}`,
      data: {
        type: 'chat-message',
        sessionId,
        url: `/chat/${sessionId}`,
      },
    })

    let pushCount = 0
    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload, {
          urgency: 'high',
          TTL: 600, // A chat reply stays relevant for a while, but not forever
        })
        pushCount++
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }))

    return NextResponse.json({ success: true, notified: pushCount })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error sending message notification:', msg)
    return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 })
  }
}
