import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with service role for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Optional: Add authentication check for admin or cron job
    // const authHeader = request.headers.get('authorization')
    // You could add a secret key check here for cron jobs

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

    // Check each session for cleanup criteria
    for (const session of activeSessions) {
      // Get the last message timestamp for this session
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Calculate time since last activity
      const lastActivityTime = lastMessage
        ? new Date(lastMessage.created_at)
        : new Date(session.created_at)

      const minutesSinceLastActivity = (now.getTime() - lastActivityTime.getTime()) / 1000 / 60

      // Close session if:
      // 1. No messages and session is > 10 minutes old (abandoned before chatting)
      // 2. Last message is > 30 minutes old (longer than client-side 20 min timeout)
      const shouldClose = (!lastMessage && minutesSinceLastActivity > 10) ||
                          (lastMessage && minutesSinceLastActivity > 30)

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
