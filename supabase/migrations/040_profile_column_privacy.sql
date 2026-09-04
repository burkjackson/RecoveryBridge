-- Every SELECT policy on public.profiles is row-level (see CLAUDE.md RLS
-- gotcha #18/#4): "available listeners", "seekers requesting support",
-- "favourited profiles", and "session participant profiles" all expose the
-- WHOLE row to whoever they let in. Since profiles carries email,
-- phone_number, referral_source, quiet-hours settings, consent timestamps,
-- and legacy columns (bubble_user_id, is_suspended), any signed-in user can
-- read another member's email today: `select email from profiles where id
-- <> auth.uid()` returns real addresses. Confirmed in production 2 Sep 2026
-- via the impersonation recipe below.
--
-- FIRST DRAFT OF THIS FILE WAS WRONG — left here as the lesson, not the fix.
-- It did `revoke select (sensitive columns...) on profiles from
-- authenticated, anon` while leaving the pre-existing blanket
-- `grant select on table profiles to authenticated, anon` in place. In
-- Postgres, table-level and column-level SELECT grants are additive, not
-- layered — a role with table-level SELECT can read every column
-- regardless of any column-level REVOKE; the revoke only matters for a role
-- that has NO table-level grant. Ran it live 2 Sep 2026, the app pointed at
-- it, and email was still readable — confirmed with a second impersonation
-- check. See CLAUDE.md gotcha #20.
--
-- The actual fix has to go the other way: revoke the table-level SELECT
-- entirely, then grant SELECT back on only the public-facing columns. A
-- role with no table-level grant and a narrower column-level grant really is
-- restricted to those columns.

begin;

revoke select on public.profiles from authenticated, anon;

grant select (
  id,
  display_name,
  bio,
  tagline,
  avatar_url,
  tags,
  user_role,
  role_state,
  always_available,
  last_heartbeat_at,
  is_admin,
  listener_training_completed_at,
  created_at,
  updated_at
) on public.profiles to authenticated, anon;

-- A client reads its own sensitive columns through this instead. SECURITY
-- DEFINER bypasses the grant restriction above (it runs as the function
-- owner), `where id = auth.uid()` keeps it scoped to the caller no matter
-- who calls it, and search_path is pinned per CLAUDE.md RLS gotcha #2 (the
-- same class of bug that left is_admin(), restrict_message_update, and four
-- other functions exploitable via search_path hijacking — see 044).
create or replace function public.get_my_private_profile()
returns table (
  email text,
  phone_number text,
  referral_source text,
  quiet_hours_enabled boolean,
  quiet_hours_start text,
  quiet_hours_end text,
  quiet_hours_timezone text,
  sms_notifications_enabled boolean,
  email_notifications_enabled boolean,
  announcement_notifications_enabled boolean,
  reengagement_notifications_enabled boolean,
  listener_training_progress jsonb,
  listener_training_progress_at timestamptz,
  availability_schedule jsonb,
  consent_version text,
  consent_accepted_at timestamptz,
  age_confirmed boolean,
  health_data_consent boolean,
  health_data_consent_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    email, phone_number, referral_source,
    quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone,
    sms_notifications_enabled, email_notifications_enabled,
    announcement_notifications_enabled, reengagement_notifications_enabled,
    listener_training_progress, listener_training_progress_at,
    availability_schedule,
    consent_version, consent_accepted_at, age_confirmed,
    health_data_consent, health_data_consent_at
  from public.profiles
  where id = auth.uid();
$$;

revoke execute on function public.get_my_private_profile() from public, anon;
grant execute on function public.get_my_private_profile() to authenticated;

commit;
