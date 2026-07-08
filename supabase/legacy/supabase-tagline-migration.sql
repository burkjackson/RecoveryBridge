-- Migration: Add tagline field for Available Listeners display
-- Run this in your Supabase SQL Editor

-- Add tagline column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Add constraint to limit tagline length (60 characters max)
ALTER TABLE profiles
ADD CONSTRAINT tagline_length_check
CHECK (char_length(tagline) <= 60);

-- Comment for documentation
COMMENT ON COLUMN profiles.tagline IS 'Short message (max 60 chars) shown in Available Listeners section';
