# RecoveryBridge — Project Status Document

> **Last Updated:** July 2026
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
│   ├── cleanup-sessions/route.ts     # POST/GET: Auto-close stale sessions, reset stale seekers (cron)
│   ├── scheduled-availability/route.ts # POST/GET: Push "your support time is starting" (cron)
│   ├── notifications/send/route.ts   # POST: Push (+email fallback) to available listeners
│   ├── account/export/route.ts       # GET: Self-service data export (CCPA/GDPR)
│   ├── email/welcome/route.ts        # POST: Send welcome email (Resend)
│   ├── webhooks/new-user/route.ts    # POST: Supabase webhook — admin new-user email (mostly superseded by notify-signup)
│   └── admin/
│       ├── actions/route.ts          # POST: All admin mutations (verify token → is_admin, rate-limited)
│       ├── delete-user/route.ts      # POST: Admin user deletion
│       ├── notify-signup/route.ts    # POST: Admin signup-alert email (called from onboarding completion)
│       └── send-welcome-bulk/route.ts # POST: Bulk welcome emails
├── admin/page.tsx                    # Admin moderation dashboard (~1,500 lines)
├── chat/[id]/page.tsx                # Real-time 1:1 chat (~1,500 lines)
├── connect/page.tsx                  # Notification-tap landing: verifies seeker, creates session, → /chat
├── dashboard/page.tsx                # Main hub: role selection, listeners, seekers, notifications
├── history/page.tsx                  # Past sessions + feedback/thank-you notes
├── training/page.tsx                 # Listener training modules (acknowledge sections → completion timestamp)
├── profile/page.tsx                  # Edit profile, tags, avatar, notification/availability settings
├── listeners/page.tsx                # Browse & filter available listeners, connect
├── onboarding/page.tsx               # Post-signup setup (role, bio, tags, referral source, guidelines)
├── login/ signup/ forgot-password/ reset-password/  # Auth pages
├── contact/ donate/ safety/ terms/ privacy/ offline/ # Static-ish pages
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
├── TagSelector.tsx / Modal.tsx / ErrorState.tsx / Skeleton.tsx / Footer.tsx
├── ServiceWorkerRegistration.tsx / SkipLink.tsx
└── ui/Typography.tsx                 # Semantic type scale (Heading1..., Body16, Body18)

lib/
├── constants.ts                      # Timing, validation, tags, reactions, timezones, parseReferralSource
├── email.ts                          # Resend senders: new-user alert, support-request fallback, report-resolved, story emails
├── email/welcomeEmailHtml.ts         # Welcome email template
├── pushNotifications.ts              # Web Push subscribe/unsubscribe
├── linkify.tsx                       # Safe URL autolinking in chat
├── slugify.ts / sms.ts / env.ts
├── supabase/client.ts, server.ts
└── types/database.ts

supabase/
├── migrations/                       # 001–024, numbered (see below)
└── legacy/                           # Pre-migration setup SQL (historical reference only)

docs/                                 # Setup guides, audits, design assets (historical)
scripts/                              # Ad-hoc admin scripts (get-user-emails.js, DEPLOY.sh)
public/sw.js                          # Service worker (push, cache — bump CACHE_NAME on breaking changes; currently v9)
middleware.ts                         # Route protection (auth + admin check)
.github/workflows/cron.yml            # 15-min pings to cron API routes
```

---

## Database Schema (high level)

Migrations live in `supabase/migrations/` (001–024) and are the source of truth. Summary:

### profiles (central user table)
Core: `id` (= auth.users.id), `display_name` (unique), `email`, `bio`, `tagline`, `avatar_url`, `tags` (max 5), `is_admin`.
State: `role_state` (`available`/`requesting`/`offline`/null), `user_role` (`person_in_recovery`/`professional`/`ally`), `last_heartbeat_at`.
Notifications: `always_available`, `quiet_hours_*` (enabled/start/end/timezone), `email_notifications_enabled` (008), `phone_number` + `sms_notifications_enabled` (006, feature disabled), `availability_schedule` JSONB windows (020).
Compliance/audit: `referral_source` (010, free text since 018), `listener_training_completed_at` (019), `consent_version` + `consent_accepted_at` (021), `age_confirmed` (022), `health_data_consent` + `_at` (023, WA My Health My Data).

### Other tables
- **sessions** — listener_id, seeker_id, status (`active`/`ended`), ended_at
- **messages** — session_id, sender_id, content (max 2000), read_at (002, read receipts)
- **message_reactions** — 8 emoji types (003/004)
- **session_feedback** — helpful boolean + `thank_you_note` (009, max 300 chars, shown in /history)
- **user_favorites** (007) — favorite contacts from past sessions; favorites get notified first
- **reports / user_blocks / admin_logs** — moderation + audit trail
- **push_subscriptions** — Web Push endpoints per user/device
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
- Inactivity: warn at 15 min, auto-close 5 min later; either party can end → feedback modal (helpful? + optional thank-you note)
- Report flow (3-step) available in chat

### 4. Notification system (in priority order)
1. **Push** (VAPID web-push): favorites of the seeker get a personalized push first, general listeners 4s later; invalid subscriptions (4xx) auto-removed
2. **Email fallback** (Resend): listeners who opted in (`email_notifications_enabled`) and didn't get a successful push
3. **SMS fallback**: fully coded but disabled pending Twilio verification
- Server-side quiet-hours filtering (listener's local time); rate limit 3 req/60s per user (in-memory — see Known Issues)
- Targets: `role_state = 'available'` OR `always_available = true`

### 5. Admin moderation (/admin)
Tabs for reports, blocks, sessions, users, sign-ups (with referral source). All mutations via `/api/admin/actions` (server-verified `is_admin`, rate-limited, audit-logged including transcript views).

---

## Cron Jobs (fixed July 2026)

**Primary trigger: GitHub Actions** (`.github/workflows/cron.yml`) — every 15 minutes, pings:
- `POST /api/scheduled-availability` with `x-cron-secret` — notifies listeners whose availability window started within the last ~20 min
- `POST /api/cleanup-sessions` with `x-cleanup-secret` — closes empty (>10 min) and inactive (>30 min) sessions, resets stale requesting seekers

Requires GitHub repo secret `CLEANUP_SECRET_KEY` (same value as Vercel env var). Daily Vercel crons in `vercel.json` remain as backup; both routes also accept `Authorization: Bearer <CLEANUP_SECRET_KEY|CRON_SECRET>` and answer GET (Vercel crons send GET). The dashboard also triggers cleanup on page load.

---

## Key Constants

See `lib/constants.ts` (source of truth). Highlights: heartbeat 30s ping / 1h online threshold (5 min for PeopleSeeking freshness), inactivity warn 15 min + close 5 min later, re-notify every 2 min max 3×, seeker requesting state goes stale after 30 min, message max 2000 chars, 18 specialty tags (max 5), 8 reaction emoji, 7 US timezones, `parseReferralSource()` helper.

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
ADMIN_NOTIFICATION_EMAIL / SUPABASE_WEBHOOK_SECRET   # new-user webhook route
NEXT_PUBLIC_SENTRY_DSN / SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER   # SMS (disabled)
```

