-- Record that a user attested to being 18+ at signup.
-- Captured in auth user metadata at signup and mirrored here when onboarding
-- completes, alongside the consent fields, for a complete audit trail.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age_confirmed BOOLEAN;
