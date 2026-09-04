import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendReportResolvedToReporter, sendReportResolvedToReported } from '@/lib/email'
import { sendPushToUser } from '@/lib/serverPush'
import {
  BROADCAST_AUDIENCES,
  BROADCAST_LIMITS,
  OUTREACH_COPY,
  REENGAGEMENT_INACTIVE_DAYS,
  type BroadcastAudience,
} from '@/lib/constants'
import {
  enqueueNotifications,
  fetchEnabledKinds,
  NOTIFICATION_KINDS,
  type NotificationKind,
  type QueuedNotificationInput,
} from '@/lib/notificationQueue'
import { isRateLimited } from '@/lib/rateLimit'
import { endSessionRoleStates } from '@/lib/serverSessionState'
import { UUID_RE } from '@/lib/validation'

const AUDIENCE_KEYS = BROADCAST_AUDIENCES.map((a) => a.key) as readonly string[]

/** Rows per insert, and per page when reading the audience back. */
const BROADCAST_CHUNK = 500

/**
 * A broadcast's tap target ends up in the push payload, which the service
 * worker hands to clients.openWindow. Anything but an in-app path would make
 * the notification an open redirect, so only same-origin paths are accepted
 * ('//evil.com' is protocol-relative, not a path).
 */
function isInternalPath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * Resolve an audience key to user ids, server-side. The client picks a named
 * audience and never sends a recipient list.
 *
 * Paginated because PostgREST caps an unbounded select (1,000 rows by default)
 * and silently returns a truncated page — which for a broadcast would look
 * exactly like a successful send to everyone.
 */
