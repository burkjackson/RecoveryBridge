-- Let listeners see the people who are asking for support.
--
-- THIS IS THE ONE TO RUN FIRST. Without it the app's primary flow is broken
-- for everyone who isn't an admin.
--
-- The SELECT policies on `profiles` exposed exactly four things: your own row,
-- listeners at role_state = 'available', people you share an ACTIVE session
-- with, and — for admins — everything. Nothing exposed a seeker at
-- role_state = 'requesting'. So for a normal listener:
--
--   * People Seeking returned zero rows no matter who was waiting;
--   * tapping a support notification hit /connect, which reads the seeker's
--     profile, got null, and said "This person is no longer waiting for
--     support — they may have stepped away."
--
-- The push notifications themselves went out fine (that route uses the service
-- key), so listeners were being buzzed and then turned away at the door. It
-- worked for the admin account, which can read every profile — which is why it
-- went unnoticed.
--
-- Confirmed 24 Aug 2026 by impersonating a non-admin user in a rolled-back
-- transaction: their own row was visible, a requesting seeker's was not.

BEGIN;

-- 1. The missing half. Mirrors the existing 'available' policy: if you have
--    put yourself forward — as a listener or as someone seeking support — the
--    people who could connect with you can see your profile.
DROP POLICY IF EXISTS "Users can view seekers requesting support" ON profiles;

CREATE POLICY "Users can view seekers requesting support"
ON profiles FOR SELECT
TO authenticated
USING (role_state = 'requesting');

-- 2. While we're here: the matching 'available' policy has no role restriction,
--    so it also answers to `anon`. The anon key ships in the client bundle, so
--    anyone at all could enumerate available listeners' names, bios, taglines
--    and avatars without holding an account. Nothing in the app reads profiles
--    while logged out — every caller is behind auth or is a server route using
--    the service key — so scope it to authenticated, same as the new policy.
DROP POLICY IF EXISTS "Users can view available listeners" ON profiles;

CREATE POLICY "Users can view available listeners"
ON profiles FOR SELECT
TO authenticated
USING (role_state = 'available');

COMMIT;
