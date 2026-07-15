import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { parseReferralSource } from '@/lib/constants'
import { escapeHtml } from '@/lib/email/escapeHtml'

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = 'admin@recoverybridge.app'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch authoritative profile data server-side rather than trusting the client body —
    // this runs at the end of onboarding, so referral_source/user_role are already saved.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('display_name, user_role, referral_source, created_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const roleLabel =
      profile.user_role === 'professional' ? 'Listener (Professional)'
      : profile.user_role === 'person_in_recovery' ? 'Person in Recovery'
      : profile.user_role === 'ally' ? 'Ally'
      : 'Not set'

    const parsedReferral = parseReferralSource(profile.referral_source)
    const referralLabel = parsedReferral
      ? `${parsedReferral.emoji} ${parsedReferral.label}${parsedReferral.detail ? ` — ${parsedReferral.detail}` : ''}`
      : '—'

    const { error } = await resend.emails.send({
      from: 'RecoveryBridge <hello@contact.recoverybridge.app>',
      to: ADMIN_EMAIL,
      subject: `New signup: ${profile.display_name || 'Unknown'}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#2D3436;margin-bottom:16px;">🎉 New RecoveryBridge Signup</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#718096;font-size:14px;">Name</td>
              <td style="padding:8px 0;color:#2D3436;font-size:14px;font-weight:600;">${escapeHtml(profile.display_name) || '—'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#718096;font-size:14px;">Email</td>
              <td style="padding:8px 0;color:#2D3436;font-size:14px;">${escapeHtml(user.email) || '—'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#718096;font-size:14px;">Role</td>
              <td style="padding:8px 0;color:#2D3436;font-size:14px;">${roleLabel}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#718096;font-size:14px;">How they found us</td>
              <td style="padding:8px 0;color:#2D3436;font-size:14px;">${escapeHtml(referralLabel)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#718096;font-size:14px;">Signed up</td>
              <td style="padding:8px 0;color:#2D3436;font-size:14px;">${profile.created_at ? new Date(profile.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : '—'}</td>
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
  } catch (error) {
    console.error('notify-signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
