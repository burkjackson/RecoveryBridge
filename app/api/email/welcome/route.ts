import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function welcomeEmailHtml(displayName: string, userRole: string): string {
  const firstName = displayName.split(' ')[0] || displayName
  const isListener = userRole === 'professional'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to RecoveryBridge</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF3F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EEF3F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#5A7A8C;border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">RecoveryBridge</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;">Real Connection &nbsp;·&nbsp; Real Recovery</p>
            </td>
          </tr>

          <!-- Opening -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;">
              <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#2D3436;">Hi ${firstName} 👋</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#4A5568;">
                Welcome to RecoveryBridge. We're genuinely glad you're here.
              </p>
              <p style="margin:0;font-size:16px;line-height:1.7;color:#4A5568;">
                Whether you're here to seek support on a hard day, to give back by listening, or both — you've just joined a community built on real human connection. This email walks you through everything you need to know to get started.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="background-color:#ffffff;padding:0 40px;"><hr style="border:none;border-top:1px solid #E8EDF2;margin:0;"></td></tr>

          <!-- Getting Support Section -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#5A7A8C;letter-spacing:1.5px;text-transform:uppercase;">When you need to talk</p>
                    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#2D3436;">Getting Support</p>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4A5568;">
                      On your hardest days, you don't have to go through it alone. Here's how to reach out:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:10px 0;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width:32px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:24px;height:24px;background-color:#E8F0F4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#5A7A8C;">1</span>
                              </td>
                              <td style="padding-left:12px;">
                                <p style="margin:0;font-size:15px;font-weight:600;color:#2D3436;">Go to your dashboard</p>
                                <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">Open RecoveryBridge and head to your dashboard.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width:32px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:24px;height:24px;background-color:#E8F0F4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#5A7A8C;">2</span>
                              </td>
                              <td style="padding-left:12px;">
                                <p style="margin:0;font-size:15px;font-weight:600;color:#2D3436;">Tap "I Need Support"</p>
                                <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">Available listeners are notified instantly — no waiting, no scheduling.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width:32px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:24px;height:24px;background-color:#E8F0F4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#5A7A8C;">3</span>
                              </td>
                              <td style="padding-left:12px;">
                                <p style="margin:0;font-size:15px;font-weight:600;color:#2D3436;">A listener shows up</p>
                                <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">A volunteer accepts and a private, one-on-one chat begins. No audience. No records shared. Just the two of you.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="width:32px;vertical-align:top;padding-top:2px;">
                                <span style="display:inline-block;width:24px;height:24px;background-color:#E8F0F4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#5A7A8C;">4</span>
                              </td>
                              <td style="padding-left:12px;">
                                <p style="margin:0;font-size:15px;font-weight:600;color:#2D3436;">Talk freely</p>
                                <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">Share what's on your mind — no judgment, no pressure. Your listener is here because they've been there too.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="background-color:#ffffff;padding:0 40px;"><hr style="border:none;border-top:1px solid #E8EDF2;margin:0;"></td></tr>

          <!-- Giving Back Section -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#B8A9C9;letter-spacing:1.5px;text-transform:uppercase;">When you want to give back</p>
              <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#2D3436;">Becoming a Listener</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4A5568;">
                One of the most powerful things you can do in recovery is show up for someone else. As a listener, you're not a counselor — you're a real person who understands. Here's how:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;padding-top:2px;">
                          <span style="display:inline-block;width:24px;height:24px;background-color:#F0EBF8;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#8B7BAB;">1</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:15px;font-weight:600;color:#2D3436;">Tap "I'm Here To Listen"</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">On your dashboard, set yourself as available. You'll appear to people who need support.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;padding-top:2px;">
                          <span style="display:inline-block;width:24px;height:24px;background-color:#F0EBF8;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#8B7BAB;">2</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:15px;font-weight:600;color:#2D3436;">Get notified when someone needs help</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">When a seeker requests support, you'll receive a push notification. Enable notifications in your profile settings so you never miss one.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;padding-top:2px;">
                          <span style="display:inline-block;width:24px;height:24px;background-color:#F0EBF8;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#8B7BAB;">3</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:15px;font-weight:600;color:#2D3436;">Connect and chat privately</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">Click "Connect" on a seeker's card to begin a private 1:1 conversation. You're in control of when you're available.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;padding-top:2px;">
                          <span style="display:inline-block;width:24px;height:24px;background-color:#F0EBF8;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#8B7BAB;">4</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:15px;font-weight:600;color:#2D3436;">Step away anytime</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">Set yourself offline whenever you need a break. You can also set Quiet Hours in your notification settings so you're never disturbed at unwanted times.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="background-color:#ffffff;padding:0 40px;"><hr style="border:none;border-top:1px solid #E8EDF2;margin:0;"></td></tr>

          <!-- Tips -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#2D3436;">A few tips to get the most out of RecoveryBridge</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#4A5568;line-height:1.6;">
                    <span style="font-weight:600;color:#2D3436;">✦ Complete your profile</span> — Add a bio and specialty tags so the right people can find you. The more you share, the more meaningful your connections.
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#4A5568;line-height:1.6;">
                    <span style="font-weight:600;color:#2D3436;">✦ Enable push notifications</span> — Especially important for listeners. Install RecoveryBridge as a PWA on your phone and enable notifications so you're alerted when someone needs you.
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#4A5568;line-height:1.6;">
                    <span style="font-weight:600;color:#2D3436;">✦ You can switch roles anytime</span> — Being a listener one day and seeking support another is completely normal. Your dashboard lets you switch with a single tap.
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#4A5568;line-height:1.6;">
                    <span style="font-weight:600;color:#2D3436;">✦ Everything is private</span> — Your conversations are confidential and never shared. What's said in a session stays there.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="background-color:#ffffff;padding:8px 40px 40px;text-align:center;">
              <a href="https://recoverybridge.app/dashboard" style="display:inline-block;background-color:#5A7A8C;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;">Go to Your Dashboard →</a>
            </td>
          </tr>

          <!-- Crisis Notice -->
          <tr>
            <td style="padding:0 0 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF7ED;border:2px solid #FED7AA;border-radius:12px;">
                <tr>
                  <td style="padding:24px 32px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#92400E;">Important: RecoveryBridge is peer support, not crisis intervention</p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#78350F;">
                      If you're in crisis or immediate danger, please contact:
                      <br><strong>988</strong> — Suicide &amp; Crisis Lifeline (call or text)
                      <br><strong>Text HOME to 741741</strong> — Crisis Text Line
                      <br><strong>911</strong> — Emergency services
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social -->
          <tr>
            <td style="padding:32px 0;text-align:center;">
              <p style="margin:0 0 16px;font-size:13px;color:#718096;">Follow us for stories, tips, and community updates</p>
              <a href="https://www.facebook.com/ARecoveryBridge/" style="display:inline-block;margin:0 8px;color:#5A7A8C;font-size:13px;font-weight:600;text-decoration:none;">Facebook</a>
              <span style="color:#CBD5E0;">·</span>
              <a href="https://www.instagram.com/recoverybridge.app" style="display:inline-block;margin:0 8px;color:#5A7A8C;font-size:13px;font-weight:600;text-decoration:none;">Instagram</a>
              <span style="color:#CBD5E0;">·</span>
              <a href="https://www.threads.com/@recoverybridge.app" style="display:inline-block;margin:0 8px;color:#5A7A8C;font-size:13px;font-weight:600;text-decoration:none;">Threads</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #E2E8F0;padding:24px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#A0AEC0;">© ${new Date().getFullYear()} RecoveryBridge. All rights reserved.</p>
              <p style="margin:0 0 8px;font-size:12px;color:#A0AEC0;">
                <a href="https://recoverybridge.app/privacy" style="color:#A0AEC0;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="https://recoverybridge.app/terms" style="color:#A0AEC0;">Terms of Service</a>
              </p>
              <p style="margin:0;font-size:11px;color:#CBD5E0;">This inbox is not monitored. For support, visit recoverybridge.app.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

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
