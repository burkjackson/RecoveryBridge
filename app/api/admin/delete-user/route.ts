import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rateLimit'
import { deleteUserAccount } from '@/lib/deleteUserAccount'
import { UUID_RE } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the requesting user is authenticated
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Invalid authorization header' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify the requesting user is an admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Tight limit — this one is destructive.
    if (isRateLimited('admin-delete-user', user.id, 5, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
    }

    const { targetUserId } = await request.json()
    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
    }

    // Gets interpolated into a PostgREST `.or()` filter inside
    // deleteUserAccount() and passed straight to auth.admin.deleteUser() —
    // validate before either sees it, same reasoning as block_user's userId
    // check in app/api/admin/actions/route.ts.
    if (!UUID_RE.test(targetUserId)) {
      return NextResponse.json({ error: 'Invalid targetUserId' }, { status: 400 })
    }

    // Prevent admins from deleting themselves
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Log the action before deletion (profile will cascade-delete)
    await supabase.from('admin_logs').insert([{
      admin_id: user.id,
      action_type: 'user_deleted',
      target_user_id: targetUserId,
    }])

    await deleteUserAccount(supabase, targetUserId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    // Log the detail, return a generic message: Postgres errors carry table,
    // column and constraint names.
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
