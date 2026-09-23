-- 057: send the direct-connect push once per session.
--
-- Review item #24: /api/notifications/send has no idempotency guard on the
-- targetListenerId branch — nothing stops a seeker (or a retried client
-- call) from hitting it repeatedly for the same pending session and
-- spamming the listener with the same "Direct Connection Request" push
-- over and over.
--
-- sessions.direct_connect_notified_at is set once, by the route, the first
-- time it actually sends (or attempts) the push for a session. A later call
-- for the same session sees it's already set and skips straight to a no-op
-- response instead of sending again.
--
-- Same reasoning as crisis_flagged_at (056) for why this isn't
-- client-writable: a participant with no WITH CHECK on this table (see
-- 052/054's header) could otherwise null it back out to defeat the guard,
-- or set it early to suppress a push to themselves-as-listener. Only the
-- service role may write it.
alter table public.sessions
  add column if not exists direct_connect_notified_at timestamptz;

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

  -- Only the server may set (or clear) the crisis flag. See 056.
  if new.crisis_flagged_at is distinct from old.crisis_flagged_at then
    raise exception 'crisis_flagged_at can only be set by the server';
  end if;

  -- Only the server may set (or clear) the direct-connect notify marker. See header.
  if new.direct_connect_notified_at is distinct from old.direct_connect_notified_at then
    raise exception 'direct_connect_notified_at can only be set by the server';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_session_transitions() from anon, authenticated, public;
