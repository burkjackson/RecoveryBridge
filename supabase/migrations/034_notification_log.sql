-- Record who got told that someone needed support, so "does notifying an
-- absent listener actually work?" can be answered with data instead of
-- intuition.
--
-- The question that prompted this: 14 profiles sit at role_state='available'
-- with heartbeats hours old. They are hidden from every list (which filters on
-- a 1-hour heartbeat) but still receive support pushes. Resetting them would
-- cut push reach by two thirds — and until 24 Aug 2026 there was no way to know
-- whether that reach converts, because a listener who tapped the push was told
-- "this person is no longer waiting for support" (see migration 032). Every
-- historical non-response is contaminated by that bug.
--
-- So: log sends from now on, let it run, and decide from the numbers. The
-- analysis query lives in supabase/queries/push_conversion.sql.
--
-- Deliberately minimal. This records that a notification went out, not what
-- anyone said — no message content, no notification body. Rows are pruned
-- after 60 days by the cleanup cron; the question this exists to answer needs
-- weeks of data, not history.

CREATE TABLE IF NOT EXISTS notification_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seeker_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  channel           TEXT NOT NULL,              -- 'push' | 'email'
  listener_state    TEXT,                       -- role_state at send time
  listener_stale    BOOLEAN,                    -- heartbeat older than the 1h online threshold
  is_renotification BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversion query joins listener -> sessions shortly after a send.
CREATE INDEX IF NOT EXISTS idx_notification_log_listener_created
  ON notification_log (listener_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_created
  ON notification_log (created_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Admins can read it; nobody else, and no client writes at all. The notify
-- route inserts with the service role, which bypasses RLS.
CREATE POLICY admins_read_notification_log
  ON notification_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
