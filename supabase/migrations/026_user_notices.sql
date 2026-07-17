-- In-app notices — a lightweight message store so the platform can reach a
-- *user* (not an email address). Two things drove this:
--
--   1. Auto follow-up: when a seeker requests support and never connects (their
--      'requesting' state goes stale and cleanup resets it), we record a
--      'reconnect' notice and send a warm push so no one slips away in silence.
--   2. Manual outreach: an admin can send a personal note to a specific user.
--
-- Delivery is two-pronged: a web push (reaches the device even if the app is
-- closed, and does NOT depend on a correct email) plus this in-app record,
-- which the dashboard surfaces on the user's next visit for anyone who doesn't
-- have push enabled. The admin "Couldn't Connect" view reads the 'reconnect'
-- rows here.

CREATE TABLE IF NOT EXISTS user_notices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,                    -- 'reconnect' | 'outreach'
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- admin who sent; NULL = system
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  read_at    TIMESTAMP WITH TIME ZONE
);

-- Recipient inbox lookup (unread banner) and admin "couldn't connect" feed.
CREATE INDEX IF NOT EXISTS idx_user_notices_user_created
  ON user_notices (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notices_kind_created
  ON user_notices (kind, created_at DESC);

ALTER TABLE user_notices ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own notices.
CREATE POLICY "Users can read their own notices"
  ON user_notices FOR SELECT
  USING (auth.uid() = user_id);

-- Recipients can mark their own notices read (dismiss the banner). They can
-- only touch their own rows; harmless if they edit their own copy's text.
CREATE POLICY "Users can update their own notices"
  ON user_notices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read every notice (powers the "Couldn't Connect" dashboard view).
CREATE POLICY "Admins can read all notices"
  ON user_notices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Inserts happen only from server routes using the service role key (the cron
-- follow-up and the admin outreach action), which bypasses RLS — so there is
-- deliberately no INSERT policy for regular clients.

-- Live-update the admin view and the recipient's banner.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_notices;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
