-- Fix "Function Search Path Mutable" warnings from Supabase Security Advisor.
-- Adding SET search_path = public to each function prevents search_path injection attacks.

-- 1. restrict_message_update (defined in 004_security_fixes.sql)
CREATE OR REPLACE FUNCTION public.restrict_message_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow read_at to be changed
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at can be updated on messages';
  END IF;

  -- Enforce read_at is set to current time (not arbitrary)
  IF NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    NEW.read_at := now();
  END IF;

  -- Prevent unsetting read_at once set
  IF OLD.read_at IS NOT NULL AND NEW.read_at IS NULL THEN
    RAISE EXCEPTION 'Cannot unset read_at once a message is marked as read';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. update_blog_posts_updated_at (defined in 011_blog_posts.sql)
CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. handle_updated_at (created directly in Supabase)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. update_updated_at_column (created directly in Supabase)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5. cleanup_stale_availability (created directly in Supabase)
-- NOTE: If this function has a different body than shown below, replace it
-- with the correct body — only the SET search_path addition is required.
CREATE OR REPLACE FUNCTION public.cleanup_stale_availability()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET role_state = 'offline'
  WHERE role_state IN ('available', 'requesting')
    AND last_heartbeat_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 6. is_admin (created directly in Supabase)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
