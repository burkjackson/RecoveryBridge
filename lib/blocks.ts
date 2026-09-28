import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ActiveBlock {
  id: string
  reason: string | null
}

/**
 * The user's current moderation block, or null if they aren't restricted.
 *
 * Two things every caller needs and several used to get wrong: a lifted block
 * (`is_active = false`) must not count, and a *temporary* block must stop
 * counting once `expires_at` passes. The cleanup cron flips is_active on
 * expiry, but this check doesn't wait for the next sweep.
 *
 * A failed read returns null (not blocked) on purpose: the real wall is in
 * the database (validate_session_participants and protect_blocked_role_state,
 * migration 041), and failing closed would stop someone in crisis from asking
 * for help over a network blip. But it is reported, never silent. From 22 to
 * 28 Sep 2026 this read failed for every user (migration 059, see Known
 * Issue #65) and nothing noticed because the error was dropped here.
 */
export async function getActiveBlock(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveBlock | null> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('user_blocks')
    .select('id, reason')
    .eq('user_id', userId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('blocked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Block check failed:', error)
    Sentry.captureException(new Error(`Block check failed: ${error.message}`), {
      tags: { area: 'blocks' },
      extra: { userId, code: error.code },
    })
    return null
  }

  return data ?? null
}
