import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rateLimit'
import { endSessionRoleStates } from '@/lib/serverSessionState'

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
      .select('id, listener_id, seeker_id, status, accepted_at')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.listener_id !== user.id && session.seeker_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (phase === 'start') {
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
      // A pending direct-connect that was declined ("Not now") or cancelled
      // ("Cancel request") ends with accepted_at still null — see
      // wasAccepted's doc comment in serverSessionState.ts for why that
      // seeker goes back to 'requesting' instead of 'offline'.
      await endSessionRoleStates(supabase, {
        seekerId: session.seeker_id,
        listenerId: session.listener_id,
      }, { wasAccepted: !!session.accepted_at })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session state transition error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
