-- Allow multiple push devices per user.
--
-- The original push_subscriptions table enforced UNIQUE(user_id), so enabling
-- push on a second device silently replaced the first — e.g. enabling on a
-- desktop browser wiped the phone's subscription, and the phone kept showing
-- "Enabled" locally while the server had nothing for it. Drop that constraint
-- and instead dedupe per device endpoint, so one account can receive push on
-- its phone AND laptop at the same time.
--
-- Stale endpoints self-heal: the notification route already deletes any
-- subscription that the push service rejects with a 4xx.

ALTER TABLE push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint
  ON push_subscriptions (user_id, (subscription->>'endpoint'));
