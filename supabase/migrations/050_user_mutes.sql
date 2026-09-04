-- 050: user-to-user muting (code review item 24).
--
-- user_blocks is an admin action that restricts one account platform-wide.
-- There was no way for a seeker or listener to say "not that person again"
-- without it turning into a moderation report — a seeker who had a bad
-- session could report the listener and wait, but nothing stopped them
-- being matched with that same listener again in the meantime, and a
-- listener had no way to keep a specific seeker from direct-connecting.
--
-- user_mutes is pairwise and self-serve, modeled directly on user_favorites
-- (007): same "you can only act on someone you've actually had a session
-- with" gate, same table shape. Differences from user_favorites: mutes are
-- enforced symmetrically (it doesn't matter who muted whom, neither side
-- can reach the other) and there's no delete policy yet — no unmute UI in
-- this first version, so nobody but a service-role/admin action can remove
-- one. A report also auto-creates a mute (reporter -> reported) so a
-- reporter can't be re-matched with someone while their report is still
-- sitting unresolved.

create table if not exists public.user_mutes (
  id uuid default gen_random_uuid() primary key,
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'report')),
  created_at timestamptz not null default now(),

  unique (muter_id, muted_id),
  constraint chk_no_self_mute check (muter_id != muted_id)
);

create index if not exists idx_user_mutes_muter on public.user_mutes (muter_id);
create index if not exists idx_user_mutes_muted on public.user_mutes (muted_id);

alter table public.user_mutes enable row level security;

-- Each side of a mute can see it — this is what lets a muted person's own
-- client quietly stop showing the other party too, without either of them
-- ever being told a mute exists. Nobody gets a "such-and-such muted you"
-- message; both lists just go quiet.
create policy "Users can view mutes involving themselves"
  on public.user_mutes for select
  using ((select auth.uid()) = muter_id or (select auth.uid()) = muted_id);

-- Same gate as user_favorites: you can only mute someone you've actually
-- been in a session with.
create policy "Users can mute people from past sessions"
  on public.user_mutes for insert
  with check (
    (select auth.uid()) = muter_id
    and muted_id != (select auth.uid())
    and exists (
      select 1 from public.sessions
      where status = 'ended'
        and (
          (listener_id = (select auth.uid()) and seeker_id = muted_id)
          or
          (seeker_id = (select auth.uid()) and listener_id = muted_id)
        )
    )
  );

-- Admin visibility: a listener racking up mutes without anyone filing a
-- formal report is exactly the kind of pattern worth surfacing next to
-- reports on the admin page.
create policy "Admins can view all mutes"
  on public.user_mutes for select
  using (is_admin());

-- Deliberately no update/delete policy yet — see header. Service role can
-- still do either.

-- Auto-mute on report: the reporter is spared re-matching with the person
-- they just reported, as a side effect of the report itself rather than
-- something the client has to remember to also do. SECURITY DEFINER so it
-- writes into user_mutes as a system action, not something the reporter's
-- own client is trusted to do correctly — the user_mutes INSERT policy
-- above only lets someone mute as themselves anyway, which is the right
-- restriction for the manual path but would be the wrong tool here. Same
-- skip-condition shape as the other SECURITY DEFINER triggers in this file
-- set (028, 030, 041, 047): reporter_id/reported_user_id can be null on a
-- report, so this no-ops rather than raising if either is missing.
create or replace function public.mute_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reporter_id is null or new.reported_user_id is null then
    return new;
  end if;

  insert into public.user_mutes (muter_id, muted_id, session_id, source)
  values (new.reporter_id, new.reported_user_id, new.session_id, 'report')
  on conflict (muter_id, muted_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.mute_on_report() from anon, authenticated, public;

drop trigger if exists mute_on_report on public.reports;

create trigger mute_on_report
  after insert on public.reports
  for each row
  execute function public.mute_on_report();

-- Enforce the mute symmetrically in the same trigger that already blocks a
-- restricted account from starting a session (030, extended 041/045). This
-- is the actual wall — the list filtering added in application code next to
-- this migration is UX so a muted pairing doesn't show up as an option in
-- the first place, but this is what stops it if someone gets there anyway
-- (a stale list, a replayed request, a hand-crafted insert).
create or replace function public.validate_session_participants()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  creator uuid := auth.uid();
  counterpart_available boolean;
  counterpart_requesting boolean;
begin
  if creator is null then
    return new;
  end if;

  if creator <> new.listener_id and creator <> new.seeker_id then
    raise exception 'You can only create sessions you take part in';
  end if;

  if new.listener_id = new.seeker_id then
    raise exception 'You cannot start a session with yourself';
  end if;

  if exists (
    select 1 from public.user_mutes
    where (muter_id = new.listener_id and muted_id = new.seeker_id)
       or (muter_id = new.seeker_id and muted_id = new.listener_id)
  ) then
    raise exception 'This session cannot be started between these two people';
  end if;

  if public.is_user_blocked(new.listener_id) or public.is_user_blocked(new.seeker_id) then
    raise exception 'This session cannot be started — one of the participants is currently restricted';
  end if;

  if creator = new.seeker_id then
    select (role_state = 'available' or always_available is true)
      into counterpart_available
      from profiles where id = new.listener_id;

    if counterpart_available is not true then
      raise exception 'That listener is not available right now';
    end if;
  else
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
