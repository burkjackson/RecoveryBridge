import { NextRequest, NextResponse } from 'next/server'
import { sendContactMessageEmail } from '@/lib/email'
import { isRateLimited } from '@/lib/rateLimit'

// Public contact-form endpoint. The form is available to logged-out visitors,
// so there's no auth — instead we validate + cap input and apply a light
// in-memory rate limit per IP to blunt obvious abuse. Like the notification
// route's limiter, this resets on cold start; that's acceptable for a
// low-volume contact form (see CLAUDE.md "In-memory rate limiter").

const MAX_LENGTHS = { name: 100, email: 200, subject: 100, message: 5000 }
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 } // 5 messages / 10 min per IP
const VALID_SUBJECTS = new Set([
  'General Question',
  'Technical Support',
  'Safety Concern',
  'Account Issue',
  'Feedback',
  'Partnership Inquiry',
  'Other',
])

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (isRateLimited('contact', ip, RATE_LIMIT.max, RATE_LIMIT.windowMs)) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again in a little while, or email admin@recoverybridge.app directly.' },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim()
    const subject = String(body.subject ?? '').trim()
    const message = String(body.message ?? '').trim()

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Please fill in all fields.' }, { status: 400 })
    }
    if (
      name.length > MAX_LENGTHS.name ||
      email.length > MAX_LENGTHS.email ||
      subject.length > MAX_LENGTHS.subject ||
      message.length > MAX_LENGTHS.message
    ) {
      return NextResponse.json({ error: 'One or more fields is too long.' }, { status: 400 })
    }
    // Basic shape check — a full RFC validation isn't worth it; we just need a
    // plausible reply-to address.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!VALID_SUBJECTS.has(subject)) {
      return NextResponse.json({ error: 'Please choose a valid topic.' }, { status: 400 })
    }

    const { success } = await sendContactMessageEmail({ name, email, subject, message })
    if (!success) {
      return NextResponse.json(
        { error: 'We could not send your message right now. Please email admin@recoverybridge.app directly.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
