-- Let people see the profiles of those they already know.
--
-- The SELECT policies on `profiles` exposed only people who are *currently*
-- available, *currently* requesting, or in an **active** session with you. Two
-- features quietly broke against that:
--
--   * /history rendered "Anonymous" for every past conversation, because the
--     embedded participant profile came back null the moment the session ended.
--     (Same for the sender of a thank-you note on the profile page, and the
--     names on the dashboard's recent-sessions list.)
--   * The Favourites list dropped anyone who wasn't online right then, so its
--     "Offline" grey-dot state was unreachable code — you could only see a
--     favourite at the moment you least needed the shortcut.
--
-- The privacy question was whether to widen this at all, on a platform whose
-- value depends on people feeling unobserved. Two things settle it:
--
--   1. Neither policy reveals anything new. You saw this person's display name,
--     avatar and bio while you were talking to them, and their availability
--     state is already visible platform-wide to every signed-in user. The only
--     thing currently being withheld is your own memory of a conversation you
--     took part in.
--   2. Both are scoped to a relationship you are already part of — a session
--     you sat in, or a favourite you deliberately saved — not to the directory
--     at large. Nobody becomes visible to strangers.
--
-- What this deliberately does NOT do is expose people you have never met.

BEGIN;

-- 1. Past participants, not just current ones. Replaces the active-only policy
--    rather than adding a second overlapping one.
DROP POLICY IF EXISTS "Users can view session participant profiles" ON profiles;

CREATE POLICY "Users can view session participant profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT listener_id FROM sessions WHERE seeker_id = auth.uid()
    UNION
    SELECT seeker_id   FROM sessions WHERE listener_id = auth.uid()
  )
);

-- 2. People you saved. You can only favourite someone you have already talked
--    to, so this adds no one the policy above wouldn't already cover — but it
--    stands on its own so the Favourites list doesn't depend on session
--    history surviving.
DROP POLICY IF EXISTS "Users can view favourited profiles" ON profiles;

CREATE POLICY "Users can view favourited profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  id IN (SELECT favorite_user_id FROM user_favorites WHERE user_id = auth.uid())
);

-- These subqueries now run on every profile read, and sessions only had
-- partial indexes covering active rows.
CREATE INDEX IF NOT EXISTS idx_sessions_listener ON sessions (listener_id);
CREATE INDEX IF NOT EXISTS idx_sessions_seeker   ON sessions (seeker_id);

COMMIT;
