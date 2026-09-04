-- 052: a participant may end a session and a listener may accept one. Nothing else.
--
-- BACKFILL — this documents a change already live in production, applied
-- directly on 31 Aug 2026 by a different Claude session working on its own
-- branch (never merged to main). That branch is otherwise abandoned; this
-- file exists so the migration history here matches what the database
-- actually has, rather than silently missing it. The SQL below is unchanged
-- from what actually ran and is idempotent, so re-running it is a no-op.
--
-- The three permissive UPDATE policies on `sessions` all say the same thing
-- — "are you the listener or the seeker?" — and none of them carries a WITH
-- CHECK. For an UPDATE, Postgres falls back to the USING expression as the
-- check, so the test applies to the row you are touching, never to the
-- columns you are touching or the value you are putting in them. A
-- participant could rewrite the row freely. Verified against production data
-- at the time, acting as the seeker:
--
--   set accepted_at on a pending session   -> ALLOWED
--   swap in a third party as listener_id   -> ALLOWED
--   flip an 'ended' session back to active -> ALLOWED
--   reassign seeker_id to someone else     -> blocked (they'd stop being a
--                                             participant, so the implicit
--                                             WITH CHECK caught that one)
--
-- Each of the three that got through mattered on its own:
--
--   * accepted_at. This is the whole of migration 039's accept gate, and the
--     person it gates could simply lift it. 051 (the messages fix, above)
--     closes the forgery route into a pending session; this closes the front
--     door. Both are needed.
--   * listener_id. `validate_session_participants()` (030) checks
--     availability, consent and blocks — but it is a BEFORE INSERT trigger,
--     so an UPDATE walks straight past it. A seeker could attach any user id
--     they know as the listener and drop that person into a conversation
--     they never agreed to.
--   * status. Ending a session is how both people, and moderators, get out
--     of one. A blocked user could reopen a room a moderator closed, since
--     the messages policy only asks that the session be 'active'.
--
-- Expressed as a BEFORE UPDATE trigger rather than a tighter policy because a
-- policy cannot see OLD: "this column may not change" and "ended is one-way"
-- are both statements about the transition, not about either row alone. Same
-- reasoning and SECURITY DEFINER shape as 028 and 030.
--
-- Callers with no JWT (service role, cron, SQL editor) are exempt, exactly
-- as in 030. Admins are NOT exempt, following 028's stance — no admin path
-- updates `sessions` from a browser JWT (they all go through
-- /api/admin/actions on the service role), so exempting them would only
-- widen what a stolen admin token is worth.
--
-- Every legitimate client write still passes: ending a chat, "Cancel
-- request", "Not now", the dashboard sign-out sweep, and the listener's
-- Accept.

create or replace function public.protect_session_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  jwt_role text;
begin
  jwt_role := nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role';

  if actor is null or jwt_role = 'service_role' then
    return new;  -- server routes, cron, SQL editor
  end if;

  -- Who the conversation is between is fixed at creation, where 030 validated it.
  if new.listener_id is distinct from old.listener_id
     or new.seeker_id is distinct from old.seeker_id then
    raise exception 'Session participants cannot be changed';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Session created_at cannot be changed';
  end if;

  -- Ending is one-way. Reopening is how a blocked user would get back in.
  if old.status = 'ended' and new.status is distinct from 'ended' then
    raise exception 'An ended session cannot be reopened';
  end if;

  -- Acceptance is the listener's to give, once, and it is never taken back.
  if new.accepted_at is distinct from old.accepted_at then
    if old.accepted_at is not null then
      raise exception 'Session acceptance cannot be changed once set';
    end if;
    if actor is distinct from old.listener_id then
      raise exception 'Only the listener can accept a connection request';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_session_transitions on public.sessions;

create trigger protect_session_transitions
  before update on public.sessions
  for each row
  execute function public.protect_session_transitions();
