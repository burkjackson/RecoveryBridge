import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rateLimit'
import { containsCrisisLanguage } from '@/lib/constants'

/**
 * Server-verified crisis flag: sets sessions.crisis_flagged_at the first
 * time crisis language shows up in a session's messages.
 *
 * Called from the chat page whenever its own client-side detector lights
 * up the in-chat banner. This route never trusts that — it's a cue to look,
 * not a fact to record. It re-reads the session's actual messages and only
 * writes crisis_flagged_at if containsCrisisLanguage() (the same detector,
 * lib/constants.ts) actually matches one of them. See migration 056: the
 * column itself is locked to the service role, so this route is the only
 * way it ever gets set.
 *
 * Idempotent — a session is flagged once; later calls are a no-op.
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

    if (isRateLimited('sessions-flag-crisis', user.id, 10, 60 * 1000)) {
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

    const { data: session } = await supabase
      .from('sessions')
      .select('id, listener_id, seeker_id, crisis_flagged_at')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session || (session.listener_id !== user.id && session.seeker_id !== user.id)) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    if (session.crisis_flagged_at) {
      return NextResponse.json({ success: true, flagged: true, alreadyFlagged: true })
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content')
      .eq('session_id', sessionId)
      .limit(500)

    if (messagesError) {
      return NextResponse.json({ error: 'Could not read messages' }, { status: 500 })
    }

    const hasCrisisLanguage = (messages ?? []).some((m) => containsCrisisLanguage(m.content))
    if (!hasCrisisLanguage) {
      return NextResponse.json({ success: true, flagged: false })
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ crisis_flagged_at: new Date().toISOString() })
      .eq('id', sessionId)
      .is('crisis_flagged_at', null)

    if (updateError) {
      return NextResponse.json({ error: 'Could not flag session' }, { status: 500 })
    }

    return NextResponse.json({ success: true, flagged: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error flagging crisis session:', msg)
    return NextResponse.json({ success: false, error: 'Failed to flag session' }, { status: 500 })
  }
}
