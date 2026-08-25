/**
 * Who should receive the "we couldn't connect you" follow-up.
 *
 * The rule that matters here is what counts as *connected*. It used to be
 * "a session row exists", and that turned out to be badly wrong: a listener can
 * tap the notification, land in the chat and never type a word. Measured on
 * 25 Aug 2026, that was 96 of 202 sessions — nearly half — and every one of
 * those people was treated as helped. They got no follow-up, and they never
 * appeared in the admin "Couldn't Connect" list, so the silence was invisible
 * from both ends.
 *
 * So connected now means *the listener actually replied*. A session where the
 * seeker typed into silence is a missed connection, not a conversation.
 *
 * The original guard still holds in the other direction: anyone who had a real
 * two-way conversation is excluded, because apologising to someone who just
 * finished talking to a listener is its own kind of harm. That was a live bug
 * once (a dropped cross-user write left people stuck in 'requesting'), and this
 * is what makes it structurally impossible rather than merely unlikely.
 */

/** One session in the lookback window, with whether the listener said anything. */
export interface SessionOutcome {
  seeker_id: string | null
  /** True only if the listener sent at least one message. */
  listenerReplied: boolean
}

/**
 * Filter `candidates` down to those nobody actually spoke to.
 *
 * A candidate is excluded only by a session where the listener replied. Sessions
 * that ended in silence deliberately do NOT count as being connected.
 */
export function seekersNeedingFollowUp<T extends { id: string }>(
  candidates: T[],
  recentSessions: SessionOutcome[]
): T[] {
  const genuinelyAnswered = new Set(
    recentSessions
      .filter((row) => row.listenerReplied)
      .map((row) => row.seeker_id)
      .filter((id): id is string => id != null)
  )
  return candidates.filter((seeker) => !genuinelyAnswered.has(seeker.id))
}

/** A session row joined with who said what in it. */
export interface SessionMessageCounts {
  id: string
  seeker_id: string | null
  listener_id: string | null
}

/**
 * Work out, for each session, whether the seeker spoke and whether the listener
 * replied — from one flat list of (session_id, sender_id) message rows.
 *
 * Kept separate from the query so the counting logic is testable without a
 * database, and so the route makes two round trips rather than one per session.
 */
export function summariseSessions(
  sessions: SessionMessageCounts[],
  messages: { session_id: string; sender_id: string | null }[]
): (SessionMessageCounts & { seekerWrote: boolean; listenerReplied: boolean })[] {
  const bySession = new Map<string, Set<string>>()
  for (const m of messages) {
    if (!m.sender_id) continue
    const senders = bySession.get(m.session_id)
    if (senders) senders.add(m.sender_id)
    else bySession.set(m.session_id, new Set([m.sender_id]))
  }

  return sessions.map((s) => {
    const senders = bySession.get(s.id)
    return {
      ...s,
      seekerWrote: !!(s.seeker_id && senders?.has(s.seeker_id)),
      listenerReplied: !!(s.listener_id && senders?.has(s.listener_id)),
    }
  })
}

/**
 * Sessions where the seeker reached out and nobody answered.
 *
 * This is the second way into the follow-up, and the one that catches the case
 * the stale-'requesting' sweep structurally cannot: ending a session moves both
 * participants' role_state, so a seeker who was connected-then-ignored is left
 * 'offline', never 'requesting'. Without this they are invisible forever.
 *
 * A session where nobody typed at all is excluded — that is someone who opened
 * the app and left, not someone who reached out and was met with silence.
 */
export function unansweredSessions<
  T extends { seekerWrote: boolean; listenerReplied: boolean }
>(sessions: T[]): T[] {
  return sessions.filter((s) => s.seekerWrote && !s.listenerReplied)
}
