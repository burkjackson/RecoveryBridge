import type { SupabaseClient } from '@supabase/supabase-js'
import { syncSessionRoleStates } from '@/lib/sessionState'
import { getCurrentPushEndpoint } from '@/lib/pushNotifications'

/**
 * Sign out without leaving anything behind. Used by every sign-out button.
 *
 * Before this, sign-out on the dashboard ended sessions (which restores a
 * listener to 'available' with a fresh heartbeat) and then just signed out,
 * and Profile and History didn't even end sessions. So a listener who signed
 * out showed as online for another hour, and the device kept its push
 * subscription row: a shared or handed-down phone kept showing "X needs
 * support" on the lock screen for an account nobody was signed in to.
 *
 * Every step is best-effort. Signing out must never hang or fail because a
 * cleanup call did.
 */
export async function signOutAndCleanUp(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // 1. End any live conversation, moving the other person's role_state
      //    the same way the chat page does.
      const { data: ended } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('status', 'active')
        .or(`listener_id.eq.${user.id},seeker_id.eq.${user.id}`)
        .select('id')
      await Promise.all(
        (ended ?? []).map((session: { id: string }) =>
          syncSessionRoleStates(supabase, session.id, 'end')
        )
      )

      // 2. Then take ourselves out of the pool. After step 1 on purpose: the
      //    'end' call restores a listener to 'available'.
      await supabase.from('profiles').update({ role_state: 'offline' }).eq('id', user.id)

      // 3. Stop this device getting this account's pushes. The browser keeps
      //    its local subscription, so whoever signs in next on this device
      //    gets their own row back automatically (ensurePushSubscriptionSaved
      //    on the dashboard) without having to re-enable anything.
      const endpoint = await getCurrentPushEndpoint()
      if (endpoint) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('subscription->>endpoint', endpoint)
      }
    }
  } catch (error) {
    console.error('Error cleaning up before sign-out:', error)
  }

  await supabase.auth.signOut().catch(() => {})
}
