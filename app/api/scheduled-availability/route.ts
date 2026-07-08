import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { isWindowStartingNow, type AvailabilityWindow } from '@/lib/timeWindows'

// How far back a window start still counts as "starting now". Must be a little
// longer than the trigger cadence (15 min via GitHub Actions) so scheduler
// jitter can't skip a window; overlap at worst re-sends a push with the same
// tag, which the OS collapses into one notification.
const WINDOW_START_TOLERANCE_MIN = 20

export async function POST(request: NextRequest) {
  // Auth: cron secret header OR bearer token. Vercel crons send
  // `Authorization: Bearer ${CRON_SECRET}`; GitHub Actions sends x-cron-secret.
  const secret = request.headers.get('x-cron-secret')
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const cronSecrets = [process.env.CLEANUP_SECRET_KEY, process.env.CRON_SECRET].filter(
    (s): s is string => Boolean(s)
  )

  const isAuthorized =
    cronSecrets.length > 0 &&
    ((secret !== null && cronSecrets.includes(secret)) ||
      (bearerToken !== null && cronSecrets.includes(bearerToken)))

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.VAPID_SUBJECT || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Push config missing' }, { status: 500 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all profiles with non-empty schedules that are NOT already available
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, availability_schedule, quiet_hours_timezone, role_state')
    .neq('availability_schedule', '[]')

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  let notified = 0
  const toNotify: string[] = []

  for (const profile of profiles) {
    if (profile.role_state === 'available') continue // already available
    const schedule = profile.availability_schedule as AvailabilityWindow[]
    if (!schedule || schedule.length === 0) continue
    const tz = profile.quiet_hours_timezone || 'America/New_York'
    if (isWindowStartingNow(schedule, tz, WINDOW_START_TOLERANCE_MIN)) {
      toNotify.push(profile.id)
    }
  }

  if (toNotify.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  // Fetch push subscriptions for these users
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', toNotify)

  const payload = JSON.stringify({
    title: 'Your support time is starting',
    body: 'Your scheduled availability window is now — tap to go available.',
    url: '/dashboard',
    tag: 'scheduled-availability',
  })

  const invalidEndpoints: string[] = []

  for (const sub of subscriptions || []) {
    try {
      await webpush.sendNotification(sub.subscription, payload)
      notified++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 410 || status === 404) {
        invalidEndpoints.push((sub.subscription as { endpoint: string }).endpoint)
      }
    }
  }

  // Clean up stale subscriptions
  if (invalidEndpoints.length > 0) {
    for (const endpoint of invalidEndpoints) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('subscription->>endpoint', endpoint)
    }
  }

  return NextResponse.json({ notified })
}

// Vercel cron jobs invoke their path with GET
export async function GET(request: NextRequest) {
  return POST(request)
}
