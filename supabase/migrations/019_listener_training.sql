-- Add listener training completion timestamp to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS listener_training_completed_at timestamptz;
