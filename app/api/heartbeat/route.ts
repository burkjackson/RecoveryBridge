import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get authenticated user from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse user ID from request body
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Update last_heartbeat_at timestamp
    const { error } = await supabase
      .from('profiles')
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('role_state', 'available') // Only update if user is actually marked as available

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
