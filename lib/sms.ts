/**
 * SMS utility module using Twilio
 * Gracefully returns false if Twilio is not configured
 */

let twilioClient: any = null

function getTwilioClient() {
  if (twilioClient) return twilioClient

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    return null
  }

  try {
    // Dynamic import to avoid build errors if twilio isn't installed yet
    const twilio = require('twilio')
    twilioClient = twilio(accountSid, authToken)
    return twilioClient
  } catch {
    console.warn('Twilio SDK not available. SMS notifications disabled.')
    return null
  }
}

/**
 * Send an SMS message via Twilio
 * Returns true on success, false on failure or if Twilio is not configured
 */
export async function sendSMS(to: string, body: string): Promise<boolean> {
  const client = getTwilioClient()
  if (!client) return false

  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  if (!fromNumber) {
    console.warn('TWILIO_PHONE_NUMBER not configured. SMS not sent.')
    return false
  }

  try {
    await client.messages.create({
      body,
      from: fromNumber,
      to,
    })
    return true
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return false
  }
}

/**
 * Validate E.164 phone number format
 * Examples: +15551234567, +442071234567
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone)
}
