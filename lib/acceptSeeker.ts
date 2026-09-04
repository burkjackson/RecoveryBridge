import type { SupabaseClient } from '@supabase/supabase-js'
import { getActiveBlock } from '@/lib/blocks'
import { syncSessionRoleStates } from '@/lib/sessionState'

export type AcceptSeekerResult =
  | { kind: 'session'; id: string }
  | { kind: 'blocked'; reason: string }
  /** Unique-violation on the one-active-session-per-seeker index — someone
   *  else connected with this person a moment earlier. */
  | { kind: 'conflict' }
  | { kind: 'error'; message: string }

/**
 * A listener accepting (connecting with) a seeker who's currently requesting
 * support — the shared half of `components/PeopleSeeking.tsx`'s
 * `connectWithSeeker` and `app/connect/page.tsx`'s `accept()`. Each of those
 * keeps its own page-specific checks (PeopleSeeking re-checks the seeker is
 * still `requesting` before calling this, to avoid a pointless round trip
 * when its own list is stale; /connect does the equivalent in its read-only
 * `check()` preflight, plus its own "what actually happened" readback on
 * failure) — this only does the part both share: block check, insert, and
 * the role_state sync once it lands.
 */
export async function acceptSeeker(
  supabase: SupabaseClient,
  { listenerId, seekerId }: { listenerId: string; seekerId: string }
): Promise<AcceptSeekerResult> {
  const blockCheck = await getActiveBlock(supabase, listenerId)
  if (blockCheck) {
    return { kind: 'blocked', reason: blockCheck.reason ?? '' }
  }

  // Listener-initiated: no accepted_at override, so it defaults to now() —
  // choosing to connect already is acceptance.
  const { data: session, error } = await supabase
    .from('sessions')
    .insert([{ listener_id: listenerId, seeker_id: seekerId, status: 'active' }])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { kind: 'conflict' }
    }
    return { kind: 'error', message: error.message || 'An unexpected error occurred' }
  }

  if (!session) {
    return { kind: 'error', message: 'An unexpected error occurred' }
  }

  // Mark both users offline while in chat — seeker leaves the seeking list,
  // listener becomes unavailable to other seekers until the session ends.
  await syncSessionRoleStates(supabase, session.id, 'start')

  return { kind: 'session', id: session.id }
}
