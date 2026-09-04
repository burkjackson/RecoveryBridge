import type { SupabaseClient } from '@supabase/supabase-js'

interface EndTransitionOptions {
  /**
   * Skip returning the listener to 'available'. Use this when the listener is
   * the account being blocked (or otherwise shouldn't be handed back into the
   * pool) — never re-surface someone who's about to lose the ability to
   * actually respond. Defaults to true (the normal end-of-conversation case).
   */
  restoreListener?: boolean
  /**
   * Whether this session ever got past the direct-connect pending stage
   * (session.accepted_at is set). Defaults to true, which keeps the original
   * seeker -> 'offline' behavior for every caller that doesn't pass this —
   * admin end_session, block_user, and account deletion never had to
   * distinguish it, so they still don't.
   *
   * A pending direct-connect that was declined or timed out (accepted_at
   * still null when it ends) never became a real conversation, so dropping
   * the seeker to 'offline' the same way a finished chat does was itself a
   * bug: they'd asked for support and nothing had happened yet, but they'd
   * silently vanish from People Seeking and every push target until they
   * noticed and re-toggled. Pass `wasAccepted: false` and the seeker is
   * restored to 'requesting' instead — visible again, free to try another
   * listener or a broadcast — matching the "you can try another listener or
   * send a request to everyone" message app/chat/[id]/page.tsx shows them.
   * See CLAUDE.md Known Issue on this (item 8 of the 2 Sep 2026 review).
   */
  wasAccepted?: boolean
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
  { restoreListener = true, wasAccepted = true }: EndTransitionOptions = {}
): Promise<void> {
  const seekerUpdate = wasAccepted
    ? { role_state: 'offline' as const }
    : { role_state: 'requesting' as const, last_heartbeat_at: new Date().toISOString() }
  const updates = [
    supabase.from('profiles').update(seekerUpdate).eq('id', seekerId),
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
