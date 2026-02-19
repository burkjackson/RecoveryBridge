-- Add quiet hours (Do Not Disturb) fields to profiles
-- Listeners can set time windows when they don't want to receive notifications

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT '23:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_timezone TEXT DEFAULT 'America/New_York';
