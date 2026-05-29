-- Record the user's affirmative opt-in consent to collection/processing of
-- consumer health data (WA My Health My Data Act and similar state laws).
-- Captured in auth user metadata at signup and mirrored here when onboarding
-- completes, alongside the other consent fields, for a complete audit trail.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS health_data_consent BOOLEAN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS health_data_consent_at TIMESTAMPTZ;
