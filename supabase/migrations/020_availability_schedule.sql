-- Add availability_schedule to profiles
-- Format: [{"day": 0-6, "start": "HH:MM", "end": "HH:MM"}]
-- day: 0=Sunday, 1=Monday, ..., 6=Saturday
-- start/end: 24-hour "HH:MM" strings
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS availability_schedule JSONB NOT NULL DEFAULT '[]'::jsonb;
