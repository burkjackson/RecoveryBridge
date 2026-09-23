import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Self-service data export (CCPA/GDPR access right). Returns all data tied to
// the authenticated user as a downloadable JSON file. Users get only their own
// data — auth is the user's own bearer token, never an admin action.
export async function GET(request: NextRequest) {
  try {
    // Create client per-request (consistent with all other API routes)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    const [
      profile,
      sessions,
      messages,
      reactions,
      feedbackGiven,
      feedbackReceived,
      favorites,
      pushSubscriptions,
      reportsFiled,
      notices,
      mutesCreated,
      queuedNotifications,
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
      supabaseAdmin.from('sessions').select('*').or(`listener_id.eq.${userId},seeker_id.eq.${userId}`),
      supabaseAdmin.from('messages').select('*').eq('sender_id', userId),
      supabaseAdmin.from('message_reactions').select('*').eq('user_id', userId),
      supabaseAdmin.from('session_feedback').select('*').eq('from_user_id', userId),
      supabaseAdmin.from('session_feedback').select('*').eq('to_user_id', userId),
      supabaseAdmin.from('user_favorites').select('*').eq('user_id', userId),
      supabaseAdmin.from('push_subscriptions').select('*').eq('user_id', userId),
      supabaseAdmin.from('reports').select('*').eq('reporter_id', userId),
      // Messages the platform sent to this person — the "we couldn't connect
      // you" follow-up, an admin's personal note, an announcement. Held about
      // them and readable by them in-app, so it belongs in their export.
      supabaseAdmin.from('user_notices').select('*').eq('user_id', userId),
      // Only mutes THEY created, never ones against them (muted_id = userId)
      // — same reasoning as migration 053's mute-privacy fix: who muted you
      // is exactly the reporter-identity leak that closed. A self-export
      // isn't exempt from that.
      supabaseAdmin.from('user_mutes').select('*').eq('muter_id', userId),
      // Notifications still sitting in the queue addressed to them
      // (thank-you notes, training nudges, check-ins, broadcasts).
      supabaseAdmin.from('notification_queue').select('*').eq('user_id', userId),
    ])

    // Messages sent TO this user in any of their sessions — messages.select
    // above only covers what they wrote. Session ids are already in hand
    // from the sessions query, so this is a second pass over those ids
    // rather than a join.
    const sessionIds = (sessions.data ?? []).map((s: { id: string }) => s.id)
    const messagesReceived = sessionIds.length
      ? await supabaseAdmin
          .from('messages')
          .select('*')
          .in('session_id', sessionIds)
          .neq('sender_id', userId)
      : { data: [] }

    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        metadata: user.user_metadata,
      },
      profile: profile.data ?? null,
      sessions: sessions.data ?? [],
      messages_sent: messages.data ?? [],
      messages_received: messagesReceived.data ?? [],
      reactions: reactions.data ?? [],
      feedback_given: feedbackGiven.data ?? [],
      feedback_received: feedbackReceived.data ?? [],
      favorites: favorites.data ?? [],
      push_subscriptions: pushSubscriptions.data ?? [],
      reports_filed: reportsFiled.data ?? [],
      messages_received_from_recoverybridge: notices.data ?? [],
      mutes_created: mutesCreated.data ?? [],
      queued_notifications: queuedNotifications.data ?? [],
    }

    const filename = `recoverybridge-data-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('Data export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
