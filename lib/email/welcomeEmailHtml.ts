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
                      <div style="width:40px;height:40px;background-color:#1877F2;border-radius:50%;text-align:center;line-height:0;padding-top:9px;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="#ffffff">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                    </a>
                  </td>
                  <!-- Instagram -->
                  <td style="padding:0 10px;">
                    <a href="https://www.instagram.com/recoverybridge.app" style="display:inline-block;text-decoration:none;">
                      <div style="width:40px;height:40px;background:#bc1888;border-radius:50%;text-align:center;line-height:0;padding-top:9px;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="#ffffff">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>
                    </a>
                  </td>
                  <!-- Threads -->
                  <td style="padding:0 10px;">
                    <a href="https://www.threads.com/@recoverybridge.app" style="display:inline-block;text-decoration:none;">
                      <div style="width:40px;height:40px;background-color:#2D3436;border-radius:50%;text-align:center;line-height:0;padding-top:9px;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="22" height="22" fill="#ffffff">
                          <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.898-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.195 47.292 9.643 32.788 28.094 19.882 44.634 13.224 67.399 13.001 95.932v.136c.223 28.533 6.88 51.299 19.787 67.839 14.504 18.451 36.094 27.899 64.199 28.094h.113c24.94-.169 42.503-6.715 57.013-21.208 18.963-18.944 18.392-42.631 12.157-57.157-4.531-10.556-13.228-19.079-24.733-24.708z"/>
                          <path d="M96.764 122.16c-10.964 0-19.578-2.886-25.095-8.35-4.179-4.136-6.298-9.614-6.124-15.802.365-12.809 10.265-21.638 25.57-22.499 8.923-.514 16.954.228 24.006 2.202a84.45 84.45 0 0 1 2.64.822c-.69 8.166-2.817 14.455-6.33 18.755-4.424 5.395-10.898 8.12-19.667 8.872z"/>
                        </svg>
                      </div>
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
