import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The set of user ids muted-or-muting the signed-in user — everyone this
 * user should never be shown as a match, regardless of who created the mute.
 * Both directions collapse into one set because enforcement is symmetric
 * (see validate_session_participants(), migration 050): it doesn't matter
 * who muted whom, neither side can reach the other, so neither side's list
 * should show the other either.
 *
 * Reads through the get_my_mute_counterparts() RPC (migration 053), not the
 * table: a user may only SELECT mutes they created, so the reported side of
 * an auto-mute can't learn who reported them. The RPC returns bare ids with
 * no direction or source.
 *
 * Client-side only (uses auth.uid()). Server routes running as the service
 * role must use getMutedUserIdsForUser() instead.
 *
 * This is UX, not the security boundary — the DB trigger still rejects a
 * session between a muted pair even if a stale list slips through.
 */
export async function getMutedUserIds(
  supabase: SupabaseClient,
  // Kept for call-site compatibility; the RPC always uses auth.uid().
  _userId?: string
): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_my_mute_counterparts')
  if (error) {
    console.error('[mutes] get_my_mute_counterparts failed', error)
    return new Set()
  }
  return new Set(((data ?? []) as string[]).filter(Boolean))
}

/**
 * Service-role variant: the same two-way set for an arbitrary user. Only
 * call this with a service-role client in a server route, where RLS doesn't
 * apply and auth.uid() is null.
 */
export async function getMutedUserIdsForUser(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('user_mutes')
    .select('muter_id, muted_id')
    .or(`muter_id.eq.${userId},muted_id.eq.${userId}`)

  if (error) throw error

  const ids = new Set<string>()
  for (const row of data ?? []) {
    ids.add(row.muter_id === userId ? row.muted_id : row.muter_id)
  }
  return ids
}
