---
paths:
  - ".github/workflows/cron.yml"
  - "vercel.json"
  - "lib/cronAuth.ts"
  - "app/api/cleanup-sessions/**"
  - "app/api/scheduled-availability/**"
  - "app/api/notifications/drain/**"
  - "app/api/notifications/training-nudge/**"
  - "app/api/notifications/reengagement/**"
  - "supabase/migrations/*cron*"
---

# Cron

To check whether it's working, use the `check-cron-health` skill.

**Primary trigger: Supabase pg_cron** (migrations 065 and 067, see #67): every 10 minutes `private.ping_cron_routes()` calls the four routes below through `pg_net`, and the drain 2 minutes later, authenticated with the Vault secret `cron_secret` (checked by `public.verify_cron_secret()`; nobody ever sees the value). Check it with `select status_code, created from net._http_response order by created desc limit 10;`. **Backups:** the GitHub Actions workflow below (asks for every 15 minutes, really runs every 3-4 hours) and the daily Vercel crons. Every route is idempotent, so overlapping runs are harmless.

**The routes** (the same list `.github/workflows/cron.yml` pings as a backup):
- `POST /api/scheduled-availability` with `x-cron-secret` — notifies listeners whose availability window started within the last 90 min (wide because the cron cadence is unreliable), skipping anyone whose `last_availability_notify_key` already marks that occurrence, and never firing past the window's own end
- `POST /api/cleanup-sessions` with `x-cleanup-secret` — closes empty (>10 min) and inactive (>30 min) sessions, resets stale requesting seekers, and records a `reconnect` notice + warm push for any seeker whose request went unanswered. **Unanswered means the listener never replied**, not merely that no session row exists — see known issue #24
- `POST /api/notifications/training-nudge` with `x-cron-secret` — queues a nudge for anyone who started listener training and stalled 3+ days; monthly dedupe key
- `POST /api/notifications/reengagement` with `x-cron-secret` — queues the opt-in monthly check-in, and only when a listener is genuinely online
- `POST /api/notifications/drain` with `x-cron-secret` — **runs last**, so anything the two steps above queued goes out on the same tick. Delivers up to 200 queued rows, honouring category consent and quiet hours

Requires GitHub repo secret `CLEANUP_SECRET_KEY` (same value as Vercel env var). Daily Vercel crons in `vercel.json` remain as backup; the routes also accept `Authorization: Bearer <CLEANUP_SECRET_KEY|CRON_SECRET>` and answer GET (Vercel crons send GET). Cron-only (fixed 2 Sep 2026, see #36) — the dashboard used to also trigger it on every page load with any signed-in user's token; that path is gone.

## Rules for cron routes
- Every route must be idempotent, because the triggers overlap.
- Tolerate gaps: use a wide match window plus a dedupe key rather than assuming a run every 10 minutes.
- Cron routes authenticate through `lib/cronAuth.ts` only. Never accept a signed-in user's token (#36).
- A cron route must stop if a read fails, not treat it as an empty result. A failed message read could otherwise close every live chat or apologise to people who were helped (#60).
