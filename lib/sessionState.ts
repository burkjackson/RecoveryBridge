import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ask the server to move BOTH participants' role_state for a session.
 *
 * A client can only update its own profile row under RLS, so the counterpart's
 * half of these transitions has to happen server-side (see
 * app/api/sessions/state/route.ts for the bug this fixes).
 *
 * Best-effort by design: a failure here must never block navigation into or
 * out of a chat, so it resolves quietly and logs.
 */
export async function syncSessionRoleStates(
  supabase: SupabaseClient,
  sessionId: string,
  phase: 'start' | 'end'
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    await fetch('/api/sessions/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sessionId, phase }),
    })
  } catch (error) {
    console.error('Could not sync session role states:', error)
  }
}
