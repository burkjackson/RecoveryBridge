import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rateLimit'
import { NOTIFICATION_COPY } from '@/lib/constants'
import { enqueueNotifications } from '@/lib/notificationQueue'

/**
 * Queue a "you received a thank-you note" push for the person the caller just
 * thanked.
 *
 * Called from the post-session feedback modal. Nothing here trusts the client
 * beyond the session id: the note's existence, its author and its recipient are
 * all read back from session_feedback, so this endpoint can't be used to send
 * someone an unsolicited notification.
 *
 * Queued rather than sent inline because a thank-you note is warm, not urgent —
 * it should wait out the recipient's quiet hours rather than wake them.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // A session ends once; anything beyond a handful a minute is a retry loop
    // or abuse. The dedupe key makes duplicates harmless either way.
    if (isRateLimited('notifications-thank-you', user.id, 10, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let sessionId: string
    try {
      const body = await request.json()
      sessionId = body.sessionId
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // The feedback row is the authorization gate AND the payload source: it
    // exists only because this user wrote a note in this session, and it names
    // the recipient. No separate participant check is needed — from_user_id is
    // matched to the caller.
    const { data: feedback } = await supabase
      .from('session_feedback')
      .select('id, to_user_id, thank_you_note')
      .eq('session_id', sessionId)
      .eq('from_user_id', user.id)
      .maybeSingle()

    if (!feedback?.thank_you_note || !feedback.to_user_id) {
      return NextResponse.json({ success: true, queued: 0, message: 'No thank-you note to deliver' })
    }

    // Never notify yourself, however a session came to be shaped that way.
    if (feedback.to_user_id === user.id) {
      return NextResponse.json({ success: true, queued: 0 })
    }

    const { queued } = await enqueueNotifications(supabase, [
      {
        userId: feedback.to_user_id,
        category: 'announcement',
        kind: 'thank_you',
        title: NOTIFICATION_COPY.THANK_YOU_TITLE,
        // Deliberately not the note itself, and not the sender's name: this
        // renders on a locked phone that other people can see.
        body: NOTIFICATION_COPY.THANK_YOU_BODY,
        url: '/history',
        tag: `thank-you-${feedback.to_user_id}`,
        // One notification per feedback row, however many times this is called.
        dedupeKey: feedback.id,
      },
    ])

    return NextResponse.json({ success: true, queued })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error queueing thank-you notification:', msg)
    return NextResponse.json({ success: false, error: 'Failed to queue notification' }, { status: 500 })
  }
}
