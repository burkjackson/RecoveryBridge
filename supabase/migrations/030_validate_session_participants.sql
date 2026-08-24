-- Validate who a session may be created with.
--
-- The INSERT policy on `sessions` only checks that the creator is one of the
-- two participants — the counterpart is unconstrained. So a user who knows
-- another user's id could insert an active session naming them, which then
-- satisfies the "session participant" policy on `profiles` (opening read
-- access to that person) and the messages INSERT policy (opening a live
-- channel to them). Availability, consent and block checks all lived in
-- client code, which an attacker simply wouldn't run.
--
-- Implemented as a SECURITY DEFINER trigger rather than a tighter RLS policy
-- on purpose: expressions inside a policy are themselves subject to RLS on the
-- tables they read, so a policy that consults `profiles` can't see the very
-- rows it needs to check.
--
-- Callers with no JWT (service role, SQL editor, cron) are exempt — the server
-- routes are already trusted and do their own checks.

CREATE OR REPLACE FUNCTION public.validate_session_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator uuid := auth.uid();
  counterpart_available boolean;
  counterpart_requesting boolean;
BEGIN
  IF creator IS NULL THEN
    RETURN NEW;  -- service role / direct SQL
  END IF;

  IF creator <> NEW.listener_id AND creator <> NEW.seeker_id THEN
    RAISE EXCEPTION 'You can only create sessions you take part in';
  END IF;

  IF NEW.listener_id = NEW.seeker_id THEN
    RAISE EXCEPTION 'You cannot start a session with yourself';
  END IF;

  -- A restricted account starts nothing.
  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE user_id = creator
      AND is_active
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Your account is currently restricted from starting sessions';
  END IF;

  IF creator = NEW.seeker_id THEN
    -- Seeker reaching out: the listener must be offering support.
    SELECT (role_state = 'available' OR always_available IS TRUE)
      INTO counterpart_available
      FROM profiles WHERE id = NEW.listener_id;

    IF counterpart_available IS NOT TRUE THEN
      RAISE EXCEPTION 'That listener is not available right now';
    END IF;
  ELSE
    -- Listener answering: the seeker must actually be asking.
    SELECT (role_state = 'requesting')
      INTO counterpart_requesting
      FROM profiles WHERE id = NEW.seeker_id;

    IF counterpart_requesting IS NOT TRUE THEN
      RAISE EXCEPTION 'That person is no longer waiting for support';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_session_participants ON public.sessions;

CREATE TRIGGER validate_session_participants
  BEFORE INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_session_participants();
