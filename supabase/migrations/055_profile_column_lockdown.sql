-- 055: limit which profiles columns a signed-in user can write.
--
-- 040 narrowed what a client can READ on profiles, but UPDATE was still a
-- table-level grant, so the "Users can update own profile" policy let a user
-- set ANY column on their own row from the browser console:
--   * consent_version / consent_accepted_at / age_confirmed /
--     health_data_consent / health_data_consent_at: 047 moved consent capture
--     server-side, but a user could still overwrite the record afterwards, so
--     the consent audit trail (WA My Health My Data) could be forged.
--   * email: the listener email fallback and report-resolution emails send
--     to profiles.email, so a user could point it at a stranger and have
--     RecoveryBridge email that person about seekers asking for support.
--   * last_availability_notify_key and anything added to profiles later.
--
-- Same pattern as 040 (see CLAUDE.md #20: a table-level grant beats a
-- column-level revoke, so the table-level grant has to go and the allowed
-- columns come back one by one). The list below is every column the app's
-- own client code writes, checked by grep on 22 Sep 2026. Server routes use
-- the service role and aren't affected. A new client-editable column must be
-- added to this grant or its update will fail with "permission denied".
--
-- Also drops INSERT/DELETE/TRUNCATE/TRIGGER/REFERENCES, which anon and
-- authenticated held from Supabase's defaults. Profiles are created by
-- handle_new_user() (SECURITY DEFINER) and deleted through the service role;
-- nothing in the app inserts or deletes one from the browser.
--
-- Checked 22 Sep 2026 before applying: every profiles.email matched its
-- auth.users email (127 of 127), so nothing had been tampered with.

revoke insert, update, delete, truncate, trigger, references
  on table public.profiles from anon, authenticated;

grant update (
  display_name, tagline, bio, tags, avatar_url, user_role,
  role_state, last_heartbeat_at, always_available,
  quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone,
  email_notifications_enabled, phone_number, sms_notifications_enabled,
  availability_schedule,
  announcement_notifications_enabled, reengagement_notifications_enabled,
  listener_training_progress, listener_training_progress_at,
  listener_training_completed_at,  -- still guarded by protect_training_completion (047)
  referral_source
) on public.profiles to authenticated;

-- profiles.email is no longer client-writable, so keep it in step with the
-- account's real email if that ever changes (Supabase email change flow, or
-- an edit in the dashboard).
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_profile_email() from anon, authenticated, public;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  execute function public.sync_profile_email();
