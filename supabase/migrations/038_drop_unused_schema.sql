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
-- Both were verified empty and unreferenced immediately before this ran. The
-- guard below re-checks the table at apply time rather than trusting that.

do $$
begin
  if to_regclass('public.blocks') is not null then
    if exists (select 1 from public.blocks limit 1) then
      raise exception 'public.blocks is not empty - investigate before dropping';
    end if;
  end if;
end $$;

alter table public.profiles drop column if exists requesting_since;

drop table if exists public.blocks;
