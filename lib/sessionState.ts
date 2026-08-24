import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { errorMessage } from '@/lib/errors'

/** Gap between the two attempts. Long enough to outlast a momentary blip. */
const RETRY_DELAY_MS = 400

function reportFailure(sessionId: string, phase: string, detail: string, cause?: unknown) {
  const message = `Session role-state sync failed (${phase}): ${detail}`
  console.error(message, cause ?? '')
  Sentry.captureException(cause instanceof Error ? cause : new Error(message), {
    tags: { area: 'session-state', phase },
    extra: { sessionId, detail },
  })
}

/**
 * Ask the server to move BOTH participants' role_state for a session.
 *
 * A client can only update its own profile row under RLS, so the counterpart's
 * half of these transitions has to happen server-side (see
 * app/api/sessions/state/route.ts for the bug this fixes).
 *
 * Non-blocking by design: a failure here must never stop someone navigating
 * into or out of a chat. But it must not be *silent* either. When this call is
 * lost, the listener stays 'offline' once the chat ends, and support
 * notifications target `role_state = 'available' OR always_available` — so they
 * quietly drop out of the pool until they next open the dashboard and mark
 * themselves available again. Nothing repairs it in the meantime.
 *
 * Hence: one retry for transient failures, and anything still failing is
 * reported rather than swallowed. Callers that want to know get a boolean.
 */
export async function syncSessionRoleStates(
  supabase: SupabaseClient,
  sessionId: string,
  phase: 'start' | 'end'
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    // Signed out is a legitimate state, not a failure worth reporting.
    if (!session?.access_token) return false

    let lastDetail = 'no attempt completed'

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch('/api/sessions/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId, phase }),
        })

        if (res.ok) return true

        lastDetail = `HTTP ${res.status}`
        // A 4xx is a decision (bad token, not a participant, session still
        // active), not a blip — retrying it changes nothing.
        if (res.status < 500) break
      } catch (networkError) {
        lastDetail = errorMessage(networkError, 'network error')
      }

      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    reportFailure(sessionId, phase, lastDetail)
    return false
  } catch (error) {
    reportFailure(sessionId, phase, 'unexpected error', error)
    return false
  }
}
