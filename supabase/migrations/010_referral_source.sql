-- Add referral source to profiles
-- Captures where new users heard about RecoveryBridge during onboarding

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD CONSTRAINT chk_referral_source CHECK (
    referral_source IS NULL OR referral_source IN (
      'facebook',
      'instagram',
      'threads',
      'tiktok',
      'website_blog',
      'search_engine',
      'friend_family',
      'other'
    )
  );
