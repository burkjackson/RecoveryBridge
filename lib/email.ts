import { Resend } from 'resend'
import { escapeHtml } from '@/lib/email/escapeHtml'

const FROM_ADDRESS = 'RecoveryBridge <notifications@contact.recoverybridge.app>'
const REPLY_TO = 'admin@recoverybridge.app'
const APP_URL = 'https://recoverybridge.app'

interface SendSupportRequestEmailParams {
  to: string
  listenerName: string
  seekerName: string
  isFavorite: boolean
  isRenotification: boolean
  isDirect?: boolean
}

function buildSubject(isFavorite: boolean, isRenotification: boolean, seekerName: string, isDirect?: boolean): string {
  if (isDirect) return `🎯 ${seekerName} wants to connect with you`
  if (isFavorite) return '⭐ Someone you know needs support'
  if (isRenotification) return `⏳ ${seekerName} is still waiting for support`
  return '🤝 Someone needs support right now'
}

function buildEmailHtml(listenerName: string, seekerName: string, isFavorite: boolean, isRenotification: boolean, isDirect?: boolean): string {
  const safeListener = escapeHtml(listenerName)
  const safeSeeker = escapeHtml(seekerName)

  const headline = isDirect
    ? `${safeSeeker} wants to connect with you`
    : isFavorite
      ? `Someone you know needs support`
      : isRenotification
        ? `${safeSeeker} is still waiting`
        : `Someone needs support right now`

  const body = isDirect
    ? `${safeSeeker} chose to connect with you directly. Open the app and accept the request to start chatting.`
    : isRenotification
      ? `${safeSeeker} has been waiting 2+ minutes for a listener. Can you help?`
      : `${safeSeeker} is looking for a listener right now. Opening the app only takes a moment.`

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
              <p style="margin:0 0 8px 0;font-size:15px;color:#4A5568;">Hi ${safeListener},</p>
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

export async function sendSupportRequestEmail({
  to,
  listenerName,
  seekerName,
  isFavorite,
  isRenotification,
  isDirect,
}: SendSupportRequestEmailParams): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const subject = buildSubject(isFavorite, isRenotification, seekerName, isDirect)
    const html = buildEmailHtml(listenerName, seekerName, isFavorite, isRenotification, isDirect)

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
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

// ─── Contact / Support Form ──────────────────────────────────────────────────

interface SendContactMessageEmailParams {
  name: string
  email: string
  subject: string
  message: string
}

// Delivers a contact-form submission to the admin inbox. replyTo is set to the
// sender's address so the team can reply directly from their mail client.
export async function sendContactMessageEmail({
  name,
  email,
  subject,
  message,
}: SendContactMessageEmailParams): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false }

  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeSubject = escapeHtml(subject)
  // Preserve the sender's line breaks in the HTML version.
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>New contact message</title></head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background-color:#5A7A8C;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;">RecoveryBridge</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
          <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:700;color:#2D3436;">📬 New contact message</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FA;border-radius:8px;padding:20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#4A5568;"><strong style="color:#2D3436;">From:</strong> ${safeName}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#4A5568;"><strong style="color:#2D3436;">Email:</strong> <a href="mailto:${safeEmail}" style="color:#5A7A8C;">${safeEmail}</a></td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#4A5568;"><strong style="color:#2D3436;">Topic:</strong> ${safeSubject}</td></tr>
          </table>
          <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#2D3436;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
          <p style="margin:0;font-size:16px;color:#4A5568;line-height:1.6;">${safeMessage}</p>
          <hr style="border:none;border-top:1px solid #E8F0F4;margin:24px 0 20px 0;" />
          <p style="margin:0;font-size:12px;color:#718096;line-height:1.6;text-align:center;">
            Reply directly to this email to respond to ${safeName}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: email,
      to: REPLY_TO,
      subject: `[Contact: ${subject}] from ${name}`,
      html,
    })

    if (error) {
      console.error('Resend error (contact message):', error)
      return { success: false }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to send contact message:', err)
    return { success: false }
  }
}

// ─── Report Resolution Notifications ─────────────────────────────────────────

export async function sendReportResolvedToReporter({
  to,
  reporterName,
  status,
}: {
  to: string
  reporterName: string
  status: 'resolved' | 'dismissed'
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false }

  const isResolved = status === 'resolved'
  const subject = isResolved
    ? 'Your report has been reviewed — action taken'
    : 'Your report has been reviewed'
  const headline = isResolved ? 'We took action on your report' : 'Your report has been reviewed'
  const body = isResolved
    ? "Thank you for letting us know. We reviewed the report you submitted and have taken appropriate action to protect the community."
    : "Thank you for submitting a report. After reviewing it, our team determined that no further action was needed at this time. We take all reports seriously and appreciate your help keeping RecoveryBridge safe."

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${headline}</title></head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background-color:#5A7A8C;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;">RecoveryBridge</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 8px 0;font-size:15px;color:#4A5568;">Hi ${escapeHtml(reporterName)},</p>
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#2D3436;line-height:1.3;">${headline}</h1>
          <p style="margin:0 0 28px 0;font-size:16px;color:#4A5568;line-height:1.6;">${body}</p>
          <hr style="border:none;border-top:1px solid #E8F0F4;margin:0 0 20px 0;" />
          <p style="margin:0;font-size:12px;color:#718096;line-height:1.6;text-align:center;">
            Questions? Contact us at <a href="mailto:admin@recoverybridge.app" style="color:#5A7A8C;">admin@recoverybridge.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, replyTo: REPLY_TO, to, subject, html })
    if (error) { console.error('Resend error (report resolved — reporter):', error); return { success: false } }
    return { success: true }
  } catch (err) {
    console.error('Failed to send report resolved email to reporter:', err)
    return { success: false }
  }
}

export async function sendReportResolvedToReported({
  to,
  userName,
}: {
  to: string
  userName: string
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Account Notice</title></head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background-color:#5A7A8C;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;">RecoveryBridge</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 8px 0;font-size:15px;color:#4A5568;">Hi ${escapeHtml(userName)},</p>
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#2D3436;line-height:1.3;">Account Notice</h1>
          <p style="margin:0 0 28px 0;font-size:16px;color:#4A5568;line-height:1.6;">
            A report was submitted about your account activity on RecoveryBridge and has been reviewed by our moderation team. If your account remains active, you may continue using the platform. Please review our <a href="${APP_URL}/terms" style="color:#5A7A8C;">Community Guidelines</a> to ensure future interactions meet our standards.
          </p>
          <p style="margin:0 0 28px 0;font-size:16px;color:#4A5568;line-height:1.6;">
            If you believe this was in error, please contact us at <a href="mailto:admin@recoverybridge.app" style="color:#5A7A8C;">admin@recoverybridge.app</a>.
          </p>
          <hr style="border:none;border-top:1px solid #E8F0F4;margin:0 0 20px 0;" />
          <p style="margin:0;font-size:12px;color:#718096;line-height:1.6;text-align:center;">RecoveryBridge moderation team</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to,
      subject: 'Account notice from RecoveryBridge',
      html,
    })
    if (error) { console.error('Resend error (report resolved — reported):', error); return { success: false } }
    return { success: true }
  } catch (err) {
    console.error('Failed to send report resolved email to reported user:', err)
    return { success: false }
  }
}
