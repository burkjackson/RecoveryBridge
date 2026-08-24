-- Make temporary blocks actually temporary.
--
-- The admin "block user" action stores expires_at (7 days out) for a temporary
-- block but leaves is_active = true, and every read — the chat guard, the
-- connect flows, the admin list — filters on is_active alone. Nothing ever
-- flipped it, so a temporary block was indistinguishable from a permanent one.
--
-- Two halves: retire the ones already past their date, and an index so the
-- cleanup cron's sweep (see app/api/cleanup-sessions/route.ts) stays cheap.

UPDATE user_blocks
SET is_active = false
WHERE is_active
  AND expires_at IS NOT NULL
  AND expires_at <= NOW();

CREATE INDEX IF NOT EXISTS idx_user_blocks_active_expiry
  ON user_blocks (expires_at) WHERE is_active;
