-- 053: stop user_mutes telling a reported person who reported them.
--
-- 050's SELECT policy let either side of a mute read the row
-- (muter_id = uid OR muted_id = uid). mute_on_report() inserts
-- (muter_id = reporter, muted_id = reported, session_id, source = 'report')
-- the moment a report is filed, so the reported person could run
--   from('user_mutes').select('*').eq('muted_id', me)
-- and learn who reported them and for which session. That reopens the
-- retaliation path 044 closed on `reports`. Manual mutes leaked the same
-- way, which also broke 050's "silent both ways" promise.
--
-- Fix: a user can only read mutes they created. The two-way exclusion set
-- that lib/mutes.ts needs for list filtering comes from a SECURITY DEFINER
-- RPC that returns bare counterpart ids — no muter/muted direction, no
-- session, no source — so a client can filter its lists without learning
-- who muted whom or why.
--
-- Verified 22 Sep 2026: user_mutes had 0 rows, so nothing was exposed yet.

drop policy if exists "Users can view mutes involving themselves" on public.user_mutes;

create policy "Users can view mutes they created"
  on public.user_mutes for select
  using ((select auth.uid()) = muter_id);

-- "Admins can view all mutes" (050) is untouched.

create or replace function public.get_my_mute_counterparts()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select muted_id from public.user_mutes where muter_id = auth.uid()
  union
  select muter_id from public.user_mutes where muted_id = auth.uid()
$$;

-- See CLAUDE.md #37: default privileges grant EXECUTE to anon directly,
-- so revoking from PUBLIC alone doesn't restrict it.
revoke execute on function public.get_my_mute_counterparts() from anon, authenticated, public;
grant execute on function public.get_my_mute_counterparts() to authenticated;
