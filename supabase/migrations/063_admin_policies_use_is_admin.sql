-- 063: fix 059's fallout. Ten RLS policies checked admin status by reading
-- profiles.is_admin inline:
--
--   exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
--
-- 059 revoked SELECT (is_admin) on profiles from anon and authenticated, so
-- for anyone who isn't the table owner that subquery now throws "permission
-- denied for table profiles" (Postgres reports a column-privilege failure
-- against the table). Permissive policies are all evaluated, so it doesn't
-- matter that another policy on the same table would have let the row
-- through: every query against these tables errors for a normal user.
--
-- What was broken from 22 Sep until this ran:
--   * Profile photo upload. Storage writes with INSERT ... ON CONFLICT DO
--     UPDATE, which evaluates the UPDATE policies on storage.objects too,
--     including the legacy blog-images one below.
--   * user_blocks reads. lib/blocks.ts getActiveBlock() ignores the error and
--     returns "not blocked"; validate_session_participants() and
--     protect_blocked_role_state() (041) still enforced blocks in the DB.
--   * user_notices reads. NoticeBanner showed nothing: reconnect follow-ups,
--     admin outreach and broadcasts never appeared in-app.
--   * Admin-only tables (admin_logs, broadcasts, notification_*) for any
--     client-side read; admin mutations go through the service role and
--     were unaffected.
--
-- Fix: use public.is_admin() (SECURITY DEFINER, so it can still read the
-- column), wrapped in (select ...) so it runs once per query. ALTER POLICY
-- keeps each policy's name, command and roles exactly as they were.
--
-- Rule going forward: never read profiles.is_admin inline in a policy. Call
-- public.is_admin().

alter policy "Admins can view and create logs" on public.admin_logs
  using ((select public.is_admin()));

alter policy "admins manage all posts" on public.blog_posts
  using ((select public.is_admin()));

alter policy "admins_read_broadcasts" on public.broadcasts
  using ((select public.is_admin()));

alter policy "admins_read_notification_kind_settings" on public.notification_kind_settings
  using ((select public.is_admin()));

alter policy "admins_read_notification_log" on public.notification_log
  using ((select public.is_admin()));

alter policy "admins_read_notification_queue" on public.notification_queue
  using ((select public.is_admin()));

alter policy "Admins can manage blocks" on public.user_blocks
  using ((select public.is_admin()));

alter policy "admins_read_all_notices" on public.user_notices
  using ((select public.is_admin()));

alter policy "users can delete own blog images" on storage.objects
  using (
    bucket_id = 'blog-images'
    and ((auth.uid())::text = (storage.foldername(name))[1] or (select public.is_admin()))
  );

alter policy "users can update own blog images" on storage.objects
  using (
    bucket_id = 'blog-images'
    and ((auth.uid())::text = (storage.foldername(name))[1] or (select public.is_admin()))
  );
