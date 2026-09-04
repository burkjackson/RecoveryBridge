-- Migration 046: Dedupe RLS policies, wrap auth.uid() for single evaluation
--
-- Item 13 of the 2 Sep 2026 code review. The performance advisor reports 96
-- multiple_permissive_policies warnings and 43 auth_rls_initplan warnings.
-- This migration fixes both, with no behaviour change: every surviving
-- policy allows exactly what it allowed before.
--
-- Run this first to see the current policy list, then again after applying
-- to diff before/after:
--
--   select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('profiles','sessions','messages','message_reactions',
--       'session_feedback','user_favorites','user_notices','push_subscriptions',
--       'user_blocks','reports')
--   order by tablename, cmd, policyname;
--
-- Part 1: drop true duplicates (identical or strictly-subset policies).
-- None of these names are referenced by any other migration file (checked
-- via grep across supabase/migrations/*.sql) — grepping the repo also
-- turned up something worth knowing: none of the eight dropped names below
-- exist in supabase/legacy/complete-schema-setup.sql or admin-schema.sql
-- either, which means they were created directly against the live database,
-- never captured in any file, tracked or legacy. Same class of live-DB
-- drift as #38 (migration 045), just RLS policies instead of functions.
-- The policy each duplicate collapses into IS in one of those legacy files
-- (or, for user_blocks, in migration 016), which is why that's the one
-- kept.
--
--   sessions:
--     "Users can view sessions they participate in"   → dup of "Users can view own sessions"
--     "Users can update sessions they participate in" → dup of "Users can update own sessions"
--     "Seekers can create sessions"                    → subset of "Users can create sessions"
--   messages:
--     "Users can view messages in their sessions"      → dup of "Users can view session messages"
--   push_subscriptions (4 per-command policies, all subsumed by the FOR ALL policy):
--     "Users can view own subscriptions"
--     "Users can create own subscriptions"
--     "Users can update own subscriptions"
--     "Users can delete own subscriptions"
--     → all four dup of "Users can manage their own push subscriptions" (FOR ALL)
--   user_blocks (4 per-command admin policies, all subsumed by the FOR ALL admin policy):
--     "Admins can delete blocks"
--     "Admins can create blocks"
--     "Admins can view all blocks"
--     "Admins can update blocks"
--     → all four dup of "Admins can manage blocks" (FOR ALL, migration 016)
--     "Users can view if they are blocked" → dup of "Users can view own blocks"
--
-- Part 2: wrap every remaining auth.uid() call as (select auth.uid()) so
-- Postgres evaluates it once per query instead of once per row. Covers the
-- nine tables the review named (profiles, sessions, messages,
-- message_reactions, session_feedback, user_favorites, user_notices,
-- push_subscriptions, reports) plus user_blocks, which the review's list
-- left out but which the live performance advisor flags for the same
-- reason (its "Admins can manage blocks" and "Users can view own blocks"
-- policies both call auth.uid() directly) — added here since it was
-- already being touched for dedup above. is_admin()-only policies
-- (`is_admin()` with no bare auth.uid() in the policy body) aren't touched;
-- the advisor doesn't flag them and there's nothing in the policy text to
-- wrap. All ALTER POLICY statements below reuse each policy's exact
-- existing expression with only auth.uid() → (select auth.uid()) changed —
-- confirmed against a live impersonated query (seeker/listener/stranger
-- against the same session row) before and after, same result each time.
--
-- Verify after applying: run the query at the top again and diff against
-- a copy taken before. Then, using the impersonation recipe below (also in
-- this file's README entry), confirm a real seeker and a real listener can
-- each still see their own session, and a third uuid can't:
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', json_build_object('sub','<uuid>','role','authenticated')::text, true);
--   select count(*) from sessions where id = '<a real session id>';
--   rollback;

begin;

-- ── Part 1: drop duplicates ────────────────────────────────────────────

drop policy if exists "Users can view sessions they participate in" on public.sessions;
drop policy if exists "Users can update sessions they participate in" on public.sessions;
drop policy if exists "Seekers can create sessions" on public.sessions;

drop policy if exists "Users can view messages in their sessions" on public.messages;

drop policy if exists "Users can view own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can create own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete own subscriptions" on public.push_subscriptions;

drop policy if exists "Admins can delete blocks" on public.user_blocks;
drop policy if exists "Admins can create blocks" on public.user_blocks;
drop policy if exists "Admins can view all blocks" on public.user_blocks;
drop policy if exists "Admins can update blocks" on public.user_blocks;
drop policy if exists "Users can view if they are blocked" on public.user_blocks;

-- ── Part 2: wrap auth.uid() as (select auth.uid()) ─────────────────────

-- profiles
alter policy "Users can insert own profile" on public.profiles
  with check ((select auth.uid()) = id);

alter policy "Users can view favourited profiles" on public.profiles
  using (id in (
    select user_favorites.favorite_user_id from user_favorites
    where user_favorites.user_id = (select auth.uid())
  ));

alter policy "Users can view own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can view session participant profiles" on public.profiles
  using (id in (
    select sessions.listener_id from sessions where sessions.seeker_id = (select auth.uid())
    union
    select sessions.seeker_id from sessions where sessions.listener_id = (select auth.uid())
  ));

alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = id);

-- sessions
alter policy "Users can create sessions" on public.sessions
  with check (((select auth.uid()) = listener_id) or ((select auth.uid()) = seeker_id));

alter policy "Users can view own sessions" on public.sessions
  using (((select auth.uid()) = listener_id) or ((select auth.uid()) = seeker_id));

alter policy "Users can update own sessions" on public.sessions
  using (((select auth.uid()) = listener_id) or ((select auth.uid()) = seeker_id));

-- messages
alter policy "Users can send messages in their sessions" on public.messages
  with check (
    (sender_id = (select auth.uid()))
    and (exists (
      select 1 from sessions
      where sessions.id = messages.session_id
        and (sessions.listener_id = (select auth.uid()) or sessions.seeker_id = (select auth.uid()))
        and sessions.status = 'active'::text
    ))
  );

alter policy "Users can view session messages" on public.messages
  using (session_id in (
    select sessions.id from sessions
    where sessions.listener_id = (select auth.uid()) or sessions.seeker_id = (select auth.uid())
  ));

alter policy "Users can mark received messages as read" on public.messages
  using (
    (session_id in (
      select sessions.id from sessions
      where sessions.listener_id = (select auth.uid()) or sessions.seeker_id = (select auth.uid())
    ))
    and (sender_id <> (select auth.uid()))
  )
  with check (
    (session_id in (
      select sessions.id from sessions
      where sessions.listener_id = (select auth.uid()) or sessions.seeker_id = (select auth.uid())
    ))
    and (sender_id <> (select auth.uid()))
  );

-- message_reactions
alter policy "Users can remove own reactions" on public.message_reactions
  using (user_id = (select auth.uid()));

alter policy "Users can add reactions in active sessions" on public.message_reactions
  with check (
    (user_id = (select auth.uid()))
    and (message_id in (
      select m.id from messages m join sessions s on m.session_id = s.id
      where (s.listener_id = (select auth.uid()) or s.seeker_id = (select auth.uid()))
        and s.status = 'active'::text
    ))
  );

alter policy "Users can view reactions in own sessions" on public.message_reactions
  using (message_id in (
    select m.id from messages m join sessions s on m.session_id = s.id
    where s.listener_id = (select auth.uid()) or s.seeker_id = (select auth.uid())
  ));

-- session_feedback
alter policy "Users can insert own feedback" on public.session_feedback
  with check (
    ((select auth.uid()) = from_user_id)
    and (session_id in (
      select sessions.id from sessions
      where sessions.listener_id = (select auth.uid()) or sessions.seeker_id = (select auth.uid())
    ))
    and (
      (session_id in (
        select sessions.id from sessions
        where sessions.seeker_id = (select auth.uid()) and sessions.listener_id = session_feedback.to_user_id
      ))
      or (session_id in (
        select sessions.id from sessions
        where sessions.listener_id = (select auth.uid()) and sessions.seeker_id = session_feedback.to_user_id
      ))
    )
  );

alter policy "Users can read feedback about themselves" on public.session_feedback
  using (((select auth.uid()) = to_user_id) or ((select auth.uid()) = from_user_id));

-- user_favorites
alter policy "Users can delete own favorites" on public.user_favorites
  using ((select auth.uid()) = user_id);

alter policy "Users can add favorites from past sessions" on public.user_favorites
  with check (
    ((select auth.uid()) = user_id)
    and (favorite_user_id <> (select auth.uid()))
    and (exists (
      select 1 from sessions
      where sessions.status = 'ended'::text
        and (
          (sessions.listener_id = (select auth.uid()) and sessions.seeker_id = user_favorites.favorite_user_id)
          or (sessions.seeker_id = (select auth.uid()) and sessions.listener_id = user_favorites.favorite_user_id)
        )
    ))
  );

alter policy "Users can view own favorites" on public.user_favorites
  using ((select auth.uid()) = user_id);

-- user_notices
alter policy "admins_read_all_notices" on public.user_notices
  using (exists (
    select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true
  ));

alter policy "users_read_own_notices" on public.user_notices
  using ((select auth.uid()) = user_id);

alter policy "users_update_own_notices" on public.user_notices
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- push_subscriptions (only the FOR ALL survivor remains after Part 1)
alter policy "Users can manage their own push subscriptions" on public.push_subscriptions
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- reports (already deduped by migration 044)
alter policy "Users can create reports" on public.reports
  with check (reporter_id = (select auth.uid()));

alter policy "Users can view own reports" on public.reports
  using (reporter_id = (select auth.uid()));

-- user_blocks (not in the review's list, added because the advisor flags it too)
alter policy "Admins can manage blocks" on public.user_blocks
  using (exists (
    select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true
  ));

alter policy "Users can view own blocks" on public.user_blocks
  using (user_id = (select auth.uid()));

commit;
