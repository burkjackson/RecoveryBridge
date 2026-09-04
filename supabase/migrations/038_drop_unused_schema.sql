-- 038: remove two pieces of schema that nothing uses.
-- (Written as 035, renumbered to 038 after a rebase picked up migrations
-- 035-037 from a parallel session — see migrations/README.md.)
--
-- profiles.requesting_since
--   Added early and never wired up: no code writes it, no code reads it, and
--   every row is null. It would have been the exact boundary of a seeker's
--   requesting episode — the "we couldn't connect you" guard in
--   /api/cleanup-sessions has to approximate that with a 3-hour lookback
--   instead — but reviving it would mean populating the column first, at which
--   point it can simply be re-added. A permanently-null column only invites
--   someone to trust it.
--
-- public.blocks
--   Superseded by user_blocks, which carries the block_type, expires_at,
--   is_active and audit fields the app actually uses (see migrations 016 and
--   031). blocks holds 0 rows and is referenced by nothing: no application
--   code, no foreign key pointing at it, no trigger, function or view. Its own
--   policy ("Admins can manage blocks") and its two outbound foreign keys to
--   profiles are dropped along with it.
--
-- profiles.bubble_user_id, profiles.is_suspended
--   Added 3 Sep 2026 (code review item 21) to the same drop, found the same
--   way: grepped app/, lib/, and components/ for both names and got zero
--   hits — nothing reads or writes either column. bubble_user_id (text) is
--   null on every row; is_suspended (boolean, default false) is false on
--   every row. Blocking/suspension is handled entirely by user_blocks (016,
--   031, 041) — these two were never wired up to it.
--
-- All four were verified empty and unreferenced immediately before this ran.
-- The guards below re-check at apply time rather than trusting that.

do $$
begin
  if to_regclass('public.blocks') is not null then
    if exists (select 1 from public.blocks limit 1) then
      raise exception 'public.blocks is not empty - investigate before dropping';
    end if;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'bubble_user_id'
  ) then
    if exists (select 1 from public.profiles where bubble_user_id is not null limit 1) then
      raise exception 'public.profiles.bubble_user_id is not all null - investigate before dropping';
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_suspended'
  ) then
    if exists (select 1 from public.profiles where is_suspended is true limit 1) then
      raise exception 'public.profiles.is_suspended is not all false - investigate before dropping';
    end if;
  end if;
end $$;

alter table public.profiles drop column if exists requesting_since;
alter table public.profiles drop column if exists bubble_user_id;
alter table public.profiles drop column if exists is_suspended;

drop table if exists public.blocks;
