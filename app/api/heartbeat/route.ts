import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with service role for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get authenticated user from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the token and get user
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Invalid authorization header' }, { status: 401 })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse user ID from request body
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Verify that the userId matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update last_heartbeat_at timestamp
    // Allow updates for users who are either:
    // 1. Currently in "available" state (listeners), OR
    // 2. Currently in "requesting" state (seekers), OR
    // 3. Have "always_available" enabled (need heartbeat for online status)
    const { error } = await supabase
      .from('profiles')
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq('id', userId)
      .or('role_state.eq.available,role_state.eq.requesting,always_available.eq.true')

    if (error) {
      console.error('Heartbeat update error:', error)
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
