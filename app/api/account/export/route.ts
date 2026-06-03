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
    ])

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
      reactions: reactions.data ?? [],
      feedback_given: feedbackGiven.data ?? [],
      feedback_received: feedbackReceived.data ?? [],
      favorites: favorites.data ?? [],
      push_subscriptions: pushSubscriptions.data ?? [],
      reports_filed: reportsFiled.data ?? [],
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
