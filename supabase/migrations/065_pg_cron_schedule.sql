-- 065: run the cron routes from Supabase (pg_cron + pg_net) instead of
-- relying on GitHub Actions alone.
--
-- .github/workflows/cron.yml asks for */15, but GitHub throttles scheduled
-- workflows hard. Measured 28 Sep 2026 from the run history: about 7 runs a
-- day since at least 30 Aug, i.e. every 3-4 hours, and none for 7+ hours on
-- the day it was checked. Known Issue #12 assumed 15-35 minutes. At 3-4
-- hours:
--   * scheduled-availability matches windows that started within 90 minutes,
--     so most "your support time is starting" pushes never went out
--   * a pending direct connect sat for hours instead of timing out at 10 min
--   * stale "requesting" seekers and missed-connection follow-ups waited hours
--   * queued notifications (thank-you notes, broadcasts) waited hours
--
-- pg_cron fires on time. pg_net sends the HTTP call. The secret stays in
-- Supabase Vault under the name 'cron_secret' and is never written here:
--
--   select vault.create_secret('<same value as CLEANUP_SECRET_KEY in Vercel>', 'cron_secret');
--
-- Until that secret exists, ping_cron_routes() does nothing, so this is safe
-- to apply first. The GitHub workflow stays as a backup; every route is
-- idempotent, so an extra run costs a few cheap queries and cannot
-- double-notify anyone.
--
-- pg_net requests are asynchronous and run concurrently, so the "drain runs
-- last" ordering from cron.yml is kept by giving the drain its own job two
-- minutes after the others. Results land in net._http_response.

create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.ping_cron_routes(paths text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  secret text;
  p text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if secret is null then
    return;
  end if;

  foreach p in array paths loop
    perform net.http_post(
      url := 'https://recoverybridge.app' || p,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', secret,
        'x-cleanup-secret', secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  end loop;
end;
$$;

revoke all on function private.ping_cron_routes(text[]) from public, anon, authenticated;

-- Re-running this migration replaces the jobs rather than duplicating them.
select cron.unschedule(jobname)
from cron.job
where jobname in ('recoverybridge-cron-routes', 'recoverybridge-cron-drain');

select cron.schedule(
  'recoverybridge-cron-routes',
  '*/10 * * * *',
  $$select private.ping_cron_routes(array[
    '/api/scheduled-availability',
    '/api/cleanup-sessions',
    '/api/notifications/training-nudge',
    '/api/notifications/reengagement'
  ])$$
);

select cron.schedule(
  'recoverybridge-cron-drain',
  '2-59/10 * * * *',
  $$select private.ping_cron_routes(array['/api/notifications/drain'])$$
);
