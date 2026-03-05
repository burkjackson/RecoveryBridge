import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = 'admin@recoverybridge.app'
const WEBHOOK_SECRET = process.env.CLEANUP_SECRET_KEY

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json()

  // Only handle profile inserts
  if (payload.type !== 'INSERT') {
    return NextResponse.json({ skipped: true })
  }

  const { display_name, email, user_role, created_at } = payload.record ?? {}

  const roleLabel =
    user_role === 'professional' ? 'Listener (Professional)'
    : user_role === 'person_in_recovery' ? 'Person in Recovery'
    : user_role === 'ally' ? 'Ally'
    : 'Not set'

  const { error } = await resend.emails.send({
    from: 'RecoveryBridge <hello@contact.recoverybridge.app>',
    to: ADMIN_EMAIL,
    subject: `New signup: ${display_name || 'Unknown'}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2D3436;margin-bottom:16px;">🎉 New RecoveryBridge Signup</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#718096;font-size:14px;">Name</td>
            <td style="padding:8px 0;color:#2D3436;font-size:14px;font-weight:600;">${display_name || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#718096;font-size:14px;">Email</td>
            <td style="padding:8px 0;color:#2D3436;font-size:14px;">${email || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#718096;font-size:14px;">Role</td>
            <td style="padding:8px 0;color:#2D3436;font-size:14px;">${roleLabel}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#718096;font-size:14px;">Signed up</td>
            <td style="padding:8px 0;color:#2D3436;font-size:14px;">${created_at ? new Date(created_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : '—'}</td>
          </tr>
        </table>
        <div style="margin-top:24px;">
          <a href="https://recoverybridge.app/admin" style="display:inline-block;background-color:#5A7A8C;color:#fff;text-decoration:none;padding:10px 24px;border-radius:50px;font-size:14px;font-weight:600;">View in Admin →</a>
        </div>
      </div>
    `,
  })

  if (error) {
    console.error('notify-signup email error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
