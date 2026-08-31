-- 041: a participant may end a session and a listener may accept one. Nothing else.
--
-- The three permissive UPDATE policies on `sessions` all say the same thing —
-- "are you the listener or the seeker?" — and none of them carries a WITH
-- CHECK. For an UPDATE, Postgres falls back to the USING expression as the
-- check, so the test applies to the row you are touching, never to the columns
-- you are touching or to the value you are putting in them. A participant
-- could therefore rewrite the row freely. Verified against production data in
-- rolled-back transactions, acting as the seeker:
--
--   set accepted_at on a pending session   -> ALLOWED
--   swap in a third party as listener_id   -> ALLOWED
--   flip an 'ended' session back to active -> ALLOWED
--   reassign seeker_id to someone else     -> blocked (they'd stop being a
--                                             participant, so the implicit
--                                             WITH CHECK caught that one)
--
-- Each of the three that got through matters on its own:
--
--   * accepted_at. This is the whole of migration 039's accept gate, and the
--     person it gates could simply lift it. 040 closes the forgery route into
--     a pending session; this closes the front door. Both are needed.
--   * listener_id. `validate_session_participants()` (030) checks availability,
--     consent and blocks — but it is a BEFORE INSERT trigger, so an UPDATE
--     walks straight past it. A seeker could attach any user id they know as
--     the listener, which then satisfies the session-participant branch of the
--     `profiles` SELECT policy and drops that person into a conversation they
--     never agreed to.
--   * status. Ending a session is how both people, and moderators, get out of
--     one. `block_user` and `end_session` in /api/admin/actions end sessions as
--     a moderation action; a blocked user could reopen the room and carry on,
--     since the messages policy only asks that the session be 'active'.
--
-- Expressed as a BEFORE UPDATE trigger rather than a tighter policy because a
-- policy cannot see OLD: "this column may not change" and "ended is one-way"
-- are both statements about the transition, not about either row alone. Same
-- reasoning, and the same SECURITY DEFINER shape, as 028 and 030.
--
-- Callers with no JWT (service role, cron, SQL editor) are exempt, exactly as
-- in 030: every server route already authenticates and authorises for itself,
-- and the cleanup cron has to be able to end sessions on nobody's behalf.
-- Admins are NOT exempt, following 028's stance — no admin path updates
-- `sessions` from a browser JWT (they all go through /api/admin/actions on the
-- service role), so exempting them would only widen what a stolen admin token
-- is worth.
--
-- Every legitimate client write still passes: ending a chat
-- (`status`/`ended_at`, from the chat page, "Cancel request", "Not now", and
-- the dashboard's sign-out sweep) and the listener's Accept.

CREATE OR REPLACE FUNCTION public.protect_session_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  jwt_role text;
BEGIN
  jwt_role := nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role';

  IF actor IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;  -- server routes, cron, SQL editor
  END IF;

  -- Who the conversation is between is fixed at creation, where 030 validated it.
  IF NEW.listener_id IS DISTINCT FROM OLD.listener_id
     OR NEW.seeker_id IS DISTINCT FROM OLD.seeker_id THEN
    RAISE EXCEPTION 'Session participants cannot be changed';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Session created_at cannot be changed';
  END IF;

  -- Ending is one-way. Reopening is how a blocked user would get back in.
  IF OLD.status = 'ended' AND NEW.status IS DISTINCT FROM 'ended' THEN
    RAISE EXCEPTION 'An ended session cannot be reopened';
  END IF;

  -- Acceptance is the listener's to give, once, and it is never taken back.
  IF NEW.accepted_at IS DISTINCT FROM OLD.accepted_at THEN
    IF OLD.accepted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Session acceptance cannot be changed once set';
    END IF;
    IF actor IS DISTINCT FROM OLD.listener_id THEN
      RAISE EXCEPTION 'Only the listener can accept a connection request';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_session_transitions ON public.sessions;

CREATE TRIGGER protect_session_transitions
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_session_transitions();
