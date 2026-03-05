import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { welcomeEmailHtml } from '@/lib/email/welcomeEmailHtml'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cleanup-secret')
  if (!secret || secret !== process.env.CLEANUP_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const testEmail = body?.testEmail as string | undefined

  let query = supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, user_role')
    .not('email', 'is', null)

  if (testEmail) {
    query = query.eq('email', testEmail)
  }

  const { data: profiles, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { email: string; status: 'sent' | 'skipped' | 'error'; reason?: string }[] = []

  for (const profile of profiles ?? []) {
    if (!profile.email) {
      results.push({ email: '(none)', status: 'skipped', reason: 'no email' })
      continue
    }

    const { error: sendError } = await resend.emails.send({
      from: 'RecoveryBridge <hello@contact.recoverybridge.app>',
      to: profile.email,
      subject: 'Welcome to RecoveryBridge 💙',
      html: welcomeEmailHtml(profile.display_name || 'there', profile.user_role || ''),
    })

    if (sendError) {
      results.push({ email: profile.email, status: 'error', reason: sendError.message })
    } else {
      results.push({ email: profile.email, status: 'sent' })
    }

    // Small delay between sends (600ms to stay under Resend's 2 req/s limit)
    await new Promise(r => setTimeout(r, 600))
  }

  return NextResponse.json({
    total: profiles?.length ?? 0,
    sent: results.filter(r => r.status === 'sent').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  })
}