---

## Middleware & Auth

`middleware.ts` protects `/dashboard`, `/chat`, `/profile`, `/listeners`, `/training`, `/history` (→ `/login?redirect=`), `/onboarding` (→ `/signup`), and `/admin` (requires `is_admin`, else → `/dashboard`). Uses `@supabase/ssr` cookie sessions.

---

## Design System

- Brand colors: rb-dark #2D3436, rb-gray #4A5568, rb-blue #5A7A8C (+hover/light), rb-purple #B8A9C9 (WCAG AA)
- Semantic type scale via `components/ui/Typography.tsx` and heading CSS classes
- Class-based dark mode (ThemeProvider/ThemeToggle); dim greys bumped to gray-300 for legibility
- Button hierarchy: primary = solid rb-blue, secondary = light outline, destructive = red
- `prefers-reduced-motion` respected globally; 44px touch targets; skip link; crisis button always visible
- PWA: installable, standalone, start_url /dashboard; iOS needs Add to Home Screen before enabling push

---

## Current Feature Status

Everything in the flows above is ✅ live, including: auth, onboarding (with referral source + consent capture), real-time chat (reactions, read receipts, typing, linkify, crisis banner), push + email notifications, favorites-first notification priority, quiet hours, always-available, re-notifications, listener directory, listener training, availability schedules, session history + thank-you notes, feedback, reporting, admin dashboard (incl. sign-ups tab), account deletion + data export, PWA, dark mode, Sentry, session cleanup.

| Feature | Status | Notes |
|---------|--------|-------|
| SMS fallback | 🔇 Disabled | Code complete; Twilio verification pending (see below) |
| In-app blog/stories | 🚚 Moved | Now on Ghost (stories.recoverybridge.app); DB tables 011–015 are legacy |
| GitHub Actions cron | ⚠️ Needs secret | `CLEANUP_SECRET_KEY` repo secret must exist or runs 401 |

---

## Known Issues & Technical Debt

1. **No tests** — zero test files. Highest-value targets: quiet-hours math, availability-window parsing, notification batching, cleanup thresholds.
2. **ESLint not configured** — `next lint` has never run (no config file); `next lint` is also deprecated. Migrate to ESLint CLI flat config.
3. **In-memory rate limiter** — the notification route's rate limit resets per serverless instance/cold start. Move to DB or KV if abuse matters.
4. **SMS feature disabled** — all code written but commented out in `app/api/notifications/send/route.ts` and profile page. Re-enable: uncomment both, add Twilio env vars, redeploy.
5. **Large page components** — admin, chat, profile, dashboard are each 1,200–1,500 lines; extract components before major changes.
6. **Legacy blog tables** — migrations 011–015 create story tables no longer read by the app (stories moved to Ghost). `lib/email.ts` still has story emails.
7. **Public repo** — internal docs in `docs/` (breach response, audits) are world-readable; decide if any should be removed.
8. **Service worker cache** — `CACHE_NAME` in `public/sw.js` (currently v9); bump on breaking asset changes.
9. **RLS-null embeds crash render (⚠️ gotcha when writing profile joins)** — Supabase relation embeds like `favorite_profile:profiles!fkey(...)` are *non-inner* joins, so row-level security returns the embedded object as **`null`** (it does not drop the parent row) whenever the viewer can't read that profile. The `profiles` SELECT policy only exposes a profile that is your own, currently `role_state = 'available'`, an **active** session participant, or when you're admin — so any embed of an *offline* or *past-session* user comes back null. Dereferencing it (`fp.display_name`) throws during render and trips the error boundary ("Dashboard couldn't load"). **Always guard embedded profiles**: dashboard + profile favorites route through `lib/favorites.ts` `normalizeFavorites()`; profile thank-you notes, history, dashboard sessions, and admin all use `?.display_name || 'fallback'`. Use `!inner` only if you actually want RLS to filter the whole row instead.

---

## Git & Deploy Workflow

- **`main` auto-deploys to production** on Vercel (project `recovery-bridge`, team `burkjacksons-projects`)
- Solo project: commit to `main` directly or merge worktree branches to main — **never open PRs**
- Domains: recoverybridge.app (+www), stories.recoverybridge.app (Ghost)
