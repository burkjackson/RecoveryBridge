---
name: check-cron-health
description: Check that RecoveryBridge's scheduled jobs are really running. Use when pushes, session cleanup, queued notifications or availability reminders seem late or missing, or when asked about cron status.
---

# Check cron health

pg_cron is the primary trigger. GitHub Actions and the daily Vercel crons are backups.

1. **Confirm the jobs exist.** Expect `recoverybridge-cron-routes` (`*/10 * * * *`) and `recoverybridge-cron-drain` (`2-59/10 * * * *`):

```sql
select jobname, schedule, active from cron.job;
```

2. **Check recent responses.** Expect mostly 200s, about 30 calls per hour:

```sql
select status_code, count(*) from net._http_response
where created > now() - interval '6 hours'
group by status_code;
```

3. **Interpret the result.**
   - 401s: compare `lib/cronAuth.ts` `authorizeCronRequest()` with the Vault secret `cron_secret` and `public.verify_cron_secret()`. Nobody should ever print the secret.
   - No rows: look at `cron.job_run_details` for failures.
   - 200s but nothing delivered: read the route's response, then check `notification_kind_settings` and `notification_queue`. A 200 with `{"notified": 0}` once hid a broken feature for months, so don't treat 200 as proof the feature works.
4. **Check the backups only if relevant.** GitHub's "Cron pings" workflow needs the `CLEANUP_SECRET_KEY` repo secret or its runs return 401. It's throttled to every few hours, which is normal.
