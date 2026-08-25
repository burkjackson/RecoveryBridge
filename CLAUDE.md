# RecoveryBridge — Project Status Document

> **Last Updated:** August 2026
> **Purpose:** Get any Claude session up to speed on the entire app — architecture, features, current state, and known issues.

---

## What Is RecoveryBridge?

RecoveryBridge is a **peer-to-peer support platform for people in addiction recovery**. Users can be **seekers** (people needing support) or **listeners** (people offering support). They connect in real-time 1:1 chat sessions. Think of it as an anonymous, on-demand peer support hotline.

**Live URL:** https://recoverybridge.app (Vercel, auto-deploys from `main`)
**Note:** The GitHub repo (`burkjackson/RecoveryBridge`) is **public**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, React 18, TypeScript) |
| Database | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Styling | Tailwind CSS 3.4, custom theme, class-based dark mode |
| Push Notifications | web-push (VAPID) + Service Worker |
| Email | Resend (welcome, admin signup alerts, support-request fallback) |
| SMS (disabled) | Twilio (pending verification) |
| Error Tracking | Sentry (@sentry/nextjs) |
| Image Cropping | react-easy-crop |
| Hosting | Vercel |
| Cron | GitHub Actions (`.github/workflows/cron.yml`, every 15 min) + daily Vercel crons as backup |

---

## Project Structure

