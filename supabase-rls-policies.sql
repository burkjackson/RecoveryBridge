-- =====================================================
-- RecoveryBridge Row Level Security (RLS) Policies
-- =====================================================
-- Run these SQL commands in your Supabase SQL Editor
-- Order matters - run from top to bottom
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Policy: Users can view profiles of available listeners (for matchmaking)
CREATE POLICY "Users can view available listeners"
ON profiles FOR SELECT
USING (role_state = 'available');

-- Policy: Users can view profiles they're in active sessions with
CREATE POLICY "Users can view session participant profiles"
ON profiles FOR SELECT
USING (
  id IN (
    SELECT listener_id FROM sessions WHERE seeker_id = auth.uid() AND status = 'active'
    UNION
    SELECT seeker_id FROM sessions WHERE listener_id = auth.uid() AND status = 'active'
  )
);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can update any profile
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
-- 2. SESSIONS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON sessions FOR SELECT
USING (
  auth.uid() = listener_id OR auth.uid() = seeker_id
);

-- Policy: Users can create sessions where they're a participant
CREATE POLICY "Users can create sessions"
ON sessions FOR INSERT
WITH CHECK (
  auth.uid() = listener_id OR auth.uid() = seeker_id
);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON sessions FOR UPDATE
USING (
  auth.uid() = listener_id OR auth.uid() = seeker_id
);

-- Policy: Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can update all sessions
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
-- 3. MESSAGES TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in their own sessions
CREATE POLICY "Users can view session messages"
ON messages FOR SELECT
USING (
  session_id IN (
    SELECT id FROM sessions
    WHERE listener_id = auth.uid() OR seeker_id = auth.uid()
  )
);

-- Policy: Users can insert messages in their own sessions
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

-- Policy: Admins can view all messages (for moderation)
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
-- 4. REPORTS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports (that they submitted)
CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
USING (reporter_id = auth.uid());

-- Policy: Users can create reports
CREATE POLICY "Users can create reports"
ON reports FOR INSERT
WITH CHECK (reporter_id = auth.uid());

-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can update reports (change status, add notes)
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
-- 5. USER_BLOCKS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view if they are blocked
CREATE POLICY "Users can view own blocks"
ON user_blocks FOR SELECT
USING (user_id = auth.uid());

-- Policy: Admins can view all blocks
CREATE POLICY "Admins can view all blocks"
ON user_blocks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can create blocks
CREATE POLICY "Admins can create blocks"
ON user_blocks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can update blocks
CREATE POLICY "Admins can update blocks"
ON user_blocks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can delete blocks
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
-- 6. PUSH_SUBSCRIPTIONS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON push_subscriptions FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
ON push_subscriptions FOR UPDATE
USING (user_id = auth.uid());

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
ON push_subscriptions FOR DELETE
USING (user_id = auth.uid());

-- =====================================================
-- 7. ADMIN_LOGS TABLE (if it exists)
-- =====================================================

-- Enable RLS
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view admin logs
CREATE POLICY "Admins can view admin logs"
ON admin_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy: Only admins can insert admin logs
CREATE POLICY "Admins can create admin logs"
ON admin_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify your RLS policies are working

-- Check which tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- View all policies on a specific table (example: profiles)
SELECT *
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- =====================================================
-- TESTING QUERIES
-- =====================================================
-- Test these as different users to verify policies work

-- 1. Test as regular user (should only see own profile)
-- SELECT * FROM profiles;

-- 2. Test as admin (should see all profiles)
-- First, make yourself admin:
-- UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';
-- Then: SELECT * FROM profiles;

-- 3. Test session access (should only see own sessions)
-- SELECT * FROM sessions;

-- 4. Test reports access (regular users see only their reports, admins see all)
-- SELECT * FROM reports;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. After running these policies, test thoroughly with different user accounts
-- 2. Test both admin and non-admin accounts
-- 3. Try to access data you shouldn't be able to access
-- 4. Check the Supabase logs for any policy violations
-- 5. If a policy isn't working, drop it and recreate:
--    DROP POLICY "policy_name" ON table_name;
--    Then create the policy again
