import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 30 requests per admin per minute — generous for human use, blocks automation
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 30
const rateLimitMap = new Map<string, number[]>()

function isRateLimited(adminId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(adminId) || []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) return true
  recent.push(now)
  rateLimitMap.set(adminId, recent)
  return false
}

async function getVerifiedAdmin(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return { supabase: null, admin: null, error: 'Unauthorized' }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { supabase: null, admin: null, error: 'Invalid token' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { supabase: null, admin: null, error: 'Forbidden' }

  return { supabase, admin: user, error: null }
}

export async function POST(request: NextRequest) {
  const { supabase, admin, error } = await getVerifiedAdmin(request)
  if (error || !supabase || !admin) {
    return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 })
  }

  if (isRateLimited(admin.id)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'update_report') {
      const { reportId, status, notes } = body
      if (!reportId || !status) {
        return NextResponse.json({ error: 'reportId and status required' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: admin.id,
          resolution_notes: notes ?? null,
        })
        .eq('id', reportId)

      if (updateError) throw updateError

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'report_updated',
        target_report_id: reportId,
        details: { status, notes },
      }])

      return NextResponse.json({ success: true })
    }

    if (action === 'block_user') {
      const { userId, reason, blockType } = body
      if (!userId || !reason || !blockType) {
        return NextResponse.json({ error: 'userId, reason, and blockType required' }, { status: 400 })
      }

      const expiresAt = blockType === 'temporary'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null

      const { error: blockError } = await supabase
        .from('user_blocks')
        .insert([{
          user_id: userId,
          blocked_by: admin.id,
          reason,
          block_type: blockType,
          expires_at: expiresAt,
          is_active: true,
        }])

      if (blockError) throw blockError

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'user_blocked',
        target_user_id: userId,
        details: { reason, block_type: blockType },
      }])

      // End all active sessions for the blocked user
      await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .or(`listener_id.eq.${userId},seeker_id.eq.${userId}`)
        .eq('status', 'active')

      return NextResponse.json({ success: true })
    }

    if (action === 'unblock_user') {
      const { blockId } = body
      if (!blockId) {
        return NextResponse.json({ error: 'blockId required' }, { status: 400 })
      }

      const { error: unblockError } = await supabase
        .from('user_blocks')
        .update({ is_active: false })
        .eq('id', blockId)

      if (unblockError) throw unblockError

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'user_unblocked',
        details: { block_id: blockId },
      }])

      return NextResponse.json({ success: true })
    }

    if (action === 'end_session') {
      const { sessionId } = body
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
      }

      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (sessionError) throw sessionError

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'session_ended',
        target_session_id: sessionId,
      }])

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('Admin action error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
