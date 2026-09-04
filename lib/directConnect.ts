import type { SupabaseClient } from '@supabase/supabase-js'
import { getActiveBlock } from '@/lib/blocks'
import { syncSessionRoleStates } from '@/lib/sessionState'

export type DirectConnectResult =
  | { kind: 'session'; id: string }
  | { kind: 'blocked'; reason: string }
  | { kind: 'error'; message: string }

/**
 * Start (or rejoin) a seeker-initiated direct connect with a specific
 * listener: the "Connect" button on a listener's card, wherever that card
 * appears.
 *
 * This used to be three separately-maintained ~60-line copies —
 * `components/AvailableListeners.tsx`, `app/listeners/page.tsx`, and
 * `app/dashboard/page.tsx`'s `connectWithFavorite` — that had quietly drifted
 * from each other. `AvailableListeners.tsx` was the most complete version;
 * `app/listeners/page.tsx` never called `syncSessionRoleStates()` at all
 * (the seeker never left the "requesting" list while their pending request
 * sat open), and `connectWithFavorite` had the same gap. Consolidating here
 * means all three now behave identically, and a future fix only has to land
 * once.
 */
export async function startDirectConnect(
  supabase: SupabaseClient,
  { seekerId, listenerId }: { seekerId: string; listenerId: string }
): Promise<DirectConnectResult> {
  // Blocked users can't start sessions (same guard on every connect path).
  const blockCheck = await getActiveBlock(supabase, seekerId)
  if (blockCheck) {
    return { kind: 'blocked', reason: blockCheck.reason ?? '' }
  }

  // Already talking to this listener? Join that instead of trying to open a
  // second one — the DB only allows one active session per seeker anyway.
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('seeker_id', seekerId)
    .eq('listener_id', listenerId)
    .eq('status', 'active')
    .maybeSingle()

  if (existingSession) {
    return { kind: 'session', id: existingSession.id }
  }

  // accepted_at: null — this is a seeker-initiated direct connect, not yet
  // accepted by the listener; the chat page gates messaging on it (see
  // migration 036).
  const { data: session, error } = await supabase
    .from('sessions')
    .insert([{ seeker_id: seekerId, listener_id: listenerId, status: 'active', accepted_at: null }])
    .select()
    .single()

  if (error || !session) {
    // The DB enforces one active session per seeker — if we lost a race (a
    // listener answered our request moments ago, or a double-tap slipped
    // through), join whatever's there instead of surfacing an error.
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('seeker_id', seekerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { kind: 'session', id: existing.id }
    }

    return { kind: 'error', message: error?.message || 'An unexpected error occurred' }
  }

  // Notify the listener with a distinct "direct connect" push (fire-and-forget
  // — must never block the caller from navigating into the chat).
  supabase.auth.getSession().then(({ data: { session: authSession } }) => {
    if (!authSession) return
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authSession.access_token}`,
      },
      body: JSON.stringify({ seekerId, targetListenerId: listenerId }),
    }).catch(() => {})
  })

  // Mark the seeker offline while the request is pending — the listener stays
  // exactly where they were until they accept (see Known Issue #35).
  await syncSessionRoleStates(supabase, session.id, 'start')

  return { kind: 'session', id: session.id }
}
