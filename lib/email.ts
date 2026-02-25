import { Resend } from 'resend'

const FROM_ADDRESS = 'RecoveryBridge <notifications@contact.recoverybridge.app>'
const APP_URL = 'https://recoverybridge.app'
const STORIES_URL = 'https://stories.recoverybridge.app'

interface SendSupportRequestEmailParams {
  to: string
  listenerName: string
  seekerName: string
  isFavorite: boolean
  isRenotification: boolean
}

function buildSubject(isFavorite: boolean, isRenotification: boolean, seekerName: string): string {
  if (isFavorite) return '⭐ Someone you know needs support'
  if (isRenotification) return `⏳ ${seekerName} is still waiting for support`
  return '🤝 Someone needs support right now'
}

function buildEmailHtml(listenerName: string, seekerName: string, isFavorite: boolean, isRenotification: boolean): string {
  const headline = isFavorite
    ? `Someone you know needs support`
    : isRenotification
      ? `${seekerName} is still waiting`
      : `Someone needs support right now`

  const body = isRenotification
    ? `${seekerName} has been waiting 2+ minutes for a listener. Can you help?`
    : `${seekerName} is looking for a listener right now. Opening the app only takes a moment.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#5A7A8C;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">RecoveryBridge</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 8px 0;font-size:15px;color:#4A5568;">Hi ${listenerName},</p>
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#2D3436;line-height:1.3;">${headline}</h1>
              <p style="margin:0 0 28px 0;font-size:16px;color:#4A5568;line-height:1.6;">${body}</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px auto;">
                <tr>
                  <td style="background-color:#5A7A8C;border-radius:50px;text-align:center;">
                    <a href="${APP_URL}/dashboard"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">
                      Open RecoveryBridge →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #E8F0F4;margin:0 0 20px 0;" />

              <!-- Footer -->
              <p style="margin:0;font-size:12px;color:#718096;line-height:1.6;text-align:center;">
                You're receiving this because you opted in to email notifications on RecoveryBridge.<br />
                You can turn this off in your <a href="${APP_URL}/profile" style="color:#5A7A8C;text-decoration:none;">profile settings</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

interface SendNewUserNotificationParams {
  adminEmail: string
  displayName: string
  userEmail: string
  userRole: string | null
  signedUpAt: string
}

export async function sendNewUserNotification({
  adminEmail,
  displayName,
  userEmail,
  userRole,
  signedUpAt,
}: SendNewUserNotificationParams): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false }
  }

  const roleLabel =
    userRole === 'person_in_recovery' ? 'Person in Recovery'
    : userRole === 'professional' ? 'Allies in Long-Term Recovery'
    : userRole === 'ally' ? 'Recovery Support (Legacy)'
    : 'Not set yet'

  const signedUpDate = new Date(signedUpAt).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New RecoveryBridge Sign-Up</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#5A7A8C;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">RecoveryBridge</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
              <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:700;color:#2D3436;">🎉 New Sign-Up</h1>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FA;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr><td style="padding:6px 0;font-size:14px;color:#4A5568;"><strong style="color:#2D3436;">Name:</strong> ${displayName}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#4A5568;"><strong style="color:#2D3436;">Email:</strong> ${userEmail}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#4A5568;"><strong style="color:#2D3436;">Role:</strong> ${roleLabel}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#4A5568;"><strong style="color:#2D3436;">Signed up:</strong> ${signedUpDate} ET</td></tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#5A7A8C;border-radius:50px;text-align:center;">
                    <a href="${APP_URL}/admin"
                       style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      View in Admin Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `🎉 New sign-up: ${displayName}`,
      html,
    })

    if (error) {
      console.error('Resend error (new user notification):', error)
      return { success: false }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to send new user notification:', err)
    return { success: false }
  }
}

// ─── Story Notifications ──────────────────────────────────────────────────────

interface SendStoryPublishedEmailParams {
  to: string
  authorName: string
  storyTitle: string
  storySlug: string
}

export async function sendStoryPublishedEmail({
  to,
  authorName,
  storyTitle,
  storySlug,
}: SendStoryPublishedEmailParams): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false }

  const storyUrl = `${STORIES_URL}/${storySlug}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your story is live!</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#5A7A8C;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">RecoveryBridge Stories</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 8px 0;font-size:15px;color:#4A5568;">Hi ${authorName},</p>
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#2D3436;line-height:1.3;">🎉 Your story is live!</h1>
              <p style="margin:0 0 8px 0;font-size:16px;color:#4A5568;line-height:1.6;">
                Your story <strong style="color:#2D3436;">"${storyTitle}"</strong> has been published and is now live on RecoveryBridge Stories.
              </p>
              <p style="margin:0 0 28px 0;font-size:16px;color:#4A5568;line-height:1.6;">
                Thank you for sharing your experience — your words have the power to help others in recovery.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px auto;">
                <tr>
                  <td style="background-color:#5A7A8C;border-radius:50px;text-align:center;">
                    <a href="${storyUrl}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">
                      Read Your Story →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #E8F0F4;margin:0 0 20px 0;" />

              <p style="margin:0;font-size:12px;color:#718096;line-height:1.6;text-align:center;">
                Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#5A7A8C;text-decoration:none;">recoverybridge.app</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `🎉 Your story "${storyTitle}" is now live on RecoveryBridge`,
      html,
    })

    if (error) {
      console.error('Resend error (story published):', error)
      return { success: false }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to send story published email:', err)
    return { success: false }
  }
}

