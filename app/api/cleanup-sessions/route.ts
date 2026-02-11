import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TIME_MINUTES } from '@/lib/constants'

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

    // Check for secret key first (for cron jobs or manual triggers)
    if (secretKey) {
      const validSecret = process.env.CLEANUP_SECRET_KEY || 'dev-secret-key-change-in-production'
      if (secretKey !== validSecret) {
        return NextResponse.json({ error: 'Invalid secret key' }, { status: 401 })
      }
    }
    // Otherwise require authentication (for dashboard-triggered cleanups)
    else if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)

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

    console.log('🧹 Starting session cleanup...')

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
      console.log('✅ No active sessions to clean up')
      return NextResponse.json({
        success: true,
        message: 'No sessions to clean up',
        cleaned: 0
      })
    }

    console.log(`📊 Found ${activeSessions.length} active sessions`)

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
        console.log(`⏱️  Session ${session.id}: ${minutesSinceLastActivity.toFixed(1)} minutes inactive - will close`)
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

      console.log(`✅ Closed ${sessionsToClose.length} stale session(s)`)

      return NextResponse.json({
        success: true,
        message: `Closed ${sessionsToClose.length} stale session(s)`,
        cleaned: sessionsToClose.length,
        sessionIds: sessionsToClose
      })
    }

    console.log('✅ No stale sessions found')
    return NextResponse.json({
      success: true,
      message: 'No stale sessions to close',
      cleaned: 0
    })

  } catch (error: any) {
    console.error('Session cleanup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
