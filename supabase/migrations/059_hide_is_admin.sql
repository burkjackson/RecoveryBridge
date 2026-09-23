-- 059: is_admin was readable on every profile by anyone signed in.
--
-- Review item #26: migration 040 revoked table-level SELECT on `profiles`
-- and granted it back column-by-column for the public-safe set — but
-- `is_admin` was in that column-by-column grant-back list. Confirmed live:
-- `information_schema.column_privileges` shows SELECT on `is_admin` for
-- both `anon` and `authenticated`. Any signed-in user (or anon, since it's
-- granted there too) could `select('is_admin').eq('id', someOtherUser)` and
-- get a straight yes/no on whether that person is an admin — a small but
-- real fact nobody but the admin themselves and other admins should be
-- able to read about someone.
--
-- Fix: revoke SELECT(is_admin) outright, add get_my_admin_status() for the
-- handful of places that legitimately need to know the CALLER's own
-- admin-ness (the /admin route gate in middleware.ts, the admin page's own
-- client-side re-check, and the small "Admin" badge profile/dashboard show
-- next to a user's own name). All three moved off a raw `.select('is_admin'
-- , ...)` to this RPC in the same round — see the app code.
--
-- is_admin stays fully readable through admin_logs-adjacent server routes
-- (loadUsers() in app/admin/page.tsx already goes through the service-role
-- /api/admin/* route, not a client select) and, as ever, to anyone with
-- is_admin = true via the RLS row policy that already exists for admins.
revoke select (is_admin) on public.profiles from anon, authenticated;

create or replace function public.get_my_admin_status()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(is_admin, false) from public.profiles where id = auth.uid();
$$;

revoke execute on function public.get_my_admin_status() from public, anon;
grant execute on function public.get_my_admin_status() to authenticated;
