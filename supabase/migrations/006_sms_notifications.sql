-- Add SMS notification support fields to profiles
-- Phone numbers stored in E.164 format (+15551234567)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT FALSE;

-- Validate E.164 format for phone numbers
ALTER TABLE profiles
  ADD CONSTRAINT chk_phone_e164 CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$');

-- Ensure SMS can only be enabled if phone number exists
ALTER TABLE profiles
  ADD CONSTRAINT chk_sms_requires_phone CHECK (sms_notifications_enabled = FALSE OR phone_number IS NOT NULL);
