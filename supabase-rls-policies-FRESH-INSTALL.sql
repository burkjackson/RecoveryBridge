-- =====================================================
-- RecoveryBridge RLS Policies - FRESH INSTALL
-- =====================================================
-- This script drops all existing policies first,
-- then creates them fresh to avoid conflicts
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =====================================================

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view available listeners" ON profiles;
DROP POLICY IF EXISTS "Users can view session participant profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Drop sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can update all sessions" ON sessions;

-- Drop messages policies
DROP POLICY IF EXISTS "Users can view session messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;

-- Drop reports policies
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;

-- Drop user_blocks policies
DROP POLICY IF EXISTS "Users can view own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Admins can view all blocks" ON user_blocks;
DROP POLICY IF EXISTS "Admins can create blocks" ON user_blocks;
DROP POLICY IF EXISTS "Admins can update blocks" ON user_blocks;
DROP POLICY IF EXISTS "Admins can delete blocks" ON user_blocks;

-- Drop push_subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;

-- Drop admin_logs policies (if table exists)
DROP POLICY IF EXISTS "Admins can view admin logs" ON admin_logs;
DROP POLICY IF EXISTS "Admins can create admin logs" ON admin_logs;

-- =====================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY; -- Uncomment if you have this table

-- =====================================================
-- STEP 3: CREATE FRESH POLICIES
-- =====================================================

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can view available listeners"
ON profiles FOR SELECT
USING (role_state = 'available');

CREATE POLICY "Users can view session participant profiles"
ON profiles FOR SELECT
USING (
  id IN (
    SELECT listener_id FROM sessions WHERE seeker_id = auth.uid() AND status = 'active'
    UNION
    SELECT seeker_id FROM sessions WHERE listener_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- =====================================================
-- SESSIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own sessions"
ON sessions FOR SELECT
USING (
  auth.uid() = listener_id OR auth.uid() = seeker_id
);

CREATE POLICY "Users can create sessions"
ON sessions FOR INSERT
WITH CHECK (
  auth.uid() = listener_id OR auth.uid() = seeker_id
);

CREATE POLICY "Users can update own sessions"
ON sessions FOR UPDATE
USING (
  auth.uid() = listener_id OR auth.uid() = seeker_id
);

CREATE POLICY "Admins can view all sessions"
ON sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update all sessions"
ON sessions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view session messages"
ON messages FOR SELECT
USING (
  session_id IN (
    SELECT id FROM sessions
    WHERE listener_id = auth.uid() OR seeker_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  session_id IN (
    SELECT id FROM sessions
    WHERE (listener_id = auth.uid() OR seeker_id = auth.uid())
    AND status = 'active'
  )
);

CREATE POLICY "Admins can view all messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- =====================================================
-- REPORTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
ON reports FOR INSERT
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view all reports"
ON reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update reports"
ON reports FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- =====================================================
-- USER_BLOCKS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own blocks"
ON user_blocks FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all blocks"
ON user_blocks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can create blocks"
ON user_blocks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update blocks"
ON user_blocks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can delete blocks"
ON user_blocks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- =====================================================
-- PUSH_SUBSCRIPTIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own subscriptions"
ON push_subscriptions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
ON push_subscriptions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
ON push_subscriptions FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- ADMIN_LOGS TABLE POLICIES (Uncomment if you have this table)
-- =====================================================

-- CREATE POLICY "Admins can view admin logs"
-- ON admin_logs FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.is_admin = true
--   )
-- );

-- CREATE POLICY "Admins can create admin logs"
-- ON admin_logs FOR INSERT
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.is_admin = true
--   )
-- );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'sessions', 'messages', 'reports', 'user_blocks', 'push_subscriptions')
ORDER BY tablename;

-- Count policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =====================================================
-- DONE!
-- =====================================================
-- Your RLS policies are now configured.
-- Next steps:
-- 1. Make yourself an admin:
--    UPDATE profiles SET is_admin = true WHERE id = 'your-user-id';
-- 2. Test the admin panel at /admin
-- 3. Test with non-admin account
-- =====================================================