```
app/
├── api/
│   ├── heartbeat/route.ts            # POST: Update user's last_heartbeat_at
│   ├── cleanup-sessions/route.ts     # POST/GET: Auto-close stale sessions, reset stale seekers, expire temp blocks (cron)
│   ├── scheduled-availability/route.ts # POST/GET: Push "your support time is starting" (cron)
│   ├── notifications/send/route.ts   # POST: Push (+email fallback) to available listeners
│   ├── notifications/message/route.ts # POST: Push a new chat message to the other participant (if they aren't looking)
│   ├── notifications/thank-you/route.ts    # POST: Queue a "you got a thank-you note" push (server-verifies the feedback row)
│   ├── notifications/training-nudge/route.ts # POST/GET: Queue nudges for stalled listener training (cron)
│   ├── notifications/reengagement/route.ts   # POST/GET: Queue the opt-in monthly check-in (cron)
│   ├── notifications/drain/route.ts   # POST/GET: Deliver queued notifications, honouring prefs + quiet hours (cron)
│   ├── sessions/state/route.ts       # POST: Move BOTH participants' role_state on session start/end
│   ├── account/export/route.ts       # GET: Self-service data export (CCPA/GDPR)
│   ├── account/delete/route.ts       # POST: Self-service account deletion (service role → auth.admin.deleteUser)
│   ├── contact/route.ts              # POST: Public contact form (IP rate-limited)
│   ├── splash/route.tsx              # GET: Generated iOS PWA splash images (edge)
│   ├── email/welcome/route.ts        # POST: Send welcome email (Resend)
│   ├── webhooks/new-user/route.ts    # POST: Supabase webhook — admin new-user email (superseded by notify-signup; confirm no dashboard webhook still points here before removing)
│   └── admin/
│       ├── actions/route.ts          # POST: All admin mutations (verify token → is_admin, rate-limited)
│       ├── delete-user/route.ts      # POST: Admin user deletion
│       ├── notify-signup/route.ts    # POST: Admin signup-alert email (called from onboarding completion)
│       └── send-welcome-bulk/route.ts # POST: Welcome-email backfill for a NAMED set of recipients
├── admin/page.tsx                    # Admin moderation dashboard (~1,800 lines)
├── chat/[id]/page.tsx                # Real-time 1:1 chat (~1,700 lines)
├── connect/page.tsx                  # Notification-tap landing: verifies seeker, creates session, → /chat
├── dashboard/page.tsx                # Main hub: role selection, listeners, seekers, notifications
├── history/page.tsx                  # Past sessions + feedback/thank-you notes
├── training/page.tsx                 # Listener training modules (acknowledge sections → completion timestamp)
├── profile/page.tsx                  # Edit profile, tags, avatar, notification/availability settings
├── listeners/page.tsx                # Browse & filter available listeners, connect
├── onboarding/page.tsx               # Post-signup setup (role, bio, tags, referral source, guidelines)
├── login/ signup/ forgot-password/ reset-password/  # Auth pages
├── support/                          # 7 static SEO landing pages (peer support, recovery chat, …) + index
├── contact/ donate/ safety/ terms/ privacy/ offline/ # Static-ish pages
├── support/                          # 7 public SEO landing pages (peer support, recovery chat, etc.)
├── layout.tsx                        # Root layout: PWA metadata, CrisisResources, theme, service worker
├── page.tsx                          # Landing page (FAQ accordion, product preview popup)
└── sitemap.ts                        # Generated sitemap

components/
├── AvailableListeners.tsx            # Real-time list of online listeners (dashboard, connect flow)
├── PeopleSeeking.tsx                 # Real-time list of seekers needing help (for listeners)
├── NotificationSettings.tsx          # Push toggle, Always Available, Quiet Hours, availability schedule
├── NotificationInstructionsModal.tsx # iOS PWA installation guide
├── BottomNav.tsx                     # Mobile bottom navigation
├── ThemeProvider.tsx / ThemeToggle.tsx # Class-based dark mode
├── ToastProvider.tsx                 # Toast notifications
├── FaqAccordion.tsx / ProductPreview.tsx / SocialIcons.tsx # Landing page
├── AvatarUpload.tsx                  # Image upload with crop (Supabase Storage)
├── CrisisResources.tsx               # Floating 988/crisis button (always visible)
├── NoticeBanner.tsx                  # Surfaces unread in-app notices (user_notices) on the dashboard
├── BroadcastComposer.tsx             # Admin: compose/send a platform announcement to a named audience
├── NotificationControls.tsx          # Admin: per-kind on/off switches for what the platform may send
├── TagSelector.tsx / Modal.tsx / ErrorState.tsx / Skeleton.tsx / Footer.tsx
├── ServiceWorkerRegistration.tsx / SkipLink.tsx
└── ui/Typography.tsx                 # Semantic type scale (Heading1..., Body16, Body18)

lib/
├── constants.ts                      # Timing, validation, tags, reactions, timezones, parseReferralSource, outreach + notification copy, broadcast audiences, training sections
├── email.ts                          # Resend senders: support-request fallback, contact form, report-resolved
├── email/welcomeEmailHtml.ts         # Welcome email template
├── email/escapeHtml.ts               # HTML escaping for user-supplied values in emails
├── timeWindows.ts                    # Quiet-hours + availability-window maths (pure, unit-tested)
├── rateLimit.ts                      # Shared in-memory limiter used by every API route
├── blocks.ts                         # getActiveBlock() — ignores lifted AND expired blocks
├── sessionState.ts                   # Client helper → /api/sessions/state
├── serverPush.ts                     # Shared server-side web-push sender (single-user + batched)
├── notificationQueue.ts              # Queue for every non-support push: categories, consent + quiet-hours rules, enqueue
├── cronAuth.ts                       # Shared cron-secret / Bearer auth for the cron API routes
├── favorites.ts                      # normalizeFavorites() — RLS-safe favorite handling (see Known Issues)
├── errors.ts                         # errorMessage() for `catch (e: unknown)`
├── faqs.ts                           # Landing page FAQ content
├── pushNotifications.ts              # Web Push subscribe/unsubscribe
├── linkify.tsx                       # Safe URL autolinking in chat
├── sms.ts                            # Twilio sender (feature disabled)
├── supabase/client.ts, server.ts
├── types/database.ts
└── *.test.ts                         # Vitest: constants, favorites, timeWindows, rateLimit, errors

supabase/
├── migrations/                       # 001–036, numbered (note: two files share 004) — see migrations/README.md
└── legacy/                           # Pre-migration setup SQL (historical snapshot; the live policy set has
                                      #   drifted — query pg_policies for the truth, see migrations/README.md)

docs/                                 # Setup guides + dated historical snapshots (each labelled); all intentionally public
scripts/                              # Ad-hoc admin scripts (get-user-emails.js, DEPLOY.sh)
public/sw.js                          # Service worker (push, cache — bump CACHE_NAME on breaking changes; currently v11)
middleware.ts                         # Route protection (auth + admin check)
.github/workflows/cron.yml            # 15-min pings to cron API routes
.github/workflows/ci.yml              # Typecheck, lint, test, build on every push (no secrets needed)
```

---

## Database Schema (high level)

Migrations live in `supabase/migrations/` (001–036) and are the source of truth. Summary:

