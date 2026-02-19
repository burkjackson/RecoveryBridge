import { Resend } from 'resend'

const FROM_ADDRESS = 'RecoveryBridge <notifications@recoverybridge.app>'
const APP_URL = 'https://recoverybridge.app'

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
