# Architecture

The detailed map of the app, moved out of `CLAUDE.md` on 2 Nov 2026. The code and
`supabase/migrations/` are the source of truth if this disagrees with them.

## Project Structure

```
app/
├── api/
│   ├── heartbeat/route.ts            # POST: Update user's last_heartbeat_at
│   ├── push/resubscribe/route.ts     # POST: Service worker swaps a rotated push endpoint (old endpoint is the credential)
│   ├── sessions/flag-crisis/route.ts # POST: Server-verified crisis flag on a session (see #62)
│   ├── cleanup-sessions/route.ts     # POST/GET: Auto-close stale sessions, reset stale seekers + stale-available listeners, expire temp blocks (cron)
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
│   └── admin/
│       ├── actions/route.ts          # POST: All admin mutations (verify token → is_admin, rate-limited)
│       ├── delete-user/route.ts      # POST: Admin user deletion
│       ├── notify-signup/route.ts    # POST: Admin signup-alert email (called from onboarding completion)
│       └── send-welcome-bulk/route.ts # POST: Welcome-email backfill for a NAMED set of recipients
├── admin/page.tsx                    # Admin moderation dashboard
├── chat/[id]/page.tsx                # Real-time 1:1 chat
├── connect/page.tsx                  # Notification-tap landing: verifies seeker, ASKS the listener to confirm, then creates the session → /chat
├── dashboard/page.tsx                # Main hub: role selection, listeners, seekers, notifications
├── history/page.tsx                  # Past sessions + feedback/thank-you notes
├── training/page.tsx                 # Listener training modules (acknowledge sections → completion timestamp)
├── profile/page.tsx                  # Edit profile, tags, avatar, notification/availability settings
├── listeners/page.tsx                # Browse & filter available listeners, connect
├── onboarding/page.tsx               # Post-signup setup (role, bio, tags, referral source, guidelines)
├── login/ signup/ forgot-password/ reset-password/  # Auth pages
├── support/                          # 7 static SEO landing pages (peer support, recovery chat, …) + index
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
├── NoticeBanner.tsx                  # Surfaces unread in-app notices (user_notices) on the dashboard
├── BroadcastComposer.tsx             # Admin: compose/send a platform announcement to a named audience
├── NotificationControls.tsx          # Admin: per-kind on/off switches for what the platform may send
├── TranscriptEdits.tsx               # Admin transcript: "edited" marker + every earlier version of a message (see #64)
├── SessionTimer.tsx                  # Chat: elapsed time next to "Active session"
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
├── safeRedirect.ts                   # safeRedirectPath() — guards ?redirect= against open-redirect (see Known Issue #39)
├── deleteUserAccount.ts              # deleteUserAccount() — shared by self-service + admin delete routes (see #42)
├── validation.ts                     # UUID_RE — shared user-id format check
├── directConnect.ts                  # startDirectConnect() — seeker-initiated connect, shared by 3 call sites (see #43)
├── acceptSeeker.ts                   # acceptSeeker() — listener accepting a seeker, shared by 2 call sites (see #43)
├── busyListeners.ts                  # getBusyListenerIds() — always-available listeners mid-chat, hidden from lists (see #69)
├── mutes.ts                          # getMutedUserIds() — pairwise mute id set, both directions collapsed (see #49)
├── chatMessages.ts                   # mergeMessageLists() + canEditMessage() — chat list merging and the edit window (see #64)
├── test/fakeSupabase.ts              # Shared fake Supabase client for the API route tests below, dispatch-by-table (see #50)
├── supabase/client.ts, server.ts
├── types/database.ts
└── *.test.ts                         # Vitest: constants, favorites, timeWindows, rateLimit, errors, safeRedirect, directConnect, acceptSeeker
                                       # + app/api/sessions/state, app/api/notifications/send, app/api/admin/actions route tests (see #50)

supabase/
├── migrations/                       # 001–069, numbered (note: two files share 004; 046 is RETIRED, never apply it, see #40) — see migrations/README.md
└── legacy/                           # Pre-migration setup SQL (historical snapshot; the live policy set has
                                      #   drifted — query pg_policies for the truth, see migrations/README.md)

docs/                                 # Setup guides + dated historical snapshots (each labelled); all intentionally public
scripts/                              # Ad-hoc admin scripts (DEPLOY.sh; get-user-emails.js removed — see Known Issues)
public/sw.js                          # Service worker (push, cache — bump CACHE_NAME on breaking changes; currently v14)
middleware.ts                         # Route protection (auth + admin check)
.github/workflows/cron.yml            # Backup pings to the cron routes (GitHub throttles it to every few hours; pg_cron is primary, see #67)
.github/workflows/ci.yml              # Typecheck, lint, test, build on every push (no secrets needed)
```

