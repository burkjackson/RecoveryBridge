-- Migration: Add heartbeat tracking for presence detection
-- Run this in your Supabase SQL Editor

-- Add last_heartbeat_at column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Create index for efficient heartbeat queries
CREATE INDEX IF NOT EXISTS idx_profiles_heartbeat
ON profiles(last_heartbeat_at)
WHERE role_state = 'available';

-- Create index for active listener queries (combines role_state and heartbeat)
CREATE INDEX IF NOT EXISTS idx_profiles_active_listeners
ON profiles(role_state, last_heartbeat_at)
WHERE role_state = 'available';

-- Optional: Add a function to auto-cleanup stale "available" users
-- This runs periodically to set users offline if they haven't sent heartbeat in 5 minutes
CREATE OR REPLACE FUNCTION cleanup_stale_availability()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET role_state = 'offline'
  WHERE role_state = 'available'
    AND last_heartbeat_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule the cleanup function to run every minute
-- Uncomment the lines below if you want automatic cleanup
-- Note: Requires pg_cron extension
-- SELECT cron.schedule('cleanup-stale-availability', '* * * * *', 'SELECT cleanup_stale_availability()');
