-- public.reports has two SELECT policies for regular users:
--   "Users can view own reports"       — reporter_id = auth.uid()
--   "Users can view their own reports" — auth.uid() = reporter_id OR auth.uid() = reported_user_id
--
-- The second one is the actual bug: the OR lets a reported user read the
-- report filed against them, including reporter_id (who filed it),
-- description, and resolution_notes. Nothing in app/ reads reports as the
-- reported party — every UI path for reports is either the reporter's own
-- "my reports" view or the admin queue (gated separately by "Admins can
-- view all reports" / is_admin()). On a platform where people report
-- harassment, letting the reported party see who reported them and what
-- they wrote is a retaliation path, not a feature anyone asked for.
--
-- Dropping the wide policy leaves "Users can view own reports" as the only
-- non-admin SELECT path: a reporter can see their own filed reports, a
-- reported user sees nothing about reports against them, admins still see
-- everything via is_admin().

begin;

drop policy if exists "Users can view their own reports" on public.reports;

commit;