## Database Schema (high level)

Migrations live in `supabase/migrations/` (001–069) and are the source of truth — but note that a file existing is not evidence it ran (see #66); as of 28 Sep 2026 every one is live except `046`, which is retired and must never be applied (see #40). Summary:

### profiles (central user table)
Core: `id` (= auth.users.id), `display_name` (unique case-insensitively and 1-50 characters since migration 068, see #68), `email`, `bio`, `tagline`, `avatar_url`, `tags` (max 5), `is_admin`.
State: `role_state` (`available`/`requesting`/`offline`/null), `user_role` (`person_in_recovery`/`professional`/`ally`), `last_heartbeat_at`.
Notifications: `always_available`, `quiet_hours_*` (enabled/start/end/timezone), `email_notifications_enabled` (008), `phone_number` + `sms_notifications_enabled` (006, feature disabled), `availability_schedule` JSONB windows (020), `last_availability_notify_key` (027, dedupes the "support time is starting" push — `"YYYY-MM-DD|day|HH:MM"` in the user's timezone), `announcement_notifications_enabled` (035, default **true** — thank-you notes, training nudges, broadcasts) and `reengagement_notifications_enabled` (035, default **false** — the opt-in monthly check-in). Neither governs support-request pushes, which keep the original push toggle.
Training: `listener_training_progress` JSONB + `listener_training_progress_at` (035, per-section acks so progress survives a reload and the nudge cron can tell stalled from in-progress).
Compliance/audit: `referral_source` (010, free text since 018), `listener_training_completed_at` (019), `consent_version` + `consent_accepted_at` (021), `age_confirmed` (022), `health_data_consent` + `_at` (023, WA My Health My Data).

### Other tables
- **sessions** — listener_id, seeker_id, status (`active`/`ended`), ended_at, `accepted_at` (039, applied — NULL means a direct-connect session the listener hasn't accepted; a restrictive RLS policy blocks the seeker from messaging until it's set). A unique partial index (025) enforces **one active session per seeker**, so a duplicate insert fails with `23505` and callers fall back to "someone else just connected"
- **messages** — session_id, sender_id, content (max 2000), read_at (002, read receipts), edited_at (062, applied 28 Sep 2026 — sender can edit for 5 minutes; every earlier version kept in admin-only `message_edits`, see #64)
- **message_reactions** — 8 emoji types (003/004)
- **session_feedback** — helpful boolean + `thank_you_note` (009, max 300 chars, shown in /history)
- **user_favorites** (007) — favorite contacts from past sessions; favorites get notified first
- **reports / user_blocks / admin_logs** — moderation + audit trail (`user_blocks.expires_at` is honoured by `lib/blocks.ts` and swept by the cleanup cron)
- **user_notices** (026) — in-app messages to a *user*: auto "we couldn't connect you" follow-ups (`kind='reconnect'`), admin outreach (`kind='outreach'`), broadcasts (`kind='announcement'`) Surfaced by `NoticeBanner` on the dashboard; the admin "Couldn't Connect" tab reads the `reconnect` rows
- **push_subscriptions** — Web Push endpoints per user/device
- **notification_queue** (035) — one row per recipient per non-support notification (thank-you note, training nudge, check-in, broadcast). Drained by `/api/notifications/drain`; `dedupe_key` + a partial unique index make every enqueue idempotent, `not_before` doubles as a quiet-hours deferral and a claim lease
- **broadcasts** (035) — audit record for an admin announcement; queue rows hang off it
- **notification_kind_settings** (036) — the admin on/off switch per notification kind. Absent row = off; unreadable = everything off
- **blog/story tables** (011–015) — **legacy**: stories moved to Ghost at blog.recoverybridge.app; no in-app UI reads them

All tables have RLS. Admin mutations go through `/api/admin/*` routes (Bearer token → `getUser` → `is_admin` check), not client-side Supabase.

## Core User Flows

### 1. Seeker requesting support
1. "I Need Support" → `role_state = 'requesting'`, push fires to available listeners
2. Seeker stays on dashboard with "Finding Listener..."; heartbeat every 30s
3. Re-notification after 2 min without connection (max 3)
4. Listener connects (PeopleSeeking, dashboard list, /listeners, or notification tap → `/connect?seekerId=`). **Every path confirms first** — the in-app lists via a modal, the notification tap via the /connect page. Nothing is created until a listener explicitly says they're ready, so a stray tap can't consume a seeker
5. Seeker auto-navigates to `/chat/[sessionId]` via realtime subscription

### 2. Listener flows
- "I'm Here To Listen" → `role_state = 'available'`, visible in lists
- Seekers can also directly connect from the dashboard listener list, /listeners, or Favorites; the listener gets a distinct "🎯 Direct Connection Request" push/email. The session exists and the seeker is dropped into /chat immediately, but it starts **pending** (`sessions.accepted_at IS NULL`, migration 039) — the composer is hidden for both sides and the seeker cannot send a message (enforced by a restrictive RLS policy, not just the UI) until the listener taps Accept in chat. See Known Issue #28. The listener's own `role_state` is untouched while pending — only the seeker moves to `offline` at the start of a direct connect; the listener only leaves the pool once they tap Accept (see Known Issue #35). A pending session still blocks a second direct-connect to the same listener (migration 029's one-active-session-per-listener index doesn't distinguish pending from accepted) — acceptable since the cleanup cron closes an unanswered pending session after 10 minutes.
- Listener training (/training) nudged from dashboard; completion recorded on profile
- Optional weekly availability schedule → "your support time is starting" push at window start

### 3. Chat session
- Realtime messages (postgres_changes), editing your own message for 5 minutes (shows "Edited"), typing indicators + read receipts (broadcast), reactions (double-click, 8 types), URL autolinking, conversation starters, crisis-language banner
- Inactivity: warn at 15 min, auto-close 5 min later; either party can end → feedback modal (helpful? + optional thank-you note) → favourite prompt → dashboard
- Session start/end moves participants' `role_state` via `/api/sessions/state` (see Known Issue #26) — both sides on end; on start, both sides for an already-accepted session, but only the seeker for a still-pending direct connect (see Known Issue #35)
- Report flow (3-step) available in chat

### 4. Notification system
See `.claude/rules/notifications.md`.

### 5. Admin moderation (/admin)
Tabs for reports, blocks, sessions, users, sign-ups (with referral source), "Couldn't Connect", and Broadcast (`components/BroadcastComposer.tsx` — pick a named audience, preview its size and how many can receive a push, send) (`missed` — seekers whose request went unanswered, from `user_notices`; an admin can send them a personal note). All mutations via `/api/admin/actions` (server-verified `is_admin`, rate-limited, audit-logged including transcript views).

## Key Constants

`lib/constants.ts` is the source of truth. Highlights: heartbeat 30s ping / 1h online threshold (5 min for PeopleSeeking freshness), inactivity warn 15 min + close 5 min later, re-notify every 2 min max 3×, seeker requesting state goes stale after 30 min, message max 2000 chars, 18 specialty tags (max 5), 8 reaction emoji, 44 timezones (worldwide: US, Canada, Latin America, Europe, Middle East/Africa, Asia-Pacific), `parseReferralSource()` helper.

## Test Coverage

Vitest covers these `lib/` helpers: acceptSeeker, busyListeners, chatMessages, constants, cronAuth, directConnect, errors, favorites, missedConnections, notificationQueue, pushEndpoint, rateLimit, safeRedirect, serverPush, sessionState, timeWindows. It also covers the `admin/actions`, `notifications/send` and `sessions/state` API routes.

## Optional Environment Variables

```
CRON_SECRET                        # Alternate cron secret (Vercel sends as Bearer if set)
NEXT_PUBLIC_SITE_URL               # Auth redirect base (signup confirm, password reset); falls back to window.location.origin
NEXT_PUBLIC_SENTRY_DSN / SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER   # SMS (disabled; not in .env.example)
```
