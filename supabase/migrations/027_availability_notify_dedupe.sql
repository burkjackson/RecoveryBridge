-- One "your support time is starting" push per window occurrence.
--
-- The problem: /api/scheduled-availability only matched windows that started
-- within the last ~20 minutes, but the GitHub Actions cron driving it does not
-- keep to its nominal 15-minute schedule. Measured over 30 consecutive runs on
-- 2026-08-24: gaps of min 14m / median 21m / max 35m, with 18 of 29 gaps longer
-- than the 20-minute match window. Whenever a gap straddled a window start, no
-- run ever saw it and the push silently never fired.
--
-- Widening the match window alone would fix the misses but create duplicates:
-- every run inside the wider window would push again. So the route now records
-- which window occurrence a user was last notified for, and skips them if it
-- matches. That makes a generous tolerance safe -- late is recoverable, and
-- nobody gets buzzed twice for the same window.
--
-- The value is "YYYY-MM-DD|day|HH:MM" in the user's own timezone (e.g.
-- "2026-08-24|1|19:00"), which identifies one occurrence without any
-- server-side timezone arithmetic.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_availability_notify_key TEXT;

COMMENT ON COLUMN profiles.last_availability_notify_key IS
  'Availability window occurrence this user was last pushed for: "YYYY-MM-DD|day|HH:MM" in their local timezone. Set by /api/scheduled-availability to avoid duplicate notifications.';
