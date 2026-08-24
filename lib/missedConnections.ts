/**
 * Which stale seekers should actually receive the "we couldn't connect you"
 * follow-up.
 *
 * A seeker left in `role_state = 'requesting'` is *evidence* that nobody
 * connected to them, not proof. A dropped cross-user write once left people in
 * that state after a real conversation, and they were sent a warm apology for a
 * conversation they had just had. Anyone with a session in the lookback window
 * is excluded here so that can't happen again, whatever future bug leaves
 * someone stuck in 'requesting'.
 *
 * Erring toward silence is deliberate: a follow-up that isn't sent is a small
 * loss, a wrongly apologetic one is not.
 */
export function seekersNeedingFollowUp<T extends { id: string }>(
  staleSeekers: T[],
  recentSessions: { seeker_id: string | null }[]
): T[] {
  const wasConnected = new Set(
    recentSessions.map((row) => row.seeker_id).filter((id): id is string => id != null)
  )
  return staleSeekers.filter((seeker) => !wasConnected.has(seeker.id))
}
