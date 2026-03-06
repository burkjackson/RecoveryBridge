export function welcomeEmailHtml(displayName: string, userRole: string): string {
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
            <td style="background:linear-gradient(135deg, #E8EEF2 0%, #E8E4F0 50%, #E8EEF2 100%);border-radius:16px 16px 0 0;padding:40px 40px 28px;text-align:center;">
              <img src="https://recoverybridge.app/logo-with-text.png" alt="RecoveryBridge" width="260" style="display:block;margin:0 auto 16px;max-width:260px;">
              <p style="margin:0;font-size:16px;color:#4A5568;font-style:italic;">"Connection is the antidote to addiction"</p>
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
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#5A7A8C;letter-spacing:1.5px;text-transform:uppercase;">When you need to connect</p>
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
                          <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">When a seeker requests support, you'll get a push notification instantly. <strong style="color:#2D3436;">See the notification setup guide below</strong> — it takes 2 minutes and makes all the difference.</p>
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
                          <p style="margin:4px 0 0;font-size:14px;color:#4A5568;line-height:1.6;">Set yourself offline whenever you need a break. Quiet Hours let you block off times you're never disturbed — like overnight.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notification Setup Callout -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF8E6;border:2px solid #F59E0B;border-radius:12px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#92400E;letter-spacing:1.5px;text-transform:uppercase;">Action Required</p>
                    <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#78350F;">Set up notifications — takes 2 minutes</p>
                    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#92400E;">
                      Without notifications, you won't know when someone needs you. Here's exactly what to do:
                    </p>

                    <!-- Step A -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td style="vertical-align:top;width:28px;padding-top:1px;">
                          <span style="display:inline-block;width:20px;height:20px;background-color:#F59E0B;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#ffffff;">A</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#78350F;">Install RecoveryBridge as an app on your phone</p>
                          <p style="margin:3px 0 0;font-size:13px;color:#92400E;line-height:1.6;">
                            <strong>iPhone (Safari):</strong> Tap the Share icon → "Add to Home Screen"<br>
                            <strong>Android (Chrome):</strong> Tap the menu (⋮) → "Add to Home Screen" or "Install App"<br>
                            <em>This is required to receive push notifications reliably.</em>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Step B -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td style="vertical-align:top;width:28px;padding-top:1px;">
                          <span style="display:inline-block;width:20px;height:20px;background-color:#F59E0B;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#ffffff;">B</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#78350F;">Enable push notifications</p>
                          <p style="margin:3px 0 0;font-size:13px;color:#92400E;line-height:1.6;">
                            Open RecoveryBridge → tap <strong>Profile</strong> → scroll to <strong>Notification Settings</strong> → toggle on <strong>"Enable Push Notifications"</strong> and allow when prompted.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Step C -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td style="vertical-align:top;width:28px;padding-top:1px;">
                          <span style="display:inline-block;width:20px;height:20px;background-color:#F59E0B;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#ffffff;">C</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#78350F;">Turn on "Always Available" <span style="font-weight:400;font-style:italic;">(recommended)</span></p>
                          <p style="margin:3px 0 0;font-size:13px;color:#92400E;line-height:1.6;">
                            In Notification Settings, enable <strong>"Always Available"</strong>. This means you'll receive a notification whenever someone needs support — even if you forgot to set yourself as available that day. You stay in control: you can still choose whether to respond.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Step D -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td style="vertical-align:top;width:28px;padding-top:1px;">
                          <span style="display:inline-block;width:20px;height:20px;background-color:#F59E0B;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#ffffff;">D</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#78350F;">Make notifications persistent so you never miss them</p>
                          <p style="margin:3px 0 0;font-size:13px;color:#92400E;line-height:1.6;">
                            <strong>iPhone:</strong> Go to your phone's <strong>Settings → Notifications → RecoveryBridge → Banner Style</strong> and change it from "Temporary" to <strong>"Persistent"</strong>. This keeps the notification on your screen until you tap it — so it won't silently vanish.<br>
                            <strong>Android:</strong> Go to <strong>Settings → Apps → RecoveryBridge → Notifications</strong> and set importance to <strong>"Urgent"</strong> or <strong>"High"</strong>.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Step E -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:top;width:28px;padding-top:1px;">
                          <span style="display:inline-block;width:20px;height:20px;background-color:#F59E0B;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#ffffff;">E</span>
                        </td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#78350F;">Set Quiet Hours so you're never disturbed overnight</p>
                          <p style="margin:3px 0 0;font-size:13px;color:#92400E;line-height:1.6;">
                            In Notification Settings → <strong>Quiet Hours</strong>, choose a Do Not Disturb window (e.g., 10 PM – 7 AM). Notifications are silenced during that time automatically — so you can sleep easy.
                          </p>
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
              <p style="margin:0 0 20px;font-size:13px;color:#718096;">Follow us for stories, tips, and community updates</p>
              <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
                <tr>
                  <!-- Facebook -->
                  <td style="padding:0 10px;">
                    <a href="https://www.facebook.com/ARecoveryBridge/" style="display:inline-block;text-decoration:none;">
                      <img src="https://recoverybridge.app/facebook-icon.png" alt="Facebook" width="40" height="40" style="display:block;border-radius:50%;">
                    </a>
                  </td>
                  <!-- Instagram -->
                  <td style="padding:0 10px;">
                    <a href="https://www.instagram.com/recoverybridge.app" style="display:inline-block;text-decoration:none;">
                      <img src="https://recoverybridge.app/instagram-icon.png" alt="Instagram" width="40" height="40" style="display:block;border-radius:50%;">
                    </a>
                  </td>
                  <!-- Threads -->
                  <td style="padding:0 10px;">
                    <a href="https://www.threads.com/@recoverybridge.app" style="display:inline-block;text-decoration:none;">
                      <div style="width:40px;height:40px;background-color:#2D3436;border-radius:50%;text-align:center;line-height:40px;font-size:18px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">@</div>
                    </a>
                  </td>
                </tr>
              </table>
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
