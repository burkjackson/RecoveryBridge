-- Add email notification opt-in to profiles
-- Users must explicitly opt in before receiving email notifications

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT FALSE;
