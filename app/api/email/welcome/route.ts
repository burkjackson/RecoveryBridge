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
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { displayName, userRole } = await request.json()

    if (!user.email) {
      return NextResponse.json({ error: 'No email address found' }, { status: 400 })
    }

    const { error: sendError } = await resend.emails.send({
      from: 'RecoveryBridge <hello@contact.recoverybridge.app>',
      to: user.email,
      subject: 'Welcome to RecoveryBridge 💙',
      html: welcomeEmailHtml(displayName || 'there', userRole || ''),
    })

    if (sendError) {
      console.error('Resend error:', sendError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Welcome email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
