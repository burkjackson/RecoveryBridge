-- Record the Terms of Service / Privacy Policy version a user consented to at signup.
-- Consent is captured atomically in auth user metadata at signup and mirrored here
-- (preserving the original signup timestamp) when onboarding completes.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consent_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;
