-- Per-message-type switches, so nothing goes out that wasn't deliberately
-- turned on.
--
-- Migration 035 built the delivery machinery. This is the throttle. The
-- concern it answers is not "is this consented to" (035 covers that, per
-- recipient) but "do WE want this going out at all yet" — a platform-level
-- decision that belongs to an admin and shouldn't need a deploy to change.
--
-- The three AUTOMATED kinds start disabled: they fire on a cron or an event
-- with nobody watching, which is exactly the thing worth holding back.
--
-- `broadcast` starts enabled, because it is not automated — it cannot send
-- unless an admin composes a message and presses send. Gating a deliberate
-- human action behind a second switch is friction without safety. Its
-- switch exists so it can be shut off, not so it has to be opened.
--
-- Fail closed: a kind with no row here is treated as disabled. Adding a new
-- notification kind therefore ships inert, and someone has to choose to turn
-- it on — which is the right default for anything that buzzes a phone.

CREATE TABLE IF NOT EXISTS notification_kind_settings (
  kind       TEXT PRIMARY KEY,
  enabled    BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the four kinds 035 introduced. ON CONFLICT DO NOTHING so re-running
-- this never re-disables something an admin has since switched on.
INSERT INTO notification_kind_settings (kind, enabled) VALUES
  ('thank_you',      false),
  ('training_nudge', false),
  ('reengagement',   false),
  ('broadcast',      true)
ON CONFLICT (kind) DO NOTHING;

ALTER TABLE notification_kind_settings ENABLE ROW LEVEL SECURITY;

-- Admin-readable; every write goes through /api/admin/actions with the service
-- role, so there is deliberately no INSERT/UPDATE policy for clients.
CREATE POLICY admins_read_notification_kind_settings
  ON notification_kind_settings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
