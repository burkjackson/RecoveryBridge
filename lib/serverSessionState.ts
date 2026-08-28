import type { SupabaseClient } from '@supabase/supabase-js'

interface EndTransitionOptions {
  /**
   * Skip returning the listener to 'available'. Use this when the listener is
   * the account being blocked (or otherwise shouldn't be handed back into the
   * pool) — never re-surface someone who's about to lose the ability to
   * actually respond. Defaults to true (the normal end-of-conversation case).
   */
  restoreListener?: boolean
}

/**
 * Server-side mirror of the 'end' phase in app/api/sessions/state/route.ts,
 * for callers that already hold the service role and a session row — the
 * cleanup cron, account deletion, admin moderation — and so have no user JWT
 * to hit that HTTP route with (it authenticates via `auth.getUser(token)`,
 * which only works for a signed-in participant acting on their own behalf).
 *
 * Moves BOTH participants' role_state the same way ending a session from the
 * chat page does: seeker -> offline, listener -> available (unless told not
 * to). Closing a session with a raw `sessions` update and nothing else — which
 * is what every one of the callers above used to do — is what left listeners
 * stuck 'offline' indefinitely: silently dropped from AvailableListeners,
 * /listeners, and every support-request push until they happened to reopen
 * the dashboard and re-toggle "I'm Here To Listen". See CLAUDE.md known
 * issues on this class of RLS gotcha (a client can only write its own row,
 * so the counterpart's half of a transition has to happen server-side).
 */
export async function endSessionRoleStates(
  supabase: SupabaseClient,
  { seekerId, listenerId }: { seekerId: string; listenerId: string },
  { restoreListener = true }: EndTransitionOptions = {}
): Promise<void> {
  const updates = [
    supabase.from('profiles').update({ role_state: 'offline' }).eq('id', seekerId),
  ]
  if (restoreListener) {
    updates.push(
      supabase
        .from('profiles')
        .update({ role_state: 'available', last_heartbeat_at: new Date().toISOString() })
        .eq('id', listenerId)
    )
  }
  await Promise.all(updates)
}
