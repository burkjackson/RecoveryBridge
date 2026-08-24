import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { welcomeEmailHtml } from '@/lib/email/welcomeEmailHtml'

// Manual backfill tool: send the welcome email to a named set of users.
//
// Deliberately NOT "everyone". The previous version selected every profile
// with an email and mailed them all in one invocation, 600ms apart, with no
// record of who had already received it — so it timed out partway through on
// any real user base, and re-running it double-mailed everyone who did get one.
// Now the caller must name the recipients, which keeps a stray call from
// reaching the whole platform.
//
// Auth is the cron secret (this is invoked by hand with curl, not from the app).
export const maxDuration = 60

const MAX_RECIPIENTS = 50
const SEND_DELAY_MS = 600 // stay under Resend's 2 req/s limit

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cleanup-secret')
  if (!process.env.CLEANUP_SECRET_KEY || secret !== process.env.CLEANUP_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json().catch(() => ({}))
  const emails: unknown = body?.emails
  const userIds: unknown = body?.userIds

  const emailList = Array.isArray(emails) ? emails.filter((e): e is string => typeof e === 'string') : []
  const idList = Array.isArray(userIds) ? userIds.filter((i): i is string => typeof i === 'string') : []

  if (emailList.length === 0 && idList.length === 0) {
    return NextResponse.json(
      { error: 'Name the recipients: pass "emails": [...] or "userIds": [...].' },
      { status: 400 }
    )
  }
  if (emailList.length + idList.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `Too many recipients in one call (max ${MAX_RECIPIENTS}). Send in batches.` },
      { status: 400 }
    )
  }

  let query = supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, user_role')
    .not('email', 'is', null)

  query = idList.length > 0 && emailList.length > 0
    ? query.or(`id.in.(${idList.join(',')}),email.in.(${emailList.map((e) => `"${e}"`).join(',')})`)
    : idList.length > 0
      ? query.in('id', idList)
      : query.in('email', emailList)

  const { data: profiles, error } = await query

  if (error) {
    console.error('send-welcome-bulk lookup failed:', error)
    return NextResponse.json({ error: 'Could not load recipients' }, { status: 500 })
  }

  const results: { email: string; status: 'sent' | 'error'; reason?: string }[] = []

  for (const profile of profiles ?? []) {
    if (!profile.email) continue

    const { error: sendError } = await resend.emails.send({
      from: 'RecoveryBridge <hello@contact.recoverybridge.app>',
      replyTo: 'admin@recoverybridge.app',
      to: profile.email,
      subject: 'Welcome to RecoveryBridge 💙',
      html: welcomeEmailHtml(profile.display_name || 'there'),
    })

    results.push(
      sendError
        ? { email: profile.email, status: 'error', reason: sendError.message }
        : { email: profile.email, status: 'sent' }
    )

    await new Promise((r) => setTimeout(r, SEND_DELAY_MS))
  }

  return NextResponse.json({
    requested: emailList.length + idList.length,
    matched: profiles?.length ?? 0,
    sent: results.filter((r) => r.status === 'sent').length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  })
}
