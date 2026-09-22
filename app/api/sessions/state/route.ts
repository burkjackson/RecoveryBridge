import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rateLimit'
import { endSessionRoleStates } from '@/lib/serverSessionState'
import { getActiveBlock } from '@/lib/blocks'

/** How long after a session ends a participant may still call 'end' for it.
 *  The client that ends a session calls this straight away, and the other
 *  side's tab follows within seconds via realtime. Anything later is a stale
 *  tab or a replay of an old session id, and must not move anyone. */
const END_WINDOW_MS = 2 * 60 * 1000

// Move BOTH participants' role_state when a session starts or ends.
//
// Why this is a server route: RLS only lets a user update their own profile
// row, so the client-side `update(...).in('id', [me, them])` calls silently
// updated half of what they intended. The dropped half caused real harm —
// a seeker connected by a listener stayed 'requesting' forever, so the cleanup
// cron later "reset" them and sent the apologetic "we couldn't connect you"
// follow-up to someone who had just had a conversation. The mirror case left a
// listener stuck 'offline' after the seeker ended the chat, quietly cutting
// them out of support notifications.
//
// The caller must be a participant in the session; everything else is derived
// from the session row, never from the request body.
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

    if (isRateLimited('sessions-state', user.id, 20, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let sessionId: string
    let phase: string
    try {
      const body = await request.json()
      sessionId = body.sessionId
      phase = body.phase
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (typeof sessionId !== 'string' || (phase !== 'start' && phase !== 'end')) {
      return NextResponse.json({ error: 'sessionId and phase (start|end) required' }, { status: 400 })
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('id, listener_id, seeker_id, status, accepted_at, ended_at')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.listener_id !== user.id && session.seeker_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (phase === 'start') {
      // Only a live session can take anyone offline. Without this, anyone who
      // ever shared a session with a listener could replay its id and knock
      // that listener out of the pool whenever they liked.
      if (session.status !== 'active') {
        return NextResponse.json({ error: 'Session is not active' }, { status: 409 })
      }
      // A still-pending direct connect (accepted_at null) only moves the
      // seeker — see Known Issue #35 (2 Sep 2026): a seeker's tap used to
      // take the listener 'offline' immediately, up to 10 minutes before
      // they'd done anything, removing them from every list and every
      // broadcast push for a request they might decline outright. The
      // listener only leaves the pool once acceptConnection() calls this
      // same phase again after accepted_at is actually set. An
      // already-accepted session (every non-direct-connect path, and a
      // direct connect re-confirming after accept) keeps moving both sides,
      // same as before.
      const updates = [
        supabase.from('profiles').update({ role_state: 'offline' }).eq('id', session.seeker_id),
      ]
      if (session.accepted_at) {
        updates.push(
          supabase.from('profiles').update({ role_state: 'offline' }).eq('id', session.listener_id)
        )
      }
      await Promise.all(updates)
    } else {
      // Seeker goes offline; the listener returns to available so they can
      // take another conversation. Only do this once the session is actually
      // over, so a stray call can't pull someone out of a live chat.
      if (session.status !== 'ended') {
        return NextResponse.json({ error: 'Session is still active' }, { status: 409 })
      }
      // Only a session that just ended. An old session id replayed later used
      // to put a blocked listener straight back into the pool, or flip a
      // listener who'd since started another chat back to 'available'.
      // ended_at is frozen once a session ends (migration 054), so a client
      // can't refresh it to reopen this window.
      const endedAtMs = session.ended_at ? new Date(session.ended_at).getTime() : NaN
      if (!Number.isFinite(endedAtMs) || Date.now() - endedAtMs > END_WINDOW_MS) {
        return NextResponse.json({ error: 'Session ended too long ago' }, { status: 409 })
      }

      // Never restore someone who is blocked (this route runs as the service
      // role, so the 041 trigger that stops a blocked user setting their own
      // role_state doesn't apply here), or who is already in another live
      // session — moving them would pull them out of, or push strangers into,
      // a conversation that's actually happening.
      const [listenerBlock, seekerBlock, listenerBusy, seekerBusy, seekerProfile, listenerProfile] = await Promise.all([
        getActiveBlock(supabase, session.listener_id),
        getActiveBlock(supabase, session.seeker_id),
        hasOtherActiveSession(supabase, session.listener_id, session.id),
        hasOtherActiveSession(supabase, session.seeker_id, session.id),
        supabase.from('profiles').select('role_state').eq('id', session.seeker_id).maybeSingle(),
        supabase.from('profiles').select('last_heartbeat_at').eq('id', session.listener_id).maybeSingle(),
      ])
      // A seeker who has already asked for help again (e.g. "Find another
      // listener" in chat, or a fresh request from the dashboard) must not be
      // pulled back out of the queue when the other side's tab echoes this
      // 'end' a few seconds later.
      const seekerRequeued =
        (seekerProfile.data as { role_state?: string } | null)?.role_state === 'requesting'
      // Both clients call 'end' (the one who ended it, then the other side's
      // tab when realtime tells it), so the second call is an echo. Restoring
      // the listener stamps a fresh heartbeat, so a heartbeat at or after
      // ended_at means that already happened. Doing it again would undo
      // anything the listener did in between: most importantly signing out,
      // which sets them offline and would otherwise be flipped straight back
      // to 'available' by the seeker's tab a second later.
      const listenerHeartbeat = (listenerProfile.data as { last_heartbeat_at?: string | null } | null)?.last_heartbeat_at
      const listenerAlreadyRestored =
        !!listenerHeartbeat && new Date(listenerHeartbeat).getTime() >= endedAtMs

      // A pending direct-connect that was declined ("Not now") or cancelled
      // ("Cancel request") ends with accepted_at still null — see
      // wasAccepted's doc comment in serverSessionState.ts for why that
      // seeker goes back to 'requesting' instead of 'offline'.
      await endSessionRoleStates(supabase, {
        seekerId: session.seeker_id,
        listenerId: session.listener_id,
      }, {
        wasAccepted: !!session.accepted_at,
        restoreListener: !listenerBlock && !listenerBusy && !listenerAlreadyRestored,
        restoreSeeker: !seekerBlock && !seekerBusy && !seekerRequeued,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session state transition error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

async function hasOtherActiveSession(
  supabase: SupabaseClient,
  userId: string,
  excludeSessionId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('status', 'active')
    .neq('id', excludeSessionId)
    .or(`listener_id.eq.${userId},seeker_id.eq.${userId}`)
    .limit(1)
  // Fail safe: if we can't tell, assume they're busy and leave them alone.
  if (error) return true
  return Array.isArray(data) && data.length > 0
}