interface SendStoryRejectedEmailParams {
  to: string
  authorName: string
  storyTitle: string
  storyId: string
  rejectionNote: string | null
}

export async function sendStoryRejectedEmail({
  to,
  authorName,
  storyTitle,
  storyId,
  rejectionNote,
}: SendStoryRejectedEmailParams): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false }

  const editUrl = `${STORIES_URL}/edit/${storyId}`
  const noteHtml = rejectionNote
    ? `<div style="background-color:#FFF8ED;border-left:4px solid #F59E0B;border-radius:4px;padding:16px;margin:0 0 24px 0;">
         <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;">Reviewer Note</p>
         <p style="margin:0;font-size:15px;color:#78350F;line-height:1.6;">${rejectionNote}</p>
       </div>`
    : `<p style="margin:0 0 24px 0;font-size:16px;color:#4A5568;line-height:1.6;">
         Please review your story and resubmit when you're ready.
       </p>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your story needs a revision</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#5A7A8C;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">RecoveryBridge Stories</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 8px 0;font-size:15px;color:#4A5568;">Hi ${authorName},</p>
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#2D3436;line-height:1.3;">Your story needs a small revision</h1>
              <p style="margin:0 0 16px 0;font-size:16px;color:#4A5568;line-height:1.6;">
                Thank you for submitting <strong style="color:#2D3436;">"${storyTitle}"</strong>. Our team reviewed it and returned it to your drafts for a revision before we can publish it.
              </p>
              ${noteHtml}

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px auto;">
                <tr>
                  <td style="background-color:#5A7A8C;border-radius:50px;text-align:center;">
                    <a href="${editUrl}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">
                      Edit &amp; Resubmit →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #E8F0F4;margin:0 0 20px 0;" />

              <p style="margin:0;font-size:12px;color:#718096;line-height:1.6;text-align:center;">
                Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#5A7A8C;text-decoration:none;">recoverybridge.app</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Your story "${storyTitle}" needs a revision`,
      html,
    })

    if (error) {
      console.error('Resend error (story rejected):', error)
      return { success: false }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to send story rejected email:', err)
    return { success: false }
  }
}

// ─── Support Request Notifications ───────────────────────────────────────────

export async function sendSupportRequestEmail({
  to,
  listenerName,
  seekerName,
  isFavorite,
  isRenotification,
}: SendSupportRequestEmailParams): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const subject = buildSubject(isFavorite, isRenotification, seekerName)
    const html = buildEmailHtml(listenerName, seekerName, isFavorite, isRenotification)

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to send email notification:', err)
    return { success: false }
  }
}
