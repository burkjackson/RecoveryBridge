-- Drop the CHECK constraint on referral_source so users can type a
-- custom value when they select "Other" during onboarding.
-- The predefined values (facebook, instagram, etc.) still work as before.

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_referral_source;
