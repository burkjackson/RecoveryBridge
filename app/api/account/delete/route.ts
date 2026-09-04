import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rateLimit'
import { deleteUserAccount } from '@/lib/deleteUserAccount'

// Self-service account deletion (CCPA/GDPR erasure right).
//
// This has to run server-side: deleting an auth user requires the service role
// key, and the profile row can only be removed as a cascade of that delete —
// there is deliberately no DELETE policy on `profiles` for regular clients.
// The browser previously called `auth.auth.admin.deleteUser()` with the anon
// key, which always 403s, then fell back to deleting the profile row directly.
// Under RLS that delete matched zero rows and returned NO error, so the UI
// reported success and signed the person out while their account survived.
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (isRateLimited('account-delete', user.id, 3, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    await deleteUserAccount(supabaseAdmin, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'We could not delete your account. Please contact admin@recoverybridge.app.' },
      { status: 500 }
    )
  }
}