### profiles (central user table)
Core: `id` (= auth.users.id), `display_name` (unique), `email`, `bio`, `tagline`, `avatar_url`, `tags` (max 5), `is_admin`.
State: `role_state` (`available`/`requesting`/`offline`/null), `user_role` (`person_in_recovery`/`professional`/`ally`), `last_heartbeat_at`.
Notifications: `always_available`, `quiet_hours_*` (enabled/start/end/timezone), `email_notifications_enabled` (008), `phone_number` + `sms_notifications_enabled` (006, feature disabled), `availability_schedule` JSONB windows (020), `last_availability_notify_key` (027, dedupes the "support time is starting" push — `"YYYY-MM-DD|day|HH:MM"` in the user's timezone), `announcement_notifications_enabled` (035, default **true** — thank-you notes, training nudges, broadcasts) and `reengagement_notifications_enabled` (035, default **false** — the opt-in monthly check-in). Neither governs support-request pushes, which keep the original push toggle.
Training: `listener_training_progress` JSONB + `listener_training_progress_at` (035, per-section acks so progress survives a reload and the nudge cron can tell stalled from in-progress).
Compliance/audit: `referral_source` (010, free text since 018), `listener_training_completed_at` (019), `consent_version` + `consent_accepted_at` (021), `age_confirmed` (022), `health_data_consent` + `_at` (023, WA My Health My Data).

### Other tables
- **sessions** — listener_id, seeker_id, status (`active`/`ended`), ended_at. A unique partial index (025) enforces **one active session per seeker**, so a duplicate insert fails with `23505` and callers fall back to "someone else just connected"
- **messages** — session_id, sender_id, content (max 2000), read_at (002, read receipts)
- **message_reactions** — 8 emoji types (003/004)
- **session_feedback** — helpful boolean + `thank_you_note` (009, max 300 chars, shown in /history)
- **user_favorites** (007) — favorite contacts from past sessions; favorites get notified first
- **reports / user_blocks / admin_logs** — moderation + audit trail (`user_blocks.expires_at` is honoured by `lib/blocks.ts` and swept by the cleanup cron)
- **user_notices** (026) — in-app messages to a *user*: auto "we couldn't connect you" follow-ups (`kind='reconnect'`), admin outreach (`kind='outreach'`), broadcasts (`kind='announcement'`)
- **push_subscriptions** — Web Push endpoints per user/device
- **notification_queue** (035) — one row per recipient per non-support notification (thank-you note, training nudge, check-in, broadcast). Drained by `/api/notifications/drain`; `dedupe_key` + a partial unique index make every enqueue idempotent, `not_before` doubles as a quiet-hours deferral and a claim lease
- **broadcasts** (035) — audit record for an admin announcement; queue rows hang off it
- **notification_kind_settings** (036) — the admin on/off switch per notification kind. Absent row = off; unreadable = everything off
- **user_notices** (026) — in-app messages to a *user* (not an email): `kind` is `reconnect` (auto follow-up when a seeker never got connected) or `outreach` (personal note from an admin). Surfaced by `NoticeBanner` on the dashboard; the admin "Couldn't Connect" tab reads the `reconnect` rows
- **blog/story tables** (011–015) — **legacy**: stories moved to Ghost at stories.recoverybridge.app; no in-app UI reads them

All tables have RLS. Admin mutations go through `/api/admin/*` routes (Bearer token → `getUser` → `is_admin` check), not client-side Supabase.

---

## Core User Flows

### 1. Seeker requesting support
1. "I Need Support" → `role_state = 'requesting'`, push fires to available listeners
2. Seeker stays on dashboard with "Finding Listener..."; heartbeat every 30s
3. Re-notification after 2 min without connection (max 3)
4. Listener connects (PeopleSeeking, dashboard list, /listeners, or notification tap → `/connect?seekerId=`)
5. Seeker auto-navigates to `/chat/[sessionId]` via realtime subscription

### 2. Listener flows
- "I'm Here To Listen" → `role_state = 'available'`, visible in lists
- Seekers can also directly connect from the dashboard listener list or /listeners (two-step confirm); the listener gets a distinct "🎯 Direct Connection Request" push/email
- Listener training (/training) nudged from dashboard; completion recorded on profile
- Optional weekly availability schedule → "your support time is starting" push at window start

### 3. Chat session
- Realtime messages (postgres_changes), typing indicators + read receipts (broadcast), reactions (double-click, 8 types), URL autolinking, conversation starters, crisis-language banner
- Inactivity: warn at 15 min, auto-close 5 min later; either party can end → feedback modal (helpful? + optional thank-you note) → favourite prompt → dashboard
- Session start/end moves BOTH participants' `role_state` via `/api/sessions/state` (see Known Issues #10)
- Report flow (3-step) available in chat

### 4. Notification system (in priority order)
1. **Push** (VAPID web-push): favorites of the seeker get a personalized push first, general listeners 4s later; invalid subscriptions (4xx) auto-removed. Favourites are resolved **server-side** from `user_favorites` — the client's list is RLS-filtered and silently omits offline favourites
2. **Email fallback** (Resend): listeners who opted in (`email_notifications_enabled`) and didn't get a successful push
3. **SMS fallback**: fully coded but disabled pending Twilio verification
- Server-side quiet-hours filtering (listener's local time); rate limit 3 req/60s per user (in-memory — see Known Issues)
- Targets: `role_state = 'available'` OR `always_available = true`

**Separate from the above:** `/api/notifications/message` pushes a *new chat message* to the other participant of an active session, suppressed if they're already looking at the chat (server checks whether the message got marked read; the service worker also suppresses on window visibility). Deliberately skips quiet hours — it's a live conversation the recipient already opted into.

**Everything that isn't a support request goes through the queue** (`notification_queue`, migration 035), not an inline send:

| Message | Category | Queued by | Governed by |
|---------|----------|-----------|-------------|
| You received a thank-you note | `announcement` | `/api/notifications/thank-you`, from the post-session feedback modal | `announcement_notifications_enabled` (default on) |
| Finish your listener training | `announcement` | `/api/notifications/training-nudge` (cron) | same; only for people who started and stalled 3+ days |
| Admin broadcast | `announcement` | `send_broadcast` admin action | same; also writes a `user_notices` row so it lands without push |
| "It's been a while" check-in | `reengagement` | `/api/notifications/reengagement` (cron) | `reengagement_notifications_enabled` (default **off**, opt-in) |

**Every kind is behind an admin switch** (`notification_kind_settings`, migration 036), separate from the per-recipient consent above — that one asks "does this person want it", this one asks "do we want it going out at all yet". Both must say yes. The three automatic kinds ship **off**; `broadcast` ships **on** because it cannot fire without an admin composing and sending. Managed in Admin → Notifications.

The switch is enforced in three places, and all of them matter: `enqueueNotifications` won't create rows for a disabled kind, the drain re-checks at delivery (so switching off *cancels* an existing backlog rather than letting it drain), and `send_broadcast` checks before writing its `user_notices` rows. It fails closed — an unknown kind, or an unreadable settings table, sends nothing.

`/api/notifications/drain` delivers them on the shared cron: it re-checks consent at send time, **defers** anything landing in the recipient's quiet hours (moves `not_before` forward rather than dropping it), retires rows past `expires_at`, and prunes terminal rows after 30 days.

Three rules worth keeping:
1. **Never fold these into the support-request toggle.** Someone who mutes push to escape an announcement also stops hearing that a person needs support. That's why the categories are separate preferences and why support requests keep the original toggle.
2. **Push text renders on a locked phone.** Nothing in `NOTIFICATION_COPY` names the other person, quotes what they wrote, or implies why the recipient uses RecoveryBridge.
3. **Don't bake a live count into a queued body.** The check-in deliberately says "listeners are around", not "3 listeners are online" — the queue can drain 35+ minutes later (longer through quiet hours), by which time a number is a lie.

### 5. Admin moderation (/admin)
Tabs for reports, blocks, sessions, users, sign-ups (with referral source), "Couldn't Connect", and Broadcast (`components/BroadcastComposer.tsx` — pick a named audience, preview its size and how many can receive a push, send) (`missed` — seekers whose request went unanswered, from `user_notices`; an admin can send them a personal note). All mutations via `/api/admin/actions` (server-verified `is_admin`, rate-limited, audit-logged including transcript views).

---

## Cron Jobs (fixed July 2026)

**Primary trigger: GitHub Actions** (`.github/workflows/cron.yml`) — every 15 minutes, pings:
- `POST /api/scheduled-availability` with `x-cron-secret` — notifies listeners whose availability window started within the last 90 min (wide because the cron cadence is unreliable), skipping anyone whose `last_availability_notify_key` already marks that occurrence, and never firing past the window's own end
- `POST /api/cleanup-sessions` with `x-cleanup-secret` — closes empty (>10 min) and inactive (>30 min) sessions, resets stale requesting seekers, and records a `reconnect` notice + warm push for any seeker whose request went unanswered. **Unanswered means the listener never replied**, not merely that no session row exists — see known issue #22
- `POST /api/notifications/training-nudge` with `x-cron-secret` — queues a nudge for anyone who started listener training and stalled 3+ days; monthly dedupe key
- `POST /api/notifications/reengagement` with `x-cron-secret` — queues the opt-in monthly check-in, and only when a listener is genuinely online
- `POST /api/notifications/drain` with `x-cron-secret` — **runs last**, so anything the two steps above queued goes out on the same tick. Delivers up to 200 queued rows, honouring category consent and quiet hours

Requires GitHub repo secret `CLEANUP_SECRET_KEY` (same value as Vercel env var). Daily Vercel crons in `vercel.json` remain as backup; both routes also accept `Authorization: Bearer <CLEANUP_SECRET_KEY|CRON_SECRET>` and answer GET (Vercel crons send GET). The dashboard also triggers cleanup on page load.

---

## Key Constants

See `lib/constants.ts` (source of truth). Highlights: heartbeat 30s ping / 1h online threshold (5 min for PeopleSeeking freshness), inactivity warn 15 min + close 5 min later, re-notify every 2 min max 3×, seeker requesting state goes stale after 30 min, message max 2000 chars, 18 specialty tags (max 5), 8 reaction emoji, 44 timezones (worldwide — US, Canada, Latin America, Europe, Middle East/Africa, Asia-Pacific), `parseReferralSource()` helper.

---

## Environment Variables

### Required
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_SUBJECT
CLEANUP_SECRET_KEY                 # Cron auth (also a GitHub Actions secret)
RESEND_API_KEY                     # Email (welcome, fallback notifications, admin alerts)
```

### Optional
```
CRON_SECRET                        # Alternate cron secret (Vercel sends as Bearer if set)
NEXT_PUBLIC_SITE_URL               # Auth redirect base (signup confirm, password reset); falls back to window.location.origin
ADMIN_NOTIFICATION_EMAIL / SUPABASE_WEBHOOK_SECRET   # new-user webhook route
NEXT_PUBLIC_SENTRY_DSN / SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER   # SMS (disabled)
```

---

## Middleware & Auth

`middleware.ts` protects `/dashboard`, `/chat`, `/profile`, `/listeners`, `/training`, `/history` (→ `/login?redirect=`), `/onboarding` (→ `/signup`), and `/admin` (requires `is_admin`, else → `/dashboard`). Uses `@supabase/ssr` cookie sessions.

---

## Design System

- Brand colors (`tailwind.config.js`): rb-dark #2D3436, rb-gray #4A5568, rb-blue #4A6A7C (light #E8EEF2, hover #3A5A6C, dark #2E4754), rb-purple #B8A9C9 (light #E8E4F0) — all WCAG AA
- Semantic type scale via `components/ui/Typography.tsx` and heading CSS classes
- Class-based dark mode (ThemeProvider/ThemeToggle); dim greys bumped to gray-300 for legibility
- Button hierarchy: primary = solid rb-blue, secondary = light outline, destructive = red
- `prefers-reduced-motion` respected globally; 44px touch targets; skip link; crisis button always visible
- PWA: installable, standalone, start_url /dashboard; iOS needs Add to Home Screen before enabling push

---

## Current Feature Status

Everything in the flows above is ✅ live, including: auth, onboarding (with referral source + consent capture), real-time chat (reactions, read receipts, typing, linkify, crisis banner), push + email notifications, new-message pushes, favorites-first notification priority, quiet hours, always-available, re-notifications, listener directory, listener training, availability schedules, session history + thank-you notes, feedback, reporting, admin dashboard (incl. sign-ups and "Couldn't Connect" tabs), in-app notices, public contact form, SEO support pages, account deletion (server-side, `/api/account/delete`) + data export, PWA, dark mode, Sentry, session cleanup.

| Feature | Status | Notes |
|---------|--------|-------|
| SMS fallback | 🔇 Disabled | Code complete; Twilio verification pending (see below) |
| In-app blog/stories | 🚚 Moved | Now on Ghost (stories.recoverybridge.app); DB tables 011–015 are legacy |
| GitHub Actions cron | ✅ Running | 1,000+ consecutive successful runs; needs the `CLEANUP_SECRET_KEY` repo secret to stay set or runs 401 |
| In-app notices | ✅ Live | Auto follow-up after a failed connection + admin outreach (`user_notices`, `NoticeBanner`) |
| Unread-message push | ✅ Live | `/api/notifications/message` — pushes the other participant only when they aren't looking at the chat |
| SEO support pages | ✅ Live | Seven static pages under `/support`, listed in `app/sitemap.ts` |
| Thank-you-note push | ✅ Live | Queued from the feedback modal; server re-reads the note from `session_feedback` |
| Training nudge push | ✅ Live | Only for people who started training and stalled 3+ days; monthly cap |
| Re-engagement check-in | ✅ Live | Opt-in (default off), monthly cap, only sent when listeners are online |
| Admin broadcast | ✅ Live | Admin → Broadcast tab; push + in-app notice to a named audience |
| Notification categories | ✅ Live | Announcements (default on) and check-ins (opt-in), separate from support-request push |
| Admin send switches | ✅ Live | Admin → Notifications. Automatic kinds ship **off**; flipping one off also cancels its queued backlog |

---

## Known Issues & Technical Debt

1. **Migrations 020 and 027–035 are applied** (24 Aug 2026) — admin-flag protection, one-active-session-per-listener, session-participant validation, temporary-block expiry, the `role_state='requesting'` SELECT policy, the availability-notify dedupe key, profile visibility for people you already know (033), the notification log (034), the notification queue with its per-category consent (035), and — long overdue — `020_availability_schedule`, which had never been run. See `supabase/migrations/README.md` for what each does and how it was verified. `032` fixed a live outage: no non-admin listener could see anyone requesting support, so People Seeking was empty and every notification tap said "This person is no longer waiting for support".
2. **Check that a migration was actually applied, not just written** — `020_availability_schedule` sat unapplied for months. The old scheduled-availability route destructured only `data` from its query, so the "column does not exist" error was discarded and every run returned `{"notified": 0}` with a 200. The cron reported 1,000+ consecutive successes while the whole feature was inert. `supabase/migrations/README.md` now tracks what is applied; verify with `list_migrations` or by checking for the column, never by the file existing.
3. **Session creation is now validated in the database** — a `BEFORE INSERT` trigger on `sessions` requires the counterpart to be `available`/`always_available` (seeker-initiated) or `requesting` (listener-initiated), and rejects blocked creators. If a new connect path ever needs different rules, change `validate_session_participants()`, not just the client.
4. **`supabase/legacy/*.sql` is a stale snapshot** — policies edited in the Supabase dashboard never came back to the repo, so the files there do not describe the live database. Query `pg_policies` before reasoning about RLS (query in `supabase/migrations/README.md`).
5. **In-memory rate limiter** — `lib/rateLimit.ts` is shared by every route but its counters live in one serverless instance's memory, so they reset on cold start and aren't shared across instances. Move to Postgres or KV if it ever needs to be authoritative.
6. **SMS feature disabled** — all code written but commented out in `app/api/notifications/send/route.ts` and profile page (the unused `savingSms`/`smsSuccess`/`smsError` state and `handleSaveSms` are kept alongside it, with eslint-disables). Re-enable: uncomment both, add Twilio env vars, redeploy.
7. **Large page components** — admin (~1,840), chat (~1,720), profile (~1,400), dashboard (~1,270) lines, and still growing; extract components before major changes. The Broadcast tab was built as `components/BroadcastComposer.tsx` rather than more admin-page lines — keep doing that.
8. **Legacy blog tables** — migrations 011–015 create story tables no longer read by the app (stories moved to Ghost). The story email senders have been removed from `lib/email.ts`; the tables themselves are still there.
9. **Public repo** — the breach-response plan (marked "Internal — Do Not Publish") was removed from `docs/` in Aug 2026; it lives outside the repo now, so keep maintaining it there (the FTC Health Breach Notification Rule expects a written plan). Everything still in `docs/` is intentionally public: setup guides, plus dated audits whose findings are fixed. Note that git history still contains the removed file — the repo has always been public, so treat anything ever committed as disclosed.
10. **A direct connect opens the room before anyone is in it** — tapping Connect on a listener creates the session immediately and notifies them *after*. The listener list admits anyone with a heartbeat inside the 1-hour window, so "available" can mean "was here 50 minutes ago". Measured 25 Aug: a seeker direct-connected, waited 84 seconds, left; the push had fired correctly 1 second after the session was created and the listener opened it 13 minutes later. Both sides behaved reasonably. The confirm dialog now states last-active and that a reply may take minutes, and the seeker sees a waiting note until the listener's first message. If this still bites, the next lever is tightening the freshness window for who is offered for direct connection — not the notification, which works.
11. **Service worker cache** — `CACHE_NAME` in `public/sw.js` (currently v11); bump on breaking asset changes.
12. **Cron cadence is unreliable (worked around, not solved)** — GitHub Actions throttles the nominal `*/15` schedule. Measured 2026-08-24 over 30 consecutive runs: gaps of min 14m / median 21m / max 35m. `scheduled-availability` absorbs this with a wide match window plus a per-occurrence dedupe key. Anything else added to `cron.yml` must tolerate ~35 min between runs — don't assume 15.
13. **RLS-null embeds crash render (⚠️ gotcha when writing profile joins)** — Supabase relation embeds like `favorite_profile:profiles!fkey(...)` are *non-inner* joins, so row-level security returns the embedded object as **`null`** (it does not drop the parent row) whenever the viewer can't read that profile. The `profiles` SELECT policies expose a profile that is your own, currently `role_state = 'available'` or `'requesting'`, someone you share **any** session with (past or present, since migration 033), someone you have favourited, or anything at all if you're admin — so an embed only comes back null for a genuine stranger now. The guards stay: the null case is one policy change away from returning, and it fails as a render crash rather than a missing name. Dereferencing it (`fp.display_name`) throws during render and trips the error boundary ("Dashboard couldn't load"). **Always guard embedded profiles**: dashboard + profile favorites route through `lib/favorites.ts` `normalizeFavorites()`; profile thank-you notes, history, dashboard sessions, and admin all use `?.display_name || 'fallback'`. Use `!inner` only if you actually want RLS to filter the whole row instead.
14. **A client can only write its own profile row (⚠️ second RLS gotcha)** — `update(...)` against another user's row silently affects zero rows and returns **no error**. That's a footgun for anything that moves both chat participants at once; those transitions go through `/api/sessions/state` with the service role. Same shape of bug applies to any "delete my own X" that has no DELETE policy — a zero-row delete looks like success (this is what made self-service account deletion silently do nothing before `/api/account/delete` existed).
15. **`next` is pinned below 16** — postcss and sharp inside next 15 carried high advisories; both are pinned to patched versions via `overrides` in package.json. `npm audit` is clean, but revisit the overrides whenever next is upgraded.
16. **Logos still use `<img>`** — seven sites carry an eslint-disable rather than `next/image`, because the responsive `w-auto` sizing fights next/image's required dimensions. Worth converting deliberately for LCP.
17. **Stale `available` listeners — measure before resetting** — 14 profiles sit at `role_state='available'` with heartbeats hours to months old. Every list hides them (they filter on a 1-hour heartbeat), but `/api/notifications/send` targets `role_state='available'` with no freshness check. Resetting them looks obvious and mostly isn't: as of 24 Aug, 8 of the 11 non-always-available ones have neither push nor email enabled, so they receive nothing at all — the "reach" being preserved is 2 push and 3 email recipients. Whether that reach converts is now instrumented (`notification_log`, migration 034); run `supabase/queries/push_conversion.sql` after a few weeks and decide from the numbers. There is also an unused `cleanup_stale_availability()` function in the database from migration 017 that does the reset if you want it.
18. **Admin accounts hide RLS bugs (⚠️ third RLS gotcha)** — the `is_admin()` SELECT policies let an admin read every profile, so a *missing* read policy looks perfectly fine when the owner tests it. Always check user-facing flows with a second, non-admin login. This is exactly how #1 survived in production. To test a policy without a second account, impersonate inside a rolled-back transaction: `set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true)` then `set local role authenticated` (full recipe in `supabase/migrations/README.md`).
19. **Queued notifications are only as timely as the cron** — `notification_queue` is drained by `/api/notifications/drain` on the shared 15-minute GitHub Actions schedule, which really means gaps of up to ~35 minutes (issue #11), plus up to 30 more minutes per quiet-hours deferral. That is by design — nothing in the queue is urgent — but it rules the queue out for anything that is. Support requests and chat messages stay on their direct paths for exactly this reason; don't move them.
20. **The queue drain has no Vercel backup** — `vercel.json` still lists only `cleanup-sessions` and `scheduled-availability` as daily backup crons; `/api/notifications/drain` runs on GitHub Actions alone. If that workflow ever stops (a rotated `CLEANUP_SECRET_KEY`, or GitHub disabling the schedule after a long gap in repo activity), queued notifications stall and quietly expire after 3 days rather than piling up — a soft failure, but a silent one. Adding drain to `vercel.json` is the fix; check the plan's cron-job limit first, since there are already two and Vercel Hobby caps how many you get. Watch the "Cron pings" workflow, not the queue, to know it's alive.
21. **Listener supply is the real constraint, and two accounts dominate the silence (measured 25 Aug 2026)** — before optimising matching, know the shape of the pool. **Three** listeners have ever replied to anyone, all time; the same three in the last 30 days and the last 7. Only **22 of the last 720 hours** contained a single listener reply. Meanwhile two `always_available` accounts with push enabled account for **44 of the 96** sessions where someone wrote and got nothing back — `92aaf408` has sent **0 messages ever, in any role**, across 22 sessions, and `16b5c3e2` has sent 2 across 28. Both are trained. Both keep receiving support pushes because `/api/notifications/send` targets `always_available` with no freshness check (issue #17), and tapping that push creates the session immediately via `/connect`, which consumes the seeker before the listener has shown any intent to talk. **Do not tighten the direct-connect freshness window to fix this**: measured the same day, the list held 1 listener at the current 60-minute threshold and 0 at 30, 15 or 5 minutes. It is not a staleness problem. The levers that would actually help are (a) stop notifying accounts that never respond, (b) make `/connect` confirm intent before creating the session, (c) recruit listeners.
22. **"Connected" is not the same as "helped" (⚠️ the metric that was lying)** — a `sessions` row only means a listener tapped connect. Measured 25 Aug 2026 across 202 sessions: 48 real two-way conversations, 45 where nobody spoke, and **96 where the seeker wrote and the listener never replied**. Until that date the missed-connection follow-up excluded anyone with *a session*, so those 96 people were counted as helped, got no follow-up, and never appeared in the admin "Couldn't Connect" list. `lib/missedConnections.ts` now defines connected as *the listener actually replied*, and the cleanup cron sweeps recently-ended sessions as well as stale `requesting` seekers — the latter alone can never catch this, because ending a session moves the seeker to `offline`. **Any future query about whether people are being helped must count listener replies, not session rows.** The underlying question — why half of connects go unanswered — is still open; short session durations (median 98s unanswered vs 342s answered, 18 under 30s) suggest sessions ending before the listener can type, mechanism not yet identified.
23. **A broadcast can't be unsent** — `send_broadcast` writes a `user_notices` row per recipient immediately and queues the pushes, so by the time anyone notices a typo some of it has landed. There is no recall, and the composer says so before you confirm. If recall ever matters, the hook is deleting the broadcast's still-`pending` queue rows (the `user_notices` rows would need clearing separately).

---

## Quality Gates

All of these are clean as of August 2026 — keep them that way:

```
npm test          # vitest — 75 tests across constants, favorites, timeWindows, rateLimit, errors, sessionState, missedConnections, notificationQueue
npx tsc --noEmit  # no type errors
npx eslint .      # 0 errors, 0 warnings
npm audit         # 0 vulnerabilities
npm run build     # succeeds with NO server secrets set (clients are built per-request, never at module scope)
```

That last point matters: never construct a Resend or service-role Supabase
client at module scope in a route. Next imports every route during the build's
page-data collection, and a constructor that throws on a missing key turns one
absent env var into a failed deploy for the whole site.

Effects with deliberately trimmed dependency arrays carry an explicit
`// eslint-disable-next-line react-hooks/exhaustive-deps -- <reason>`. Keep that
convention so a genuinely new warning stands out instead of joining a pile.

---

## Git & Deploy Workflow

- **`main` auto-deploys to production** on Vercel (project `recovery-bridge`, team `burkjacksons-projects`)
- **CI runs on every push** (`.github/workflows/ci.yml`): typecheck → lint → test → build. It needs no secrets — API routes construct their Resend/Supabase clients per request, so keep them out of module scope or the build breaks in CI and on Vercel alike
- Solo project: commit to `main` directly or merge worktree branches to main — **never open PRs**
- Domains: recoverybridge.app (+www), stories.recoverybridge.app (Ghost)

---

## Working Notes (preferences from Burk)

- **Email drafts for manual sending (Gmail):** write plain linear text only — short paragraphs, one instruction per line, full URLs written out. No Markdown structure (bold markers, numbered lists with inline links, arrows, tables); it collapses into unreadable columns when pasted into Gmail.
