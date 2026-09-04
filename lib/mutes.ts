import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The set of user ids muted-or-muting the given user — everyone this user
 * should never be shown as a match, regardless of who created the mute.
 * Both directions collapse into one set because enforcement is symmetric
 * (see validate_session_participants(), migration 050): it doesn't matter
 * who muted whom, neither side can reach the other, so neither side's list
 * should show the other either.
 *
 * This is UX, not the security boundary — the DB trigger still rejects a
 * session between a muted pair even if a stale list slips through. Filter
 * with this wherever a list of potential seekers/listeners gets built so it
 * doesn't happen in the first place.
 */
export async function getMutedUserIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_mutes')
    .select('muter_id, muted_id')
    .or(`muter_id.eq.${userId},muted_id.eq.${userId}`)

  const ids = new Set<string>()
  for (const row of data ?? []) {
    ids.add(row.muter_id === userId ? row.muted_id : row.muter_id)
  }
  return ids
}
