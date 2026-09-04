import type { SupabaseClient } from '@supabase/supabase-js'
import { endSessionRoleStates } from './serverSessionState'

/**
 * Deletes a user's account: ends any session they're currently active in (so
 * the other participant isn't left in a chat with a ghost), restores that
 * other participant's role_state the same way a normal session end does,
 * then deletes the auth user — which cascades to public.profiles and
 * everything hanging off it via FK (messages, favorites, push subscriptions,
 * …).
 *
 * Shared by the self-service delete route and the admin delete route so an
 * account disappears the same way no matter who triggered it — before this
 * was extracted, the admin path skipped the session cleanup entirely and
 * left the counterpart mid-chat with someone who no longer existed, stuck
 * `offline` until the cleanup cron's timeout caught it. Caller supplies its
 * own service-role client and is responsible for auth/authorization before
 * calling this — it does no permission checking of its own. Throws on a
 * failed `auth.admin.deleteUser` call; the caller decides how to report it.
 */
export async function deleteUserAccount(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: endedSessions } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('status', 'active')
    .or(`listener_id.eq.${userId},seeker_id.eq.${userId}`)
    .select('id, listener_id, seeker_id')

  // Whichever side `userId` was on is about to be deleted anyway, so only
  // the other person's state actually matters here — but running the normal
  // two-sided update is simpler than special-casing which side to skip.
  await Promise.all(
    (endedSessions ?? []).map(async (session) => {
      try {
        await endSessionRoleStates(supabaseAdmin, {
          seekerId: session.seeker_id,
          listenerId: session.listener_id,
        })
      } catch (err) {
        console.error(`Could not sync role_state for session ${session.id} during account deletion:`, err)
      }
    })
  )

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteError) throw deleteError
}
