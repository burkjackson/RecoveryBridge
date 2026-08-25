import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import {
  LISTENER_TRAINING_SECTION_IDS,
  NOTIFICATION_COPY,
  TRAINING_NUDGE_STALL_DAYS,
  trainingNudgeBody,
  trainingSectionsRemaining,
  type ListenerTrainingProgress,
} from '@/lib/constants'
import {
  enqueueNotifications,
  fetchEnabledKinds,
  type QueuedNotificationInput,
} from '@/lib/notificationQueue'

/**
 * Nudge people who started listener training and stalled partway through.
 *
 * Scoped tightly on purpose. Only someone who has acknowledged at least one
 * section gets this: they opted into becoming a listener and stopped, so
 * "you're 3 sections from finishing" is a reminder. Someone who never opened
 * the page has expressed no such intent, and pushing them would be marketing.
 *
 * Runs on the shared 15-minute cron. The monthly dedupe key means the
 * frequency costs one cheap query per tick and nothing else — a given person
 * can be nudged at most once per calendar month.
 */

interface TrainingProfile {
  id: string
  listener_training_progress: ListenerTrainingProgress | null
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Bail before the profile scan when the switch is off. enqueueNotifications
  // would drop these anyway, but this cron runs ~96 times a day and there is no
  // point querying for candidates nobody is going to message.
  const enabledKinds = await fetchEnabledKinds(supabase)
  if (!enabledKinds.has('training_nudge')) {
    return NextResponse.json({ queued: 0, reason: 'training_nudge is switched off' })
  }

  const now = new Date()
  const stalledBefore = new Date(
    now.getTime() - TRAINING_NUDGE_STALL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, listener_training_progress')
    .is('listener_training_completed_at', null)
    // Not null AND old enough: someone still working through the page right
    // now has a fresh timestamp and is excluded.
    .lt('listener_training_progress_at', stalledBefore)

  if (error) {
    console.error('[training-nudge] profile query failed', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  // One nudge per person per calendar month, in UTC. The exact month boundary
  // doesn't matter — this only has to be stable within a month.
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

  const items: QueuedNotificationInput[] = []

  for (const profile of (profiles ?? []) as TrainingProfile[]) {
    const remaining = trainingSectionsRemaining(profile.listener_training_progress)

    // Started but not finished. `remaining === total` means they have a
    // timestamp but no acknowledgements (they un-ticked everything), which is
    // not the intent signal this nudge relies on.
    if (remaining <= 0 || remaining >= LISTENER_TRAINING_SECTION_IDS.length) continue

    items.push({
      userId: profile.id,
      category: 'announcement',
      kind: 'training_nudge',
      title: NOTIFICATION_COPY.TRAINING_NUDGE_TITLE,
      body: trainingNudgeBody(remaining),
      url: '/training',
      tag: `training-nudge-${profile.id}`,
      dedupeKey: monthKey,
    })
  }

  const { queued, skipped } = await enqueueNotifications(supabase, items)
  return NextResponse.json({ queued, skipped, candidates: items.length })
}

// Vercel cron jobs invoke their path with GET
export async function GET(request: NextRequest) {
  return POST(request)
}
