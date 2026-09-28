-- 067: let pg_cron (065) authenticate without anyone copying a secret around.
--
-- 065 needed the CLEANUP_SECRET_KEY value from Vercel in Vault, and it
-- couldn't be read from Vercel (the connector has no env-var access, and the
-- value wasn't available by hand either). Instead: generate a fresh secret
-- inside the database, and have the cron routes also accept it by asking the
-- database to compare. lib/cronAuth.ts authorizeCronRequest() calls
-- verify_cron_secret() only after the env-var secrets fail, and only the
-- service role may call it. The value is never printed, logged or returned.
--
-- The GitHub Actions and Vercel crons keep working unchanged on their env
-- var secrets. To rotate this one:
--   delete from vault.secrets where name = 'cron_secret';
-- then re-run the insert at the bottom.

create or replace function public.verify_cron_secret(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select candidate is not null
    and length(candidate) >= 32
    and exists (
      select 1 from vault.decrypted_secrets
      where name = 'cron_secret'
        and decrypted_secret = candidate
    );
$$;

revoke execute on function public.verify_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;

-- 32 random bytes as 64 hex characters, created only if none exists yet.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret', 'pg_cron -> Next.js cron routes (migration 067)')
where not exists (select 1 from vault.secrets where name = 'cron_secret');
