-- user_blocks was only ever consulted at session *creation*, and only
-- against whoever created the row. Four client components each ran their
-- own getActiveBlock() check before inserting a session
-- (AvailableListeners.tsx, PeopleSeeking.tsx, /connect, connectWithFavorite),
-- but the dashboard's "I Need Support" / "I'm Here To Listen" buttons didn't
-- check at all, /api/notifications/send didn't check at all, and
-- validate_session_participants() (030) only checked whether NEW's creator
-- was blocked — never the counterpart. So a blocked user could press "I
-- Need Support", flip to role_state='requesting', get pushed to every
-- listener via the broadcast route, and be connected to by any listener who
-- answered: the trigger passed because the *listener* wasn't blocked.
--
-- This closes it in the database, the same place 028/030 put the other
-- client-skippable checks: a blocked user can no longer set role_state to
-- 'available'/'requesting' or always_available to true at all, and a
-- session can't be created with either participant blocked, not just the
-- creator.

begin;

-- Mirrors lib/blocks.ts getActiveBlock(): active AND not past its own
-- expiry, since the cleanup cron flips is_active on expiry but doesn't wait
-- for the next sweep to catch this. SECURITY DEFINER + pinned search_path
-- per CLAUDE.md gotcha #2/#19 — trigger functions calling this run as their
-- owner regardless of the caller's own grants, so this only needs EXECUTE
-- for direct callers.
create or replace function public.is_user_blocked(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where user_id = check_user_id
      and is_active
      and (expires_at is null or expires_at > now())
  );
$$;

revoke execute on function public.is_user_blocked(uuid) from public;
grant execute on function public.is_user_blocked(uuid) to authenticated;

-- Replaces the creator-only check from 030 with a check against both
-- participants — the actual gap. Everything else about the function
-- (self-connect guard, availability/requesting checks) is unchanged.
create or replace function public.validate_session_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator uuid := auth.uid();
  counterpart_available boolean;
  counterpart_requesting boolean;
begin
  if creator is null then
    return new;  -- service role / direct SQL
  end if;

  if creator <> new.listener_id and creator <> new.seeker_id then
    raise exception 'You can only create sessions you take part in';
  end if;

  if new.listener_id = new.seeker_id then
    raise exception 'You cannot start a session with yourself';
  end if;

  if public.is_user_blocked(new.listener_id) or public.is_user_blocked(new.seeker_id) then
    raise exception 'This session cannot be started — one of the participants is currently restricted';
  end if;

  if creator = new.seeker_id then
    -- Seeker reaching out: the listener must be offering support.
    select (role_state = 'available' or always_available is true)
      into counterpart_available
      from profiles where id = new.listener_id;

    if counterpart_available is not true then
      raise exception 'That listener is not available right now';
    end if;
  else
    -- Listener answering: the seeker must actually be asking.
    select (role_state = 'requesting')
      into counterpart_requesting
      from profiles where id = new.seeker_id;

    if counterpart_requesting is not true then
      raise exception 'That person is no longer waiting for support';
    end if;
  end if;

  return new;
end;
$$;

-- One-time cleanup: any currently-blocked user already sitting at
-- available/requesting (nothing has stopped them from getting there before
-- this migration). Runs before the trigger below exists, so it's a plain
-- update, not something the trigger would otherwise catch on its own —
-- after this, the trigger only needs to guard *future* transitions.
update public.profiles
set role_state = 'offline', always_available = false
where public.is_user_blocked(id)
  and (role_state in ('available', 'requesting') or always_available is true);

-- Stops a blocked end user from setting themselves back to
-- available/requesting (or turning on always_available) going forward.
-- Same skip-condition shape as protect_admin_flag (028): service role and
-- direct SQL are trusted, since the app's own server routes (admin
-- block_user, the routes that flip role_state) already decide correctly.
-- Scoped to an actual transition, not "is currently in that state", so an
-- unrelated edit (bio, quiet hours) to an already-blocked row never trips
-- this — the one-time fix above means a freshly-blocked user won't start in
-- a bad state to begin with.
create or replace function public.protect_blocked_role_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text;
begin
  jwt_role := nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role';
  if jwt_role is null or jwt_role = 'service_role' then
    return new;
  end if;

  if (new.role_state in ('available', 'requesting') and new.role_state is distinct from old.role_state)
     or (new.always_available is true and new.always_available is distinct from old.always_available)
  then
    if public.is_user_blocked(new.id) then
      raise exception 'Your account is currently restricted';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_blocked_role_state on public.profiles;

create trigger protect_blocked_role_state
  before update on public.profiles
  for each row
  execute function public.protect_blocked_role_state();

commit;
