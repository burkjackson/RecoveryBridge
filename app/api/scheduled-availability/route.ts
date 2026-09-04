import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findWindowStartingNow, type AvailabilityWindow } from '@/lib/timeWindows'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { isPushConfigured, fetchSubscriptionsByUser, sendPushToSubscriptions } from '@/lib/serverPush'

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
  last_availability_notify_key: string | null
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push config missing' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all profiles with non-empty schedules that are NOT already available.
  const { data, error: profilesError } = await supabase
    .from('profiles')
    .select('id, availability_schedule, quiet_hours_timezone, role_state, last_availability_notify_key')
    .neq('availability_schedule', '[]')
  const profiles = data as ScheduleProfile[] | null

  if (profilesError) {
    console.error('scheduled-availability: profile query failed', profilesError)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

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
    if (profile.last_availability_notify_key === match.key) continue

    toNotify.push(profile.id)
    notifyKeys.set(profile.id, match.key)
  }

  if (toNotify.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  // Mark the occurrence before sending. A user with no push subscription still
  // gets marked, so a failed or impossible send doesn't retry every run for the
  // next 90 minutes.
  await Promise.all(
    [...notifyKeys.entries()].map(([userId, key]) =>
      supabase.from('profiles').update({ last_availability_notify_key: key }).eq('id', userId)
    )
  )

  const byUser = await fetchSubscriptionsByUser(supabase, toNotify)
  const notified = await sendPushToSubscriptions(
    supabase,
    toNotify.flatMap((userId) => byUser.get(userId) ?? []),
    {
      title: 'Your support time is starting',
      body: 'Your scheduled availability window is now — tap to go available.',
      url: '/dashboard',
    },
    'scheduled-availability'
  )

  return NextResponse.json({ notified })
}

// Vercel cron jobs invoke their path with GET
export async function GET(request: NextRequest) {
  return POST(request)
}