async function resolveBroadcastAudience(
  supabase: SupabaseClient,
  audience: BroadcastAudience
): Promise<string[]> {
  // "People with push on" is the one audience that isn't a profiles filter:
  // it's whoever has a registered device, which lives in push_subscriptions.
  // One person can have several devices, hence the dedupe.
  if (audience === 'push_enabled') {
    const ids = new Set<string>()
    for (let page = 0; ; page++) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .order('user_id', { ascending: true })
        .range(page * BROADCAST_CHUNK, (page + 1) * BROADCAST_CHUNK - 1)

      if (error) throw error
      const batch = (data ?? []) as { user_id: string }[]
      for (const row of batch) ids.add(row.user_id)
      if (batch.length < BROADCAST_CHUNK) break
    }
    return [...ids]
  }

  const cutoff = new Date(
    Date.now() - REENGAGEMENT_INACTIVE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const ids: string[] = []
  for (let page = 0; ; page++) {
    const base = supabase.from('profiles').select('id')

    const filtered =
      audience === 'listeners'
        ? base.not('listener_training_completed_at', 'is', null)
        : audience === 'active_30d'
          ? base.gte('last_heartbeat_at', cutoff)
          : audience === 'inactive_30d'
            ? base.or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${cutoff}`)
            : base

    const { data, error } = await filtered
      .order('id', { ascending: true })
      .range(page * BROADCAST_CHUNK, (page + 1) * BROADCAST_CHUNK - 1)

    if (error) throw error
    const batch = (data ?? []) as { id: string }[]
    ids.push(...batch.map((r) => r.id))
    if (batch.length < BROADCAST_CHUNK) break
  }
  return ids
}

/**
 * How many of an already-resolved audience have announcements switched on
 * AND have a registered device, i.e. could actually receive a push — not
 * just opted in. Counted from the resolved id list rather than re-running
 * the audience filter, so the preview can't disagree with the send.
 *
 * Mirrors the drain route's own gate: a row for someone with no
 * push_subscriptions row gets skipped there with skip_reason:
 * 'no_subscription' rather than delivered. Counting opt-in alone
 * overstated this — e.g. desktop-only signups, or anyone who never
 * finished enabling push — and told the admin more people would hear a
 * broadcast than actually would before they confirmed sending it.
 *
 * Chunked well below BROADCAST_CHUNK: `.in()` goes out as a query string, and
 * 500 UUIDs makes an ~18KB URL that proxies start rejecting.
 */
const ID_FILTER_CHUNK = 150

async function countPushable(
  supabase: SupabaseClient,
  recipientIds: string[]
): Promise<number> {
  let total = 0
  for (let i = 0; i < recipientIds.length; i += ID_FILTER_CHUNK) {
    const chunk = recipientIds.slice(i, i + ID_FILTER_CHUNK)

    const { data: optedIn } = await supabase
      .from('profiles')
      .select('id')
      .in('id', chunk)
      .eq('announcement_notifications_enabled', true)

    const optedInIds = (optedIn ?? []).map((r) => r.id as string)
    if (optedInIds.length === 0) continue

    const { data: subscribed } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .in('user_id', optedInIds)

    // A person can have multiple devices/rows — count them once.
    total += new Set((subscribed ?? []).map((r) => r.user_id as string)).size
  }
  return total
}

async function getVerifiedAdmin(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return { supabase: null, admin: null, error: 'Unauthorized' }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { supabase: null, admin: null, error: 'Invalid token' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { supabase: null, admin: null, error: 'Forbidden' }

  return { supabase, admin: user, error: null }
}

export async function POST(request: NextRequest) {
  const { supabase, admin, error } = await getVerifiedAdmin(request)
  if (error || !supabase || !admin) {
    return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 401 })
  }

  // 30/min is generous for a human clicking through the dashboard and
  // still blocks scripted abuse.
  if (isRateLimited('admin-actions', admin.id, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'update_report') {
      const { reportId, status, notes } = body
      if (!reportId || !status) {
        return NextResponse.json({ error: 'reportId and status required' }, { status: 400 })
      }

      // Fetch report + user emails before updating (for notifications)
      const { data: reportData } = await supabase
        .from('reports')
        .select(`
          reporter_id, reported_user_id,
          reporter:profiles!reports_reporter_id_fkey(display_name, email),
          reported_user:profiles!reports_reported_user_id_fkey(display_name, email)
        `)
        .eq('id', reportId)
        .single()

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: admin.id,
          resolution_notes: notes ?? null,
        })
        .eq('id', reportId)

      if (updateError) throw updateError

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'report_updated',
        target_report_id: reportId,
        details: { status, notes },
      }])

      // Fire-and-forget: notify parties when a report reaches a terminal state
      if ((status === 'resolved' || status === 'dismissed') && reportData) {
        const reporter = (reportData.reporter as unknown) as { display_name: string; email: string } | null
        const reported = (reportData.reported_user as unknown) as { display_name: string; email: string } | null

        if (reporter?.email) {
          sendReportResolvedToReporter({
            to: reporter.email,
            reporterName: reporter.display_name,
            status: status as 'resolved' | 'dismissed',
          }).catch(() => { /* silent */ })
        }

        if (status === 'resolved' && reported?.email) {
          sendReportResolvedToReported({
            to: reported.email,
            userName: reported.display_name,
          }).catch(() => { /* silent */ })
        }
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'block_user') {
      const { userId, reason, blockType } = body
      if (!userId || !reason || !blockType) {
        return NextResponse.json({ error: 'userId, reason, and blockType required' }, { status: 400 })
      }

      // The id below is interpolated into a PostgREST `.or()` filter, where
      // commas and dots are structural — validate before it gets there.
      if (!UUID_RE.test(userId)) {
        return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
      }

      const expiresAt = blockType === 'temporary'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null

      const { error: blockError } = await supabase
        .from('user_blocks')
        .insert([{
          user_id: userId,
          blocked_by: admin.id,
          reason,
          block_type: blockType,
          expires_at: expiresAt,
          is_active: true,
        }])

      if (blockError) throw blockError

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'user_blocked',
        target_user_id: userId,
        details: { reason, block_type: blockType },
      }])

      // Drop them out of the pool immediately — otherwise a blocked user who
      // isn't in an active session (just sitting 'available' or
      // 'requesting') stays visible and connectable until they happen to
      // touch their own role_state again. Migration 041's trigger stops them
      // from setting it back while blocked; this is what clears it now.
      await supabase
        .from('profiles')
        .update({ role_state: 'offline', always_available: false })
        .eq('id', userId)

      // End all active sessions for the blocked user
      const { data: endedSessions } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .or(`listener_id.eq.${userId},seeker_id.eq.${userId}`)
        .eq('status', 'active')
        .select('id, listener_id, seeker_id')

      // Free the *other* participant the same way ending a chat normally does.
      // Skip restoring the blocked user to 'available' if they were the
      // listener — the whole point of this action is that they shouldn't be
      // handed back into the pool.
      await Promise.all(
        (endedSessions ?? []).map(async (session) => {
          try {
            await endSessionRoleStates(
              supabase,
              { seekerId: session.seeker_id, listenerId: session.listener_id },
              { restoreListener: session.listener_id !== userId }
            )
          } catch (err) {
            console.error(`Could not sync role_state for session ${session.id} during block:`, err)
          }
        })
      )

      return NextResponse.json({ success: true })
    }

    if (action === 'unblock_user') {
      const { blockId } = body
      if (!blockId) {
        return NextResponse.json({ error: 'blockId required' }, { status: 400 })
      }

      const { error: unblockError } = await supabase
        .from('user_blocks')
        .update({ is_active: false })
        .eq('id', blockId)

      if (unblockError) throw unblockError

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'user_unblocked',
        details: { block_id: blockId },
      }])

      return NextResponse.json({ success: true })
    }

    if (action === 'end_session') {
      const { sessionId } = body
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
      }

      const { data: endedSession, error: sessionError } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select('id, listener_id, seeker_id')
        .single()

      if (sessionError) throw sessionError

      // A forced admin end is otherwise a normal end-of-conversation: free the
      // listener back to 'available', not just close the session row.
      try {
        await endSessionRoleStates(supabase, {
          seekerId: endedSession.seeker_id,
          listenerId: endedSession.listener_id,
        })
      } catch (err) {
        console.error(`Could not sync role_state for session ${sessionId} during admin end_session:`, err)
      }

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'session_ended',
        target_session_id: sessionId,
      }])

      return NextResponse.json({ success: true })
    }

    if (action === 'load_transcript') {
      const { sessionId, reportId } = body
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
      }

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      const senderIds = [...new Set((messages || []).map((m) => m.sender_id))]
      const profiles: Record<string, string> = {}
      if (senderIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', senderIds)
        profileData?.forEach((p) => { profiles[p.id] = p.display_name })
      }

      // Audit log is written server-side — fire-and-forget so it doesn't block the response.
      // Wrap in Promise.resolve: the Supabase builder is a PromiseLike (no .catch of its own).
      Promise.resolve(
        supabase.from('admin_logs').insert([{
          admin_id: admin.id,
          action_type: 'transcript_viewed',
          target_session_id: sessionId,
          target_report_id: reportId || null,
          details: { report_id: reportId || null },
        }])
      ).catch(() => {})

      return NextResponse.json({ success: true, messages: messages || [], profiles })
    }

    if (action === 'send_outreach') {
      const { userId, message } = body
      const trimmed = typeof message === 'string' ? message.trim() : ''
      if (!userId || !trimmed) {
        return NextResponse.json({ error: 'userId and message required' }, { status: 400 })
      }

      const noticeBody = trimmed.slice(0, OUTREACH_COPY.OUTREACH_MAX_LENGTH)

      // In-app record (surfaced on the user's next visit) — the durable copy.
      const { error: noticeError } = await supabase.from('user_notices').insert({
        user_id: userId,
        kind: 'outreach',
        title: OUTREACH_COPY.OUTREACH_TITLE,
        body: noticeBody,
        created_by: admin.id,
      })
      if (noticeError) throw noticeError

      // Push in parallel — reaches the device even with a wrong email. Best-effort.
      const pushCount = await sendPushToUser(supabase, userId, {
        title: OUTREACH_COPY.OUTREACH_TITLE,
        body: noticeBody,
        url: '/dashboard',
        tag: `outreach-${userId}`,
      })

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'outreach_sent',
        target_user_id: userId,
        details: { pushCount },
      }])

      return NextResponse.json({ success: true, pushCount })
    }

    if (action === 'notification_settings') {
      const { data: settings, error: settingsError } = await supabase
        .from('notification_kind_settings')
        .select('kind, enabled, updated_at')
        .order('kind', { ascending: true })
      if (settingsError) throw settingsError

      // What is sitting in the queue right now, so an admin can see the
      // consequence of flipping something off (pending rows get cancelled).
      const { data: queueRows } = await supabase
        .from('notification_queue')
        .select('kind, status')
        .in('status', ['pending', 'sending'])

      const pending: Record<string, number> = {}
      for (const row of (queueRows ?? []) as { kind: string }[]) {
        pending[row.kind] = (pending[row.kind] ?? 0) + 1
      }

      return NextResponse.json({ success: true, settings: settings ?? [], pending })
    }

    if (action === 'set_notification_kind') {
      const { kind, enabled } = body
      if (typeof kind !== 'string' || !NOTIFICATION_KINDS.includes(kind as NotificationKind)) {
        return NextResponse.json({ error: 'Unknown notification kind' }, { status: 400 })
      }
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
      }

      // Upsert rather than update: a kind seeded later still gets a row, and
      // the absence of one keeps meaning "off" until someone switches it on.
      const { error: upsertError } = await supabase
        .from('notification_kind_settings')
        .upsert(
          { kind, enabled, updated_by: admin.id, updated_at: new Date().toISOString() },
          { onConflict: 'kind' }
        )
      if (upsertError) throw upsertError

      // Turning a kind off cancels what it already queued — otherwise the
      // backlog would keep draining after the switch said stop.
      let cancelled = 0
      if (!enabled) {
        const { data: cancelledRows } = await supabase
          .from('notification_queue')
          .update({ status: 'skipped', skip_reason: 'kind_disabled' })
          .eq('kind', kind)
          .in('status', ['pending', 'sending'])
          .select('id')
        cancelled = (cancelledRows ?? []).length
      }

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'notification_kind_toggled',
        details: { kind, enabled, cancelled },
      }])

      return NextResponse.json({ success: true, kind, enabled, cancelled })
    }

    if (action === 'preview_broadcast') {
      const { audience } = body
      if (typeof audience !== 'string' || !AUDIENCE_KEYS.includes(audience)) {
        return NextResponse.json({ error: 'Unknown audience' }, { status: 400 })
      }

      const recipients = await resolveBroadcastAudience(supabase, audience as BroadcastAudience)

      // How many of them could actually receive a push, so the admin isn't
      // surprised when "Everyone" reaches a fraction of everyone. The rest
      // still get the in-app notice.
      const optedInCount = await countPushable(supabase, recipients)

      return NextResponse.json({
        success: true,
        recipientCount: recipients.length,
        optedInCount,
      })
    }

    if (action === 'send_broadcast') {
      const { title, body: messageBody, url, audience } = body

      const trimmedTitle = typeof title === 'string' ? title.trim() : ''
      const trimmedBody = typeof messageBody === 'string' ? messageBody.trim() : ''
      const targetUrl = typeof url === 'string' && url.trim() ? url.trim() : '/dashboard'

      if (!trimmedTitle || !trimmedBody) {
        return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
      }
      if (trimmedTitle.length > BROADCAST_LIMITS.TITLE_MAX_LENGTH) {
        return NextResponse.json({ error: 'Title is too long' }, { status: 400 })
      }
      if (trimmedBody.length > BROADCAST_LIMITS.BODY_MAX_LENGTH) {
        return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
      }
      if (typeof audience !== 'string' || !AUDIENCE_KEYS.includes(audience)) {
        return NextResponse.json({ error: 'Unknown audience' }, { status: 400 })
      }
      if (!isInternalPath(targetUrl)) {
        return NextResponse.json({ error: 'Link must be an in-app path' }, { status: 400 })
      }

      // Check the switch here, not just at enqueue. The in-app notices below are
      // written before anything is queued, so relying on the enqueue gate alone
      // would let a switched-off broadcast still land in everyone's dashboard.
      const enabledKinds = await fetchEnabledKinds(supabase)
      if (!enabledKinds.has('broadcast')) {
        return NextResponse.json(
          { error: 'Announcements are switched off. Turn them on above to send one.' },
          { status: 409 }
        )
      }

      const recipients = await resolveBroadcastAudience(supabase, audience as BroadcastAudience)
      if (recipients.length === 0) {
        return NextResponse.json({ error: 'That audience is empty' }, { status: 400 })
      }

      // The broadcast row first: it is the audit record, and its id is the
      // queue's dedupe key, so a retried request can't double-send.
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          created_by: admin.id,
          title: trimmedTitle,
          body: trimmedBody,
          url: targetUrl,
          audience,
          recipient_count: recipients.length,
        })
        .select('id')
        .single()

      if (broadcastError) throw broadcastError

      // Two delivery paths, same as admin outreach: a push for anyone who has
      // it enabled, and an in-app notice so the message still lands for
      // everyone else on their next visit.
      const notices = recipients.map((userId) => ({
        user_id: userId,
        kind: 'announcement',
        title: trimmedTitle,
        body: trimmedBody,
        created_by: admin.id,
      }))

      for (let i = 0; i < notices.length; i += BROADCAST_CHUNK) {
        const { error: noticeError } = await supabase
          .from('user_notices')
          .insert(notices.slice(i, i + BROADCAST_CHUNK))
        if (noticeError) throw noticeError
      }

      const items: QueuedNotificationInput[] = recipients.map(
        (userId): QueuedNotificationInput => ({
          userId,
          category: 'announcement',
          kind: 'broadcast',
          title: trimmedTitle,
          body: trimmedBody,
          url: targetUrl,
          tag: `broadcast-${broadcast.id}`,
          broadcastId: broadcast.id,
          dedupeKey: broadcast.id,
        })
      )

      const { queued } = await enqueueNotifications(supabase, items)

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'broadcast_sent',
        details: {
          broadcast_id: broadcast.id,
          audience,
          recipient_count: recipients.length,
          queued,
        },
      }])

      return NextResponse.json({
        success: true,
        broadcastId: broadcast.id,
        recipientCount: recipients.length,
        queued,
      })
    }

    if (action === 'delete_notices') {
      const { noticeIds } = body
      if (!Array.isArray(noticeIds) || noticeIds.length === 0) {
        return NextResponse.json({ error: 'noticeIds required' }, { status: 400 })
      }

      // Scoped to reconnect notices so this can only clear the "Couldn't Connect" list.
      const { error: deleteError } = await supabase
        .from('user_notices')
        .delete()
        .in('id', noticeIds)
        .eq('kind', 'reconnect')

      if (deleteError) throw deleteError

      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action_type: 'missed_connections_cleared',
        details: { count: noticeIds.length },
      }])

      return NextResponse.json({ success: true })
    }

    if (action === 'list_users') {
      // Full profiles rows for the admin user table — moved server-side
      // because migration 040 revoked client-readable SELECT on most of
      // these columns (email, phone_number, etc.); this route runs as
      // service role, which the column revoke never touched.
      const { data, error: listError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (listError) throw listError
      return NextResponse.json({ users: data || [] })
    }

    if (action === 'list_signups') {
      const { rangeDays } = body as { rangeDays?: number | 'all' }

      let query = supabase
        .from('profiles')
        .select('id, display_name, email, user_role, role_state, created_at, is_admin, referral_source, listener_training_completed_at')
        .order('created_at', { ascending: false })
        .limit(rangeDays === 'all' ? 1000 : 100)

      if (rangeDays !== 'all' && typeof rangeDays === 'number') {
        const since = new Date()
        since.setDate(since.getDate() - rangeDays)
        query = query.gte('created_at', since.toISOString())
      }

      const { data, error: signupsError } = await query
      if (signupsError) throw signupsError
      return NextResponse.json({ signups: data || [] })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: unknown) {
    // Log the detail, return a generic message — raw Postgres errors leak
    // schema names to the client.
    console.error('Admin action error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
