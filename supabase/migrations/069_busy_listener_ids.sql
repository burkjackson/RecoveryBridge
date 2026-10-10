-- 069: let listener lists hide always_available listeners who are mid-chat.
--
-- An always_available listener keeps role_state while chatting (CLAUDE.md
-- #69), so they stay on every seeker's list. Tapping Connect then fails on
-- idx_one_active_session_per_listener. Seekers can't read other people's
-- sessions under RLS, so the client can't filter them itself.
--
-- This returns bare ids only: always_available listeners who are in an
-- active session (pending or accepted, since both hold the index). Plain
-- listeners are left out because they're 'offline' while chatting and never
-- listed anyway. Sessions the caller is in are left out too, so a seeker
-- with a pending request still sees that listener and rejoins the chat.

create or replace function public.get_busy_listener_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.listener_id
  from public.sessions s
  join public.profiles p on p.id = s.listener_id
  where s.status = 'active'
    and p.always_available
    and auth.uid() is not null
    and auth.uid() <> s.listener_id
    and auth.uid() <> s.seeker_id
$$;

-- See CLAUDE.md #37: default privileges grant EXECUTE to anon directly,
-- so revoking from PUBLIC alone doesn't restrict it.
revoke execute on function public.get_busy_listener_ids() from anon, authenticated, public;
grant execute on function public.get_busy_listener_ids() to authenticated;
