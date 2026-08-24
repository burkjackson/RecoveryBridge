-- Expand push beyond "someone needs support".
--
-- Until now a push subscription had exactly one meaning: a seeker is waiting.
-- This migration lets the platform send other kinds of message on the same
-- subscription — a thank-you note you received, a nudge to finish training, an
-- admin announcement — without eroding the one that matters.
--
-- Three ideas, in order of importance:
--
--   1. CATEGORIES WITH SEPARATE CONSENT. The toggle in NotificationSettings
--      promised "notifications when someone needs support". Quietly reusing it
--      for announcements is a bait-and-switch, and the rational response is to
--      turn push off — which on this app means the *support* notification stops
--      arriving too. So each new category gets its own preference and support
--      requests keep theirs untouched.
--   2. A QUEUE, NOT A SEND LOOP. web-push is one HTTP request per subscription.
--      A broadcast to every user would blow the serverless time limit halfway
--      through and leave no record of who actually got it. Rows go in here and
--      the drain cron works them in bounded batches.
--   3. DEFERRAL INSTEAD OF SUPPRESSION. None of these are urgent, so a message
--      landing in someone's quiet hours waits rather than being dropped
--      (see not_before below).

-- ---------------------------------------------------------------------------
-- Preferences
-- ---------------------------------------------------------------------------

-- Announcements: things about YOUR activity or the service itself — a
-- thank-you note someone left you, an unfinished training nudge, an admin
-- announcement. Defaults ON: these are service messages, and a listener who
-- received a thank-you note should hear about it.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS announcement_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

-- Check-ins: "it's been a while, listeners are online". This is the closest
-- thing here to marketing, so it is the one category that defaults OFF and has
-- to be asked for. Existing users are not opted in by this migration.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reengagement_notifications_enabled BOOLEAN NOT NULL DEFAULT false;

-- Per-section training acknowledgements, e.g. {"presence": true, "crisis": true}.
-- Two jobs: progress survives closing the tab (before this, all 8 acks were
-- lost on reload), and the nudge cron can tell "started and stalled" from
-- "never opened it" — only the former is worth a push.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS listener_training_progress JSONB NOT NULL DEFAULT '{}'::jsonb;

-- When that progress last moved. The nudge cron needs it to tell "stalled a
-- week ago" from "working through the page right now" — without it, someone
-- who acknowledged three sections a minute ago could be pushed a nudge while
-- still looking at the screen. Not profiles.updated_at, which any unrelated
-- profile edit bumps.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS listener_training_progress_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Broadcasts — one row per admin announcement, for audit and for the queue to
-- hang off. Kept separate from user_notices so "what did we send, to whom, and
-- how many landed" is one row rather than a scan of thousands.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS broadcasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  url             TEXT NOT NULL DEFAULT '/dashboard',
  audience        TEXT NOT NULL,              -- see BROADCAST_AUDIENCES in lib/constants.ts
  recipient_count INTEGER NOT NULL DEFAULT 0, -- how many were queued, not how many landed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts (created_at DESC);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Admin-readable only; every write goes through /api/admin/actions with the
-- service role, so there is deliberately no INSERT policy.
CREATE POLICY admins_read_broadcasts
  ON broadcasts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ---------------------------------------------------------------------------
-- The queue itself
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Which preference governs delivery: 'announcement' or 'reengagement'.
  -- Support requests are NOT queued — they stay on the direct path in
  -- /api/notifications/send, where latency is the whole point.
  category     TEXT NOT NULL,

  -- What produced this row: 'thank_you' | 'training_nudge' | 'reengagement' | 'broadcast'.
  -- Reporting only; delivery rules key off category.
  kind         TEXT NOT NULL,

  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  url          TEXT NOT NULL DEFAULT '/dashboard',
  tag          TEXT,

  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,

  -- Stops the same thing being queued twice when a cron overlaps itself or a
  -- client retries: the feedback row's id, the broadcast's id, "YYYY-MM" for a
  -- monthly check-in. See the unique index below.
  dedupe_key   TEXT,

  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | skipped | failed
  skip_reason  TEXT,                             -- why a 'skipped' row was not sent
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,

  -- Earliest this may be sent. The drain cron pushes it forward rather than
  -- dropping the row when the recipient is inside their quiet hours.
  not_before   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- After this, the message is stale enough that sending it is worse than not.
  -- A check-in saying "listeners are online" must not arrive two days late.
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '3 days',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at      TIMESTAMPTZ
);

-- The drain cron's working query: oldest pending rows that are due.
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
  ON notification_queue (not_before)
  WHERE status = 'pending';

-- Pruning old terminal rows, and the admin per-broadcast delivery count.
CREATE INDEX IF NOT EXISTS idx_notification_queue_created
  ON notification_queue (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_queue_broadcast
  ON notification_queue (broadcast_id)
  WHERE broadcast_id IS NOT NULL;

-- At most one live row per (user, kind, dedupe_key). Terminal rows are excluded
-- so a monthly key can be reused next month and a re-sent broadcast is possible
-- after the first attempt resolves.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_dedupe
  ON notification_queue (user_id, kind, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status = 'pending';

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Admin-readable for the delivery report. Recipients have no reason to read
-- their own queue rows — the message itself reaches them as a push and, for
-- broadcasts, as a user_notices row they already own.
CREATE POLICY admins_read_notification_queue
  ON notification_queue FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- All writes come from server routes using the service role, which bypasses
-- RLS: no INSERT/UPDATE/DELETE policy on purpose.
