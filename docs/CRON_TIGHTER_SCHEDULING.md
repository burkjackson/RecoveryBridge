# Cron: Tighter, More Reliable Scheduling (draft / for later)

> **Status:** Draft — not yet implemented. Written 2026-07-24.
> **Why:** GitHub Actions is currently the real cron driver (`.github/workflows/cron.yml`,
> nominal `*/15`). In practice GitHub throttles and drops scheduled runs — observed
> cadence is **1–2.5 hours between runs, not 15 minutes**, with occasional GitHub-side
> cancellations (e.g. run #241 on 2026-07-24 was cancelled before any step ran). Nothing
> is broken, but `scheduled-availability` only matches windows that started in the last
> ~20 min, so a 2-hour gap means some "your support time is starting" pushes never fire.

---

## What needs a reliable ~15-min tick

Two endpoints. Both accept **GET or POST**, and the secret via **either** a custom header
**or** `Authorization: Bearer <secret>`. The secret is `CLEANUP_SECRET_KEY` (same value
already in Vercel + the GitHub repo secret); `CRON_SECRET` also works if set.

| Endpoint | Custom header | Bearer alt | Sensitivity to lateness |
|----------|---------------|------------|-------------------------|
| `POST https://recoverybridge.app/api/scheduled-availability` | `x-cron-secret` | `Authorization: Bearer <secret>` | **High** — only catches windows started in last ~20 min |
| `POST https://recoverybridge.app/api/cleanup-sessions` | `x-cleanup-secret` | `Authorization: Bearer <secret>` | Low — thresholds are 10/30 min, tolerant of drift |

No code change is required for any option below — this is purely about the trigger.

---

## Options

### Option A — External cron pinger (recommended)

A dedicated cron service (e.g. **cron-job.org**, free; or Cronitor / EasyCron / UptimeRobot)
hits both URLs every 15 min. These services fire on time, retry on failure, and email on
outage — everything GitHub's scheduler doesn't do.

**Pros:** free, genuinely reliable 15-min cadence, zero code, built-in failure alerts.
**Cons:** the `CLEANUP_SECRET_KEY` lives in one more third-party dashboard (same trust level
as the existing GitHub secret). Rotate it if the service is ever compromised.

**Setup (cron-job.org example):**
1. Create a free account at https://cron-job.org.
2. Add cronjob #1:
   - URL: `https://recoverybridge.app/api/scheduled-availability`
   - Method: `POST`
   - Schedule: every 15 minutes
   - Request header: `x-cron-secret: <CLEANUP_SECRET_KEY value>`
   - Enable "notify on failure."
3. Add cronjob #2:
   - URL: `https://recoverybridge.app/api/cleanup-sessions`
   - Method: `POST`
   - Schedule: every 15 minutes
   - Request header: `x-cleanup-secret: <CLEANUP_SECRET_KEY value>`
   - Enable "notify on failure."
4. Trigger each once manually to confirm a `200`.
5. Once verified stable for a day, **disable the GitHub Actions workflow** (Actions tab →
   Cron pings → ••• → Disable workflow) so you're not double-firing. Keep the file in the
   repo as a fallback, or delete it — your call.

### Option B — Vercel Cron on a paid plan (in-house alternative)

Vercel **Hobby** caps crons at once/day, which is why the daily entries in `vercel.json`
exist as a backup. **Vercel Pro** ($20/mo) allows any cadence. If you're already paying
(or want everything in one platform), just tighten `vercel.json`:

```jsonc
{
  "crons": [
    { "path": "/api/cleanup-sessions",       "schedule": "*/15 * * * *" },
    { "path": "/api/scheduled-availability", "schedule": "*/15 * * * *" }
  ]
}
```

Vercel crons send `GET` with `Authorization: Bearer $CRON_SECRET`, which both routes
already accept. Set `CRON_SECRET` in Vercel env if not present.

**Pros:** fully in-house, no third-party secret, no GitHub dependency.
**Cons:** $20/mo just for cron cadence if you're otherwise fine on Hobby.

### Option C — Upstash QStash (middle ground)

Free tier (~500 messages/day, enough for two endpoints every 15 min = 192/day). Reliable
scheduler with retries. More setup than Option A for no real advantage here — listed only
for completeness.

---

## Recommendation

**Option A (external pinger).** Free, reliable, no code, and adds failure alerting we don't
currently have. Go to Option B only if you'd rather not put the secret in a third-party
dashboard and don't mind Vercel Pro.

After switching, disable the GitHub Actions workflow to avoid double-firing, and update the
cron section of `CLAUDE.md` to reflect the new driver and the real (now honest) cadence.

## Do-not-forget checklist when implementing

- [ ] Pick A or B.
- [ ] Confirm `CLEANUP_SECRET_KEY` (A) / `CRON_SECRET` (B) is set wherever the trigger lives.
- [ ] Manually fire both endpoints once; expect `200`, not `401`.
- [ ] Let it run ~24h; confirm even cadence.
- [ ] Disable `.github/workflows/cron.yml` (or delete it) to stop double-firing.
- [ ] Update `CLAUDE.md` cron section.
