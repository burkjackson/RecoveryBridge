-- 054: freeze sessions.ended_at once a session has ended.
--
-- /api/sessions/state now only honours 'end' within 2 minutes of ended_at,
-- so a replayed old session id can't put a blocked listener back in the
-- pool or flip someone mid-chat back to 'available'. That window only means
-- something if a participant can't just rewrite ended_at to "now" first:
-- 052 kept an ended session ended, but still let a participant update its
-- ended_at freely. Every client path that ends a session now filters on
-- status = 'active', so none of them touch an already-ended row.
--
-- Same function as 052 plus the ended_at rule. Service role stays exempt.

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

  -- And once ended, when it ended is fixed too (see header).
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

  return new;
end;
$$;

revoke execute on function public.protect_session_transitions() from anon, authenticated, public;
