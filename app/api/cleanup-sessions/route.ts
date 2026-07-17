import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TIME_MINUTES, TIME, OUTREACH_COPY } from '@/lib/constants'
import { sendPushToUser } from '@/lib/serverPush'

// When cleanup resets seekers who were still 'requesting' after going stale,
// they asked for support and never connected. Reach back out to each: record an
// in-app 'reconnect' notice (surfaced on their next visit + read by the admin
// "Couldn't Connect" view) and send a warm push. Best-effort and per-user
// isolated so one failure can't abort the cleanup run.
async function followUpMissedConnections(
  supabase: SupabaseClient,
  seekers: { id: string }[]
) {
  for (const seeker of seekers) {
    try {
      await supabase.from('user_notices').insert({
        user_id: seeker.id,
        kind: 'reconnect',
        title: OUTREACH_COPY.RECONNECT_TITLE,
        body: OUTREACH_COPY.RECONNECT_BODY,
      })
      await sendPushToUser(supabase, seeker.id, {
        title: OUTREACH_COPY.RECONNECT_TITLE,
        body: OUTREACH_COPY.RECONNECT_BODY,
        url: '/dashboard',
        tag: `reconnect-${seeker.id}`,
      })
    } catch (err) {
      console.error(`[cleanup] Follow-up failed for seeker ${seeker.id?.slice(0, 8)}:`, err)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with service role for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Authentication: Allow either authenticated users OR secret key (for cron jobs)
    const authHeader = request.headers.get('authorization')
    const secretKey = request.headers.get('x-cleanup-secret')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    // Vercel crons send `Authorization: Bearer ${CRON_SECRET}`; GitHub Actions and
    // manual triggers send x-cleanup-secret. Accept either secret via either channel.
    const cronSecrets = [process.env.CLEANUP_SECRET_KEY, process.env.CRON_SECRET].filter(Boolean)

    // Check for secret key first (for cron jobs or manual triggers)
    if (secretKey) {
      if (cronSecrets.length === 0) {
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
      }
      if (!cronSecrets.includes(secretKey)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    // Bearer token carrying a cron secret (Vercel cron invocations)
    else if (bearerToken && cronSecrets.includes(bearerToken)) {
      // Authorized as cron
    }
    // Otherwise require authentication (for dashboard-triggered cleanups)
    else if (bearerToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken)

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    // No authentication provided
    else {
      return NextResponse.json({
        error: 'Authentication required. Provide either Authorization header or x-cleanup-secret.'
      }, { status: 401 })
    }

    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev) console.log('Starting session cleanup...')

    // Get all active sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, created_at')
      .eq('status', 'active')

    if (sessionsError) {
      console.error('Error fetching active sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    if (!activeSessions || activeSessions.length === 0) {
      if (isDev) console.log('No active sessions to clean up')
      // Still reset stale seekers even when no sessions exist
      const staleThreshold = new Date(Date.now() - TIME.SEEKER_STALE_REQUESTING_MS).toISOString()
      const { data: staleRequesters } = await supabase
        .from('profiles')
        .update({ role_state: 'offline' })
        .eq('role_state', 'requesting')
        .lt('last_heartbeat_at', staleThreshold)
        .select('id')
      if (staleRequesters && staleRequesters.length > 0) {
        await followUpMissedConnections(supabase, staleRequesters)
      }
      return NextResponse.json({
        success: true,
        message: 'No sessions to clean up',
        cleaned: 0,
        staleSeekerReset: staleRequesters?.length ?? 0
      })
    }

    if (isDev) console.log(`Found ${activeSessions.length} active sessions`)

    const now = new Date()
    const sessionsToClose: string[] = []

    // Batch query: Get last message for ALL active sessions at once (fixes N+1 query)
    const sessionIds = activeSessions.map(s => s.id)
    const { data: allMessages } = await supabase
      .from('messages')
      .select('session_id, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })

    // Create a map of session_id to last message timestamp
    const lastMessageMap = new Map<string, string>()
    allMessages?.forEach(msg => {
      if (!lastMessageMap.has(msg.session_id)) {
        lastMessageMap.set(msg.session_id, msg.created_at)
      }
    })

    // Check each session for cleanup criteria (with in-memory lookups)
    for (const session of activeSessions) {
      const lastMessageTimestamp = lastMessageMap.get(session.id)

      // Calculate time since last activity
      const lastActivityTime = lastMessageTimestamp
        ? new Date(lastMessageTimestamp)
        : new Date(session.created_at)

      const minutesSinceLastActivity = (now.getTime() - lastActivityTime.getTime()) / 1000 / 60

      // Close session if:
      // 1. No messages and session is older than threshold (abandoned before chatting)
      // 2. Last message exceeds inactivity threshold
      const shouldClose = (!lastMessageTimestamp && minutesSinceLastActivity > TIME_MINUTES.CLEANUP_NO_MESSAGES) ||
                          (lastMessageTimestamp && minutesSinceLastActivity > TIME_MINUTES.CLEANUP_INACTIVE)

      if (shouldClose) {
        if (isDev) console.log(`Session ${session.id}: ${minutesSinceLastActivity.toFixed(1)} minutes inactive - will close`)
        sessionsToClose.push(session.id)
      }
    }

    // Close all stale sessions
    if (sessionsToClose.length > 0) {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'ended',
          ended_at: now.toISOString()
        })
        .in('id', sessionsToClose)

      if (updateError) {
        console.error('Error closing sessions:', updateError)
        return NextResponse.json({ error: 'Failed to close sessions' }, { status: 500 })
      }

      if (isDev) console.log(`Closed ${sessionsToClose.length} stale session(s)`)
    } else {
      if (isDev) console.log('No stale sessions found')
    }

    // Reset stale 'requesting' role states — seekers who left without logging out.
    // Their role_state stays 'requesting' in DB so they auto-rejoin if they return
    // within the display window (5 min). After 30 min of no heartbeat we reset to 'offline'.
    const staleRequestingThreshold = new Date(Date.now() - TIME.SEEKER_STALE_REQUESTING_MS).toISOString()
    const { data: staleRequesters, error: staleError } = await supabase
      .from('profiles')
      .update({ role_state: 'offline' })
      .eq('role_state', 'requesting')
      .lt('last_heartbeat_at', staleRequestingThreshold)
      .select('id')

    if (staleError) {
      console.error('Error resetting stale requesting states:', staleError)
    } else if (staleRequesters && staleRequesters.length > 0) {
      if (isDev) console.log(`Reset ${staleRequesters.length} stale requesting state(s) to offline`)
      // These seekers requested support and never connected — reach back out.
      await followUpMissedConnections(supabase, staleRequesters)
    }

    return NextResponse.json({
      success: true,
      message: sessionsToClose.length > 0
        ? `Closed ${sessionsToClose.length} stale session(s)`
        : 'No stale sessions to close',
      cleaned: sessionsToClose.length,
      sessionIds: sessionsToClose.length > 0 ? sessionsToClose : undefined,
      staleSeekerReset: staleRequesters?.length ?? 0
    })

  } catch (error: unknown) {
    console.error('Session cleanup error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cleanup failed' }, { status: 500 })
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
