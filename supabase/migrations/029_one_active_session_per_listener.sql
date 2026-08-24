-- Enforce one active session per LISTENER, mirroring 025's seeker-side index.
--
-- 025 stopped two listeners from answering the same seeker, but left the other
-- direction open: two seekers direct-connecting to the same listener both
-- succeeded. The listener's dashboard poll resolves that by navigating to the
-- newest session (`order created_at desc limit 1`), so the other seeker sat
-- alone in a chat nobody was reading until cleanup closed it as "empty" ten
-- minutes later.
--
-- Every connect path already handles the resulting unique violation (23505)
-- with a "someone else just connected" message and a list refresh.

-- 1. Close duplicates that already exist, keeping the newest per listener.
UPDATE sessions
SET status = 'ended', ended_at = NOW()
WHERE status = 'active'
  AND id NOT IN (
    SELECT DISTINCT ON (listener_id) id
    FROM sessions
    WHERE status = 'active'
    ORDER BY listener_id, created_at DESC
  );

-- 2. Enforce it going forward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_listener
  ON sessions (listener_id) WHERE status = 'active';
