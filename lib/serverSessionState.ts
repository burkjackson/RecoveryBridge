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
   * Skip touching the seeker's role_state entirely. Use this when the seeker
   * is blocked or already in another active session, so a late or replayed
   * 'end' can't move them. Defaults to true.
   */
  restoreSeeker?: boolean
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
  { restoreListener = true, restoreSeeker = true, wasAccepted = true }: EndTransitionOptions = {}
): Promise<void> {
  const seekerUpdate = wasAccepted
    ? { role_state: 'offline' as const }
    : { role_state: 'requesting' as const, last_heartbeat_at: new Date().toISOString() }
  // Wrapped in async IIFEs (rather than chaining .then() straight off the
  // query builder) so each entry is a real Promise — the builder itself is
  // only thenable, which Promise.all's typing doesn't accept in an array
  // declared with a concrete element type.
  const updates: Array<Promise<{ error: unknown; label: string }>> = []
  if (restoreSeeker) {
    updates.push(
      (async () => {
        const { error } = await supabase.from('profiles').update(seekerUpdate).eq('id', seekerId)
        return { error, label: 'seeker' }
      })()
    )
  }
  if (restoreListener) {
    updates.push(
      (async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ role_state: 'available', last_heartbeat_at: new Date().toISOString() })
          .eq('id', listenerId)
          // always_available means the listener manages role_state manually
          // (see the identical exclusion — and its reasoning — in
          // app/api/cleanup-sessions/route.ts's resetStaleAvailability). The
          // only way such a listener's row is ever 'offline' is that they
          // set it themselves, since staleness resets skip them too.
          // Without this filter, a listener who toggled themselves off
          // mid-chat — in another tab, or right as this session ended — got
          // silently flipped back to 'available' the moment the session
          // closed, overriding a choice they'd just made.
          .eq('always_available', false)
        return { error, label: 'listener' }
      })()
    )
  }
  const results = await Promise.all(updates)
  // Every prior version of this function swallowed the result entirely —
  // a failed update here left someone stuck exactly where the header above
  // says this function exists to stop: dropped from AvailableListeners,
  // /listeners, and every push target, with nothing on screen to explain
  // why. Logging can't retry the write, but it at least makes the failure
  // visible instead of indistinguishable from a normal restore.
  for (const { error, label } of results) {
    if (error) {
      console.error(`[endSessionRoleStates] Failed to restore ${label} role_state:`, error)
    }
  }
}
