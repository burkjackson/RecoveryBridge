-- Stop a user from making themselves an admin.
--
-- The "Users can update own profile" policy is row-level only: it decides
-- WHICH row you may write, not which columns. With no column-level grant and
-- no trigger, any signed-in user could run
--
--     supabase.from('profiles').update({ is_admin: true }).eq('id', myId)
--
-- from the browser console and gain the moderation dashboard — every report,
-- every user record, chat transcripts, and account deletion.
--
-- This trigger lets the column through only for callers that aren't acting as
-- an end user: the service role (our server routes) and direct SQL sessions,
-- which have no JWT at all. That keeps the admin API routes and the Supabase
-- SQL editor working, including granting the first admin.

CREATE OR REPLACE FUNCTION public.protect_admin_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF NEW.is_admin IS NOT DISTINCT FROM OLD.is_admin THEN
    RETURN NEW;
  END IF;

  -- NULL when there is no request JWT (SQL editor, psql, migrations).
  jwt_role := nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role';

  IF jwt_role IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'is_admin can only be changed by an administrator';
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_flag ON public.profiles;

CREATE TRIGGER protect_admin_flag
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_flag();
