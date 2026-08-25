import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TIME_MINUTES, TIME, OUTREACH_COPY } from '@/lib/constants'
import { sendPushToUser } from '@/lib/serverPush'
import {
  seekersNeedingFollowUp,
  summariseSessions,
  unansweredSessions,
} from '@/lib/missedConnections'

// Reach back out to anyone who asked for support and was met with silence.
//
// There are two ways to end up here, and the second one is why this was
// rewritten on 25 Aug 2026:
//
//  1. Still 'requesting' when cleanup reset them — nobody ever connected.
//  2. Connected to a listener who never typed a word. Ending that session moves
//     both participants' role_state, so these people are left 'offline' and the
//     'requesting' sweep in (1) can never see them. They were invisible: no
//     follow-up, and nothing in the admin "Couldn't Connect" list either.
//
// Both funnel through the same filter, which excludes anyone who had a real
// two-way conversation in the window. Apologising to someone who just finished
// talking to a listener is its own harm and was a live bug once.
//
// Best-effort and per-user isolated so one failure can't abort the cleanup run.
async function followUpMissedConnections(
  supabase: SupabaseClient,
  staleSeekers: { id: string }[]
) {
  const since = new Date(Date.now() - TIME.MISSED_CONNECTION_LOOKBACK_MS).toISOString()

  // Sessions that ended in the window, to find people who were connected and
  // then ignored. Kept to the same lookback as everything else here.
  const { data: endedRows, error: endedError } = await supabase
    .from('sessions')
    .select('id, seeker_id, listener_id')
    .eq('status', 'ended')
    .gte('ended_at', since)

  if (endedError) {
    console.error('[cleanup] Could not read ended sessions; sent no follow-ups:', endedError)
    return
  }

  const endedSessions = endedRows ?? []
  const messagesById = endedSessions.length > 0
    ? (await supabase
        .from('messages')
        .select('session_id, sender_id')
        .in('session_id', endedSessions.map((r) => r.id))
      ).data ?? []
    : []

  const summarised = summariseSessions(endedSessions, messagesById)

  // Candidates: the stale-'requesting' seekers, plus the seekers of any session
  // where they wrote and nobody answered.
  const candidateIds = new Set(staleSeekers.map((s) => s.id))
  for (const session of unansweredSessions(summarised)) {
    if (session.seeker_id) candidateIds.add(session.seeker_id)
  }
  if (candidateIds.size === 0) return

  const candidates = [...candidateIds].map((id) => ({ id }))

  // Exclude anyone genuinely answered in the window — including by a *different*
  // listener after the silent one. Someone ignored at 09:54 who had a real
  // conversation at 09:56 must not receive an apology.
  const needFollowUp = seekersNeedingFollowUp(candidates, summarised)
  if (needFollowUp.length === 0) return

  // Don't say sorry twice. Unlike the 'requesting' path — where resetting the
  // state removes them from the candidate set — an ended session stays in the
  // lookback window for hours and would otherwise re-fire on every cron tick.
  const { data: alreadyToldRows, error: noticesError } = await supabase
    .from('user_notices')
    .select('user_id')
    .eq('kind', 'reconnect')
    .in('user_id', needFollowUp.map((s) => s.id))
    .gte('created_at', since)

  if (noticesError) {
    console.error('[cleanup] Could not check existing notices; sent no follow-ups:', noticesError)
    return
  }

  const alreadyTold = new Set((alreadyToldRows ?? []).map((r: { user_id: string }) => r.user_id))

  for (const seeker of needFollowUp) {
    if (alreadyTold.has(seeker.id)) continue
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

// Quietly correct role_state for a listener who has sat at 'available' with no
// fresh heartbeat for two weeks or more. Pure data hygiene: this never affects
// who receives a live push (that's isListenerOnline(), decided fresh on every
// request in the send route) — it only stops a stale profile from sitting in
// a state nobody believes anymore.
//
// always_available is untouched on purpose. That toggle means "ignore
// staleness" by design, which is the same reason the notification-freshness
// fix on 25 Aug left it alone (see CLAUDE.md known issues #17, #21).
async function resetStaleAvailability(supabase: SupabaseClient) {
  const staleThreshold = new Date(Date.now() - TIME.STALE_AVAILABILITY_MS).toISOString()
  const { data, error } = await supabase
    .from('profiles')
    .update({ role_state: 'offline' })
    .eq('role_state', 'available')
    .eq('always_available', false)
    // `is.null` matters: a comparison against NULL is never true, so a
    // profile with no heartbeat at all would never reset.
    .or(`last_heartbeat_at.lt.${staleThreshold},last_heartbeat_at.is.null`)
    // last_heartbeat_at must be selected even though only the id is used —
    // see the identical note on the stale-requesting query below for why an
    // `or=` column missing from `.select()` makes PostgREST 42703.
    .select('id, last_heartbeat_at')

  if (error) {
    console.error('[cleanup] Error resetting stale availability:', error)
    return { count: 0, error: error.message ?? 'failed' }
  }
  return { count: data?.length ?? 0, error: null as string | null }
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

    // Retire temporary blocks that have run their course. The admin action
    // stores expires_at but leaves is_active = true, and every read filters on
    // is_active alone — without this sweep a 7-day block never ends.
    const { data: expiredBlocks } = await supabase
      .from('user_blocks')
      .update({ is_active: false })
      .eq('is_active', true)
      .not('expires_at', 'is', null)
      .lte('expires_at', new Date().toISOString())
      .select('id')

    if (expiredBlocks && expiredBlocks.length > 0 && isDev) {
      console.log(`Expired ${expiredBlocks.length} temporary block(s)`)
    }

    // Prune the notification log. It exists to answer a question that needs
    // weeks of data, not a permanent record of who was told that whom needed
    // support.
    await supabase
      .from('notification_log')
      .delete()
      .lt('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())

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
        // `is.null` matters: a comparison against NULL is never true, so a
        // profile stuck in 'requesting' with no heartbeat would never reset.
        .or(`last_heartbeat_at.lt.${staleThreshold},last_heartbeat_at.is.null`)
        // last_heartbeat_at must be selected even though only the id is used.
        // PostgREST turns an UPDATE..RETURNING into a CTE and then re-applies
        // the `or=` filter to it, so a column used in `.or()` but missing from
        // `.select()` isn't in the CTE and Postgres raises 42703
        // ("column profiles.last_heartbeat_at does not exist"). Plain `.eq()`
        // filters are not re-applied this way — only `or=` is.
        .select('id, last_heartbeat_at')
      // Always run: the unanswered-session sweep inside has to work even when
      // nobody is stuck in 'requesting', which is precisely the case for
      // someone who was connected to a silent listener and left 'offline'.
      await followUpMissedConnections(supabase, staleRequesters ?? [])
      const availabilityReset = await resetStaleAvailability(supabase)
      return NextResponse.json({
        success: true,
        message: 'No sessions to clean up',
        cleaned: 0,
        staleSeekerReset: staleRequesters?.length ?? 0,
        staleAvailabilityReset: availabilityReset.count,
        staleAvailabilityError: availabilityReset.error,
        blocksExpired: expiredBlocks?.length ?? 0
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
      // See the note above: NULL heartbeats need an explicit branch.
      .or(`last_heartbeat_at.lt.${staleRequestingThreshold},last_heartbeat_at.is.null`)
      // See the note on the same query above: the `or=` column has to be in the
      // select or PostgREST's RETURNING CTE fails with 42703.
      .select('id, last_heartbeat_at')

    if (staleError) {
      // Surface this in the response, not just the console. This exact query
      // silently 400'd on every run between 24 and 25 Aug 2026 while the cron
      // reported success, so the stale reset and the missed-connection
      // follow-up were both dead and nothing said so (cf. the 020 migration
      // post-mortem in CLAUDE.md).
      console.error('Error resetting stale requesting states:', staleError)
    } else if (staleRequesters && staleRequesters.length > 0 && isDev) {
      console.log(`Reset ${staleRequesters.length} stale requesting state(s) to offline`)
    }

    // Always run, even with no stale requesters and even if the reset above
    // failed: the sweep also covers people who WERE connected and then ignored,
    // who are left 'offline' and never appear in that reset at all.
    await followUpMissedConnections(supabase, staleError ? [] : (staleRequesters ?? []))

    const availabilityReset = await resetStaleAvailability(supabase)

    return NextResponse.json({
      success: true,
      message: sessionsToClose.length > 0
        ? `Closed ${sessionsToClose.length} stale session(s)`
        : 'No stale sessions to close',
      // Non-null whenever the stale reset failed, so a broken run is visible in
      // the cron output instead of looking like a clean 200.
      staleResetError: staleError ? (staleError.message ?? 'failed') : null,
      cleaned: sessionsToClose.length,
      sessionIds: sessionsToClose.length > 0 ? sessionsToClose : undefined,
      staleSeekerReset: staleRequesters?.length ?? 0,
      staleAvailabilityReset: availabilityReset.count,
      staleAvailabilityError: availabilityReset.error,
      blocksExpired: expiredBlocks?.length ?? 0
    })

  } catch (error: unknown) {
    console.error('Session cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
