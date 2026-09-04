-- Live-vs-repo drift and function hygiene, found by comparing production
-- against the migration files and the Supabase security advisor.
--
-- 1. protect_session_transitions() exists live on public.sessions with NO
--    migration file behind it — it locks session participants and
--    created_at, makes ending one-way, and restricts accepted_at to a
--    single listener-only transition. Good code; it just was never
--    committed. Written here as CREATE OR REPLACE from the live
--    pg_get_functiondef() output, verbatim, so this migration documents
--    what's already running rather than changing it.
--
-- 2. Six functions are missing search_path (confirmed via the security
--    advisor: function_search_path_mutable on all six) — a stale search_path
--    is how a same-named object earlier in a hijacked search path gets
--    substituted for the real one. is_admin, restrict_message_update,
--    handle_updated_at, and update_blog_posts_updated_at get it here.
--    update_updated_at_column too. cleanup_stale_availability is dropped
--    below instead of fixed — no point pinning the search_path of a
--    function that's about to not exist.
--
-- 3. Trigger functions never need RPC access, but they had it: creating a
--    function in this project grants EXECUTE directly to anon and
--    authenticated by default (confirmed via pg_default_acl — Supabase's
--    default-privileges setup grants EXECUTE ON FUNCTIONS to anon,
--    authenticated, service_role at CREATE time, as *direct* grants to
--    those roles, separate from whatever PUBLIC holds). That's the same
--    "additive privilege layers" trap as migration 040's first draft
--    (CLAUDE.md gotcha #20), one level up: revoking from PUBLIC alone does
--    nothing here, because anon/authenticated were never relying on the
--    PUBLIC grant in the first place. See CLAUDE.md Known Issue #37 (sixth
--    RLS/privilege gotcha, function EXECUTE edition) added alongside this
--    migration.
--
--    handle_new_user, protect_admin_flag, protect_session_transitions, and
--    validate_session_participants (all SECURITY DEFINER, all trigger
--    functions, all showing up in the advisor as anon/authenticated
--    "Public Can Execute SECURITY DEFINER Function") get explicit REVOKEs
--    from anon, authenticated, and public.
--
--    Same fix applied to two functions this drift-check turned up that
--    weren't in the original review because they didn't exist yet when it
--    was written (migration 041, same day): protect_blocked_role_state()
--    (another trigger function, same gap) and is_user_blocked(uuid) — 041's
--    own `revoke execute ... from public` was exactly this bug: it revoked
--    the pseudo-role that was never the source of anon's access, so anon
--    could call /rest/v1/rpc/is_user_blocked for any uuid the whole time.
--    Nothing in app/ or lib/ calls either function directly (both are only
--    ever invoked from inside other SECURITY DEFINER trigger functions,
--    which run as their owner regardless of the caller's own grants), so
--    there's no direct caller to preserve access for — revoked from
--    authenticated too, reversing 041's forward-looking grant.
--
--    is_admin() is deliberately left alone: several RLS policies scoped to
--    `public` (not just `authenticated`) call is_admin() directly in their
--    USING clause — e.g. "Admins can view all profiles" on profiles,
--    "Admins can view all sessions"/"...update all sessions" on sessions,
--    "Admins can view all messages" on messages, "Admins can view/update
--    reports" on reports, four policies on user_blocks. A `public`-scoped
--    policy is evaluated for the anon role too, and Postgres checks EXECUTE
--    privilege on every function a policy calls — revoking anon's EXECUTE
--    on is_admin() wouldn't make those policies quietly evaluate to false
--    for anon, it would make every anon-role query against those six tables
--    error with "permission denied for function is_admin". This is a
--    correct-for-this-schema exception to the advisor's generic
--    recommendation, not an oversight — left executable by anon and
--    authenticated both.
--
-- 4. cleanup_stale_availability() is dead (CLAUDE.md known issue on stale
--    `available` listeners says so) and was wrong even when it ran — a
--    5-minute threshold with no always_available exception, versus the
--    two-week threshold resetStaleAvailability() in
--    app/api/cleanup-sessions/route.ts actually uses. Dropped.

begin;

-- 1. protect_session_transitions — was live with no migration file.
create or replace function public.protect_session_transitions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
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

drop trigger if exists protect_session_transitions on public.sessions;

create trigger protect_session_transitions
  before update on public.sessions
  for each row
  execute function public.protect_session_transitions();

-- 2. Pin search_path on the five functions being kept.
alter function public.is_admin() set search_path = public;
alter function public.restrict_message_update() set search_path = public;
alter function public.handle_updated_at() set search_path = public;
alter function public.update_updated_at_column() set search_path = public;
alter function public.update_blog_posts_updated_at() set search_path = public;

-- 3. Trigger functions never need RPC access — revoke from anon,
-- authenticated, and public explicitly (see comment above on why a
-- PUBLIC-only revoke is a no-op here).
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.protect_admin_flag() from anon, authenticated, public;
revoke execute on function public.protect_session_transitions() from anon, authenticated, public;
revoke execute on function public.validate_session_participants() from anon, authenticated, public;
revoke execute on function public.protect_blocked_role_state() from anon, authenticated, public;
revoke execute on function public.is_user_blocked(uuid) from anon, authenticated, public;

-- is_admin() intentionally NOT revoked from anon/authenticated — see comment above.

-- 4. Dead and wrong. resetStaleAvailability() in
-- app/api/cleanup-sessions/route.ts is the real mechanism (two-week
-- threshold, always_available excluded) — see CLAUDE.md known issue #17.
drop function if exists public.cleanup_stale_availability();

commit;
