import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || ''
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || ''

function getRoleLabel(userRole: string | null | undefined): string {
  if (userRole === 'person_in_recovery') return 'Person in Recovery'
  if (userRole === 'professional') return 'Allies in Long-Term Recovery'
  if (userRole === 'ally') return 'Recovery Support (Legacy)'
  return 'Not set yet'
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('x-webhook-secret')
      if (authHeader !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()

    // Supabase sends { type: 'INSERT', table: 'profiles', record: { ... } }
    if (body.type !== 'INSERT' || body.table !== 'profiles') {
      return NextResponse.json({ message: 'Ignored' }, { status: 200 })
    }

    const record = body.record as {
      display_name?: string
      email?: string
      user_role?: string | null
      created_at?: string
    }

    if (!record?.display_name) {
      return NextResponse.json({ message: 'No display name, skipping' }, { status: 200 })
    }

    // Log to Vercel logs regardless
    console.log(`[new-user] ${record.display_name} (${record.email}) signed up at ${record.created_at}`)

    if (!ADMIN_EMAIL) {
      console.warn('[new-user] ADMIN_NOTIFICATION_EMAIL not set — skipping email')
      return NextResponse.json({ success: true }, { status: 200 })
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[new-user] RESEND_API_KEY not set — skipping email')
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const signedUpDate = new Date(record.created_at || Date.now()).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })

    const roleLabel = getRoleLabel(record.user_role)

    // Use Resend REST API directly — no SDK needed
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RecoveryBridge <notifications@contact.recoverybridge.app>',
        to: [ADMIN_EMAIL],
        subject: `🎉 New sign-up: ${record.display_name}`,
        text: [
          'New RecoveryBridge sign-up!',
          '',
          `Name:      ${record.display_name}`,
          `Email:     ${record.email || 'unknown'}`,
          `Role:      ${roleLabel}`,
          `Signed up: ${signedUpDate} ET`,
          '',
          `Admin dashboard: https://recoverybridge.app/admin`,
        ].join('\n'),
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[new-user] Resend error:', err)
    } else {
      console.log('[new-user] Admin notification email sent successfully')
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[new-user] Webhook error:', err)
    // Always return 200 so Supabase doesn't retry endlessly
    return NextResponse.json({ error: 'Internal error' }, { status: 200 })
  }
}
