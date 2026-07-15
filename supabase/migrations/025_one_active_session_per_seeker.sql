-- Enforce one active session per seeker at the database level.
--
-- All session-creation paths (/connect, Available Listeners, People Seeking,
-- dashboard favorites) used check-then-insert with no constraint behind them,
-- so two listeners answering the same request simultaneously could BOTH create
-- an active session. The seeker's dashboard polls then errored on the multiple
-- rows (silently), leaving them stuck on "Finding you a listener…" while two
-- listeners waited in separate empty chats.
--
-- With this index, the second insert fails with a unique violation (23505) and
-- the app's recovery paths handle it gracefully ("someone else just connected").

-- 1. Close any duplicate active sessions that already exist (keep the newest
--    per seeker), otherwise the unique index cannot be created.
UPDATE sessions
SET status = 'ended', ended_at = NOW()
WHERE status = 'active'
  AND id NOT IN (
    SELECT DISTINCT ON (seeker_id) id
    FROM sessions
    WHERE status = 'active'
    ORDER BY seeker_id, created_at DESC
  );

-- 2. Enforce uniqueness going forward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_seeker
  ON sessions (seeker_id) WHERE status = 'active';
