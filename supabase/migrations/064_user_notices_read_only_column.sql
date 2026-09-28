-- 064: a user may only mark their own notice read, not rewrite it.
--
-- users_update_own_notices (026) scopes UPDATE to the recipient's own rows,
-- but authenticated held a table-level UPDATE grant (Supabase's default), so
-- a recipient could rewrite the title or body of a notice sent to them.
-- Those same rows are what the admin "Couldn't Connect" tab reads, and an
-- outreach notice is the record of what an admin actually said.
--
-- The only client write is NoticeBanner's dismiss, which sets read_at.
-- Every insert and delete runs on the service role (cron, admin actions).
-- Same fix shape as 055 on profiles: revoke the table-level grant, grant
-- back only the column the client needs (Known Issue #20 — a column-level
-- revoke under a table-level grant does nothing).

revoke update on public.user_notices from anon, authenticated;
grant update (read_at) on public.user_notices to authenticated;
