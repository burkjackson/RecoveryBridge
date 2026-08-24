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
 */
export async function getActiveBlock(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveBlock | null> {
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('user_blocks')
    .select('id, reason')
    .eq('user_id', userId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('blocked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}
