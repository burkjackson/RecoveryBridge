import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { findWindowStartingNow, type AvailabilityWindow } from '@/lib/timeWindows'

// How far back a window start still counts as "starting now". This has to
// absorb the cron's real cadence, not its nominal one: GitHub Actions throttles
// the every-15-minutes schedule, and gaps of 30+ minutes are routine (measured
// 2026-08-24: median 21m, max 35m). At the old 20-minute tolerance a gap
// straddling a window start meant no run ever saw it and the push never fired.
//
// A wide tolerance is only safe because of the dedupe below: each user is
// notified at most once per window occurrence, so overlapping runs cannot
// re-buzz anyone. The match is also capped at the window's own end, so this
// never announces a window that has already closed.
const WINDOW_START_TOLERANCE_MIN = 90

interface ScheduleProfile {
  id: string
  availability_schedule: AvailabilityWindow[] | null
  quiet_hours_timezone: string | null
  role_state: string | null
  // Absent until migration 027 is applied — see the fallback query below.
  last_availability_notify_key?: string | null
}

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

  // Get all profiles with non-empty schedules that are NOT already available.
  // last_availability_notify_key arrives with migration 027; if the migration
  // hasn't been applied yet, fall back to the un-deduped query rather than
  // failing the whole run (which would stop every availability push).
  const BASE_COLUMNS = 'id, availability_schedule, quiet_hours_timezone, role_state'

  const primary = await supabase
    .from('profiles')
    .select(`${BASE_COLUMNS}, last_availability_notify_key`)
    .neq('availability_schedule', '[]')

  let profiles = primary.data as ScheduleProfile[] | null
  let profilesError = primary.error
  let dedupeAvailable = true

  // 42703 is Postgres's "undefined column"; PostgREST can also answer from its
  // schema cache with PGRST204 before the query reaches Postgres at all, so
  // match either. The message check keeps the fallback scoped to the dedupe
  // column — any OTHER missing column is a real error and must surface, which
  // is how 020_availability_schedule being unapplied finally became visible.
  const missingColumn =
    profilesError != null &&
    (profilesError.code === '42703' ||
      profilesError.code === 'PGRST204' ||
      /last_availability_notify_key/i.test(
        `${profilesError.message ?? ''} ${profilesError.details ?? ''}`
      ))

  if (missingColumn) {
    dedupeAvailable = false
    console.warn(
      'scheduled-availability: last_availability_notify_key missing (apply migration 027) — running without dedupe'
    )
    const fallback = await supabase
      .from('profiles')
      .select(BASE_COLUMNS)
      .neq('availability_schedule', '[]')
    profiles = fallback.data as ScheduleProfile[] | null
    profilesError = fallback.error
  }

  if (profilesError) {
    console.error('scheduled-availability: profile query failed', profilesError)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  let notified = 0
  const toNotify: string[] = []
  // user id -> the window occurrence key we're notifying them for
  const notifyKeys = new Map<string, string>()

  for (const profile of profiles) {
    if (profile.role_state === 'available') continue // already available
    const schedule = profile.availability_schedule
    if (!schedule || schedule.length === 0) continue
    const tz = profile.quiet_hours_timezone || 'America/New_York'

    const match = findWindowStartingNow(schedule, tz, WINDOW_START_TOLERANCE_MIN)
    if (!match) continue

    // Already pushed for this exact window occurrence — a later run inside the
    // same tolerance window must not buzz them again.
    if (dedupeAvailable && profile.last_availability_notify_key === match.key) continue

    toNotify.push(profile.id)
    notifyKeys.set(profile.id, match.key)
  }

  if (toNotify.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  // Mark the occurrence before sending. A user with no push subscription still
  // gets marked, so a failed or impossible send doesn't retry every run for the
  // next 90 minutes.
  if (dedupeAvailable) {
    await Promise.all(
      [...notifyKeys.entries()].map(([userId, key]) =>
        supabase.from('profiles').update({ last_availability_notify_key: key }).eq('id', userId)
      )
    )
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
