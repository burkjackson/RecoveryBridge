-- 056: server-verified crisis flag on sessions, for admin visibility.
--
-- Review item #20 (2026-09-22 review): a listener seeing crisis language
-- gets the same generic copy as the seeker, and nothing is recorded
-- anywhere — an admin has no way to see which conversations involved
-- crisis language at all, whether they ended calmly or not.
--
-- This is the storage half. `sessions.crisis_flagged_at` is set once, the
-- first time either participant's own client detects crisis language in
-- the thread (lib/constants.ts containsCrisisLanguage(), the same detector
-- used to show the in-chat banner) and calls POST /api/sessions/flag-crisis.
-- That route re-scans the session's actual messages with the service role
-- before writing anything — it does not trust a client-supplied boolean,
-- the same shape as /api/notifications/thank-you re-reading the note it's
-- asked to deliver.
--
-- crisis_flagged_at is deliberately NOT client-writable, even though other
-- sessions columns still are (see 052/054's header — no blanket WITH CHECK
-- exists on this table yet). A false flag would be a minor annoyance; a
-- participant clearing a true one to keep it off an admin's radar would
-- defeat the point entirely. Only the service role may set it, and once
-- set it cannot be changed or cleared by anyone with a browser JWT,
-- including admins acting outside /api/admin/actions.
alter table public.sessions
  add column if not exists crisis_flagged_at timestamptz;

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

  -- And once ended, when it ended is fixed too.
  if old.status = 'ended' and new.ended_at is distinct from old.ended_at then
    raise exception 'An ended session''s ended_at cannot be changed';
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

  -- Only the server may set (or clear) the crisis flag. See header.
  if new.crisis_flagged_at is distinct from old.crisis_flagged_at then
    raise exception 'crisis_flagged_at can only be set by the server';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_session_transitions() from anon, authenticated, public;
