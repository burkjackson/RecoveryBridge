-- Seeds the 'listener_checkin' notification kind (see lib/constants.ts
-- NOTIFICATION_KIND_INFO and app/api/cleanup-sessions/route.ts), sent to a
-- listener the moment resetStaleAvailability() auto-pauses them for two
-- weeks of silence.
--
-- Starts disabled, same reasoning as the other automatic kinds in 036: it
-- fires on a cron with nobody watching, so it ships off until an admin
-- chooses to turn it on. The code already fails closed for a kind with no
-- row here — this migration just makes the row's existence and intent
-- explicit in schema history, matching how 036 seeded its four kinds.
INSERT INTO notification_kind_settings (kind, enabled) VALUES
  ('listener_checkin', false)
ON CONFLICT (kind) DO NOTHING;
