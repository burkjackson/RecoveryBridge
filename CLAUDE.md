# RecoveryBridge — Project Status Document

> **Last Updated:** February 2025
> **Purpose:** Get any Claude session up to speed on the entire app — architecture, features, current state, and known issues.

---

## What Is RecoveryBridge?

RecoveryBridge is a **peer-to-peer support platform for people in addiction recovery**. Users can be **seekers** (people needing support) or **listeners** (people offering support). They connect in real-time 1:1 chat sessions. Think of it as an anonymous, on-demand peer support hotline.

**Live URL:** Deployed on Vercel (auto-deploys from `main` branch)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, React 18, TypeScript) |
| Database | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Styling | Tailwind CSS 3.4 with custom theme |
| Push Notifications | web-push (VAPID) + Service Worker |
| SMS (disabled) | Twilio (pending verification) |
| Error Tracking | Sentry (@sentry/nextjs) |
| Image Cropping | react-easy-crop |
| Hosting | Vercel |

---

## Project Structure

```
app/
├── api/
│   ├── heartbeat/route.ts          # POST: Update user's last_heartbeat_at
│   ├── cleanup-sessions/route.ts   # POST: Auto-close stale sessions (cron-compatible)
│   └── notifications/send/route.ts # POST: Send push notifications to available listeners
├── admin/page.tsx                  # Admin moderation dashboard (reports, blocks, users)
├── chat/[id]/page.tsx              # Real-time 1:1 chat (largest file ~800 lines)
├── dashboard/page.tsx              # Main hub: role selection, sessions, notifications
├── profile/page.tsx                # Edit profile, tags, avatar, SMS settings
├── listeners/page.tsx              # Browse & filter available listeners, connect
├── onboarding/page.tsx             # 4-step post-signup setup (role, bio, tags, guidelines)
├── login/page.tsx                  # Email/password authentication
├── signup/page.tsx                 # Registration with display name
├── forgot-password/page.tsx        # Password reset request
├── reset-password/page.tsx         # Set new password from email link
├── contact/page.tsx                # Contact form
├── donate/page.tsx                 # Donation info
├── safety/page.tsx                 # Safety guidelines (static)
├── terms/page.tsx                  # Terms of service (static)
├── privacy/page.tsx                # Privacy policy (static)
├── layout.tsx                      # Root layout: PWA metadata, CrisisResources, ServiceWorker
├── page.tsx                        # Landing page
├── globals.css                     # Global styles
└── global-error.tsx                # Error boundary

components/
├── AvailableListeners.tsx          # Real-time list of online listeners (dashboard)
├── PeopleSeeking.tsx               # Real-time list of seekers needing help (for listeners)
├── NotificationSettings.tsx        # Push toggle, Always Available, Quiet Hours
├── NotificationInstructionsModal.tsx # iOS PWA installation guide
├── AvatarUpload.tsx                # Image upload with crop (Supabase Storage)
├── CrisisResources.tsx             # Floating 988/crisis button (always visible)
├── TagSelector.tsx                 # Multi-select specialty tags (max 5)
├── Modal.tsx                       # Reusable modal (alert/confirm/custom)
├── ErrorState.tsx                  # Reusable error display (inline/page/banner)
├── Skeleton.tsx                    # Loading skeletons for all page types
├── Footer.tsx                      # Site footer with links
├── ServiceWorkerRegistration.tsx   # Registers sw.js on mount
├── SkipLink.tsx                    # Accessibility: skip to main content
└── ui/Typography.tsx               # Heading1, Body16, Body18

lib/
├── constants.ts                    # All timing, validation, tags, reactions, timezones
├── pushNotifications.ts            # Web Push API utilities (subscribe/unsubscribe)
├── sms.ts                          # Twilio wrapper (sendSMS, isValidE164)
├── env.ts                          # Environment variable validation
├── supabase/
│   ├── client.ts                   # Browser-side Supabase client
│   └── server.ts                   # Server-side Supabase client (SSR cookies)
└── types/
    └── database.ts                 # TypeScript interfaces for all tables

supabase/migrations/
├── 001_session_feedback.sql        # session_feedback table + RLS
├── 002_read_receipts.sql           # read_at column on messages
├── 003_message_reactions.sql       # message_reactions table (3 types)
├── 004_add_reaction_types.sql      # Expand to 8 reaction types
├── 004_security_fixes.sql          # Restrict message updates, enforce read_at
├── 005_quiet_hours.sql             # Quiet hours columns on profiles
└── 006_sms_notifications.sql       # phone_number + sms_enabled on profiles

public/
├── sw.js                           # Service worker (push, cache, notification clicks)
├── manifest.json                   # PWA manifest (standalone, /dashboard start)
├── icon-192.png, icon-512.png      # PWA icons
└── apple-touch-icon.png            # iOS icon

middleware.ts                       # Route protection (auth + admin check)
```

---

## Database Schema

### profiles
The central user table. Key fields:

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Matches Supabase auth.users.id |
| display_name | text | Unique, shown publicly |
| email | text | From auth, shown on profile only |
| bio | text | Optional, max 500 chars |
| tagline | text | Short quote, max 60 chars |
| role_state | enum | `'available'` / `'requesting'` / `'offline'` / null |
| user_role | enum | `'person_in_recovery'` / `'professional'` / `'ally'` / null |
| tags | text[] | Specialty tags (max 5) |
| avatar_url | text | Supabase Storage URL |
| is_admin | boolean | Admin dashboard access |
| always_available | boolean | Receive notifications even when not "available" |
| last_heartbeat_at | timestamptz | Updated every 30s when active |
| quiet_hours_enabled | boolean | Do Not Disturb toggle |
| quiet_hours_start | text | HH:MM format (default '23:00') |
| quiet_hours_end | text | HH:MM format (default '07:00') |
| quiet_hours_timezone | text | IANA timezone (default 'America/New_York') |
| phone_number | text | E.164 format, validated by DB constraint |
| sms_notifications_enabled | boolean | SMS fallback toggle |

### sessions
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| listener_id | uuid | FK to profiles |
| seeker_id | uuid | FK to profiles |
| status | enum | `'active'` / `'ended'` |
| ended_at | timestamptz | When session was closed |

### messages
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| session_id | uuid | FK to sessions |
| sender_id | uuid | FK to profiles |
| content | text | Message body (max 2000 chars) |
| read_at | timestamptz | Read receipt (null = unread) |

### message_reactions
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| message_id | uuid | FK to messages |
| user_id | uuid | FK to profiles |
| reaction | enum | `heart` / `hug` / `pray` / `strong` / `sparkles` / `thumbsup` / `clap` / `blue_heart` |

### session_feedback
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| session_id | uuid | FK to sessions |
| from_user_id | uuid | Who gave feedback |
| to_user_id | uuid | Who received feedback |
| helpful | boolean | Was the session helpful? |

### reports
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| reporter_id | uuid | Who filed the report |
| reported_user_id | uuid | Who was reported |
| session_id | uuid | Which chat session |
| reason | text | Category of issue |
| description | text | Details |
| status | enum | `'pending'` / `'reviewing'` / `'resolved'` / `'dismissed'` |
| resolved_by | uuid | Admin who resolved |
| resolution_notes | text | Admin notes |

### user_blocks
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | Blocked user |
| blocked_by | uuid | Admin who blocked |
| reason | text | Why |
| block_type | enum | `'temporary'` / `'permanent'` |
| expires_at | timestamptz | For temporary blocks |
| is_active | boolean | Currently enforced? |

### admin_logs
Audit trail for all admin actions (block, unblock, resolve report, delete user, etc.)

### push_subscriptions
Stores Web Push subscription endpoints per user (one user can have multiple devices).

---

## Core User Flows

### 1. Seeker Requesting Support
1. Seeker clicks "I Need Support" on dashboard → `role_state = 'requesting'`
2. Push notification fires to all available listeners (respects quiet hours)
3. Seeker stays on dashboard with "Finding Listener..." animation
4. Heartbeat runs every 30s; after **2 minutes** without connection, re-notification fires (up to 3x)
5. When a listener clicks "Connect" from PeopleSeeking or Listeners page, a session is created
6. Seeker auto-navigates to `/chat/[sessionId]` via realtime subscription

### 2. Listener Connecting
1. Listener clicks "I'm Here To Listen" → `role_state = 'available'`
2. They appear in AvailableListeners and can see PeopleSeeking cards
3. Click "Connect" on a seeker → new session created → both navigate to chat
4. Can also browse `/listeners` page for more detail before connecting

### 3. Chat Session
- Real-time messaging via Supabase postgres_changes
- Typing indicators via Supabase broadcast
- Read receipts (single ✓ = sent, double ✓✓ = read) via broadcast
- Message reactions (double-click to react, 8 emoji types)
- Conversation starters shown when empty (different for seekers vs listeners)
- Inactivity warning at 15 min, auto-close at 20 min
- Either party can end session → feedback modal ("Was this helpful?")
- Report flow available (3-step: reason → details → submit)

### 4. Notification System
- **Push notifications:** Web Push via VAPID keys + service worker
- **Always Available mode:** Listeners receive notifications even when not in "available" state (requires PWA + push enabled)
- **Quiet Hours:** Server-side filtering — notifications skip listeners whose local time falls within their quiet window
- **Re-notifications:** If seeker waits 2+ minutes with no listener, notifications re-fire (max 3 re-sends)
- **SMS fallback (disabled):** Would send SMS to listeners not reached by push. Commented out pending Twilio verification.
- **Rate limiting:** Max 3 notification requests per user per 60 seconds

### 5. Admin Moderation
- `/admin` route (requires `is_admin = true` in profiles)
- 4 tabs: Reports, Blocks, Sessions, Users
- Can: review/resolve/dismiss reports, block/unblock users, end sessions, delete users
- All actions logged to admin_logs audit trail
- Real-time updates via Supabase subscriptions

---

## API Routes

### POST /api/heartbeat
- **Auth:** Bearer token
- **Body:** `{ userId }`
- **Purpose:** Updates `last_heartbeat_at` for users in 'available' or 'requesting' state
- **Frequency:** Called every 30 seconds from dashboard

### POST /api/cleanup-sessions
- **Auth:** Bearer token OR `x-cleanup-secret` header (for cron jobs)
- **Purpose:** Auto-closes abandoned sessions:
  - No messages + session > 10 min old
  - Last message > 30 min ago
- **Returns:** Count of closed sessions

### POST /api/notifications/send
- **Auth:** Bearer token (must match seekerId)
- **Body:** `{ seekerId, isRenotification? }`
- **Purpose:** Sends push notifications to available listeners
- **Features:**
  - Rate limiting (3 req/60s per user)
  - Server-side quiet hours filtering
  - Fetches seeker name from DB (never trusts client)
  - Queries listeners where `role_state = 'available'` OR `always_available = true`
  - Removes invalid push subscriptions (4xx responses)
  - SMS fallback (currently disabled)

---

## Key Constants (lib/constants.ts)

### Timing
| Constant | Value | Purpose |
|----------|-------|---------|
| HEARTBEAT_INTERVAL_MS | 30s | How often clients ping |
| HEARTBEAT_THRESHOLD_MS | 1 hour | Max age for "online" status |
| INACTIVITY_WARNING_MS | 15 min | Chat inactivity warning |
| INACTIVITY_AUTO_CLOSE_MS | 5 min | Auto-close after warning |
| CLEANUP_NO_MESSAGES_MS | 10 min | Close empty sessions |
| CLEANUP_INACTIVE_MS | 30 min | Close inactive sessions |
| TYPING_TIMEOUT_MS | 2s | Clear typing indicator |
| RENOTIFY_DELAY_MS | 2 min | Re-notification interval |

### Validation
| Constant | Value |
|----------|-------|
| Password min | 8 chars |
| Display name | 2-50 chars |
| Bio max | 500 chars |
| Tagline max | 60 chars |
| Message max | 2000 chars |
| Max specialty tags | 5 |

### Specialty Tags (18)
Early Recovery, Long-Term Recovery, Relapse Prevention, Grief & Loss, Family Issues, Trauma, Anxiety & Depression, Substance Use, Alcohol, Codependency, Self-Care, Spirituality, Career & Purpose, Relationships, Parenting in Recovery, Veterans, LGBTQ+, Young Adults

### Reactions (8)
❤️ heart, 🤗 hug, 🙏 pray, 💪 strong, ✨ sparkles, 👍 thumbsup, 👏 clap, 💙 blue_heart

### Timezones (7 US)
Eastern, Central, Mountain, Pacific, Alaska, Hawaii, Arizona

---

## Environment Variables

### Required
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key (server-only)
VAPID_PUBLIC_KEY                  # Web Push VAPID public key
VAPID_PRIVATE_KEY                 # Web Push VAPID private key
NEXT_PUBLIC_VAPID_PUBLIC_KEY      # Same as VAPID_PUBLIC_KEY (client-accessible)
VAPID_SUBJECT                     # VAPID subject (mailto: or https:// URL)
CLEANUP_SECRET_KEY                # Secret for cron-triggered session cleanup
```

### Optional
```
NEXT_PUBLIC_SENTRY_DSN            # Sentry error tracking
SENTRY_ORG                        # Sentry organization
SENTRY_PROJECT                    # Sentry project name
SENTRY_AUTH_TOKEN                 # Sentry auth token (for source maps)
TWILIO_ACCOUNT_SID                # Twilio SMS (disabled, pending verification)
TWILIO_AUTH_TOKEN                  # Twilio SMS
TWILIO_PHONE_NUMBER               # Twilio SMS sending number
```

---

## Middleware & Auth

**File:** `middleware.ts`

Protected routes require authentication:
- `/dashboard/*`, `/chat/*`, `/profile/*`, `/listeners/*`, `/onboarding/*`
- Unauthenticated users → redirect to `/login`

Admin routes require `is_admin = true`:
- `/admin/*` → non-admins redirect to `/dashboard`

Uses `@supabase/ssr` with cookie-based session management.

---

## PWA Setup

- **manifest.json:** name "RecoveryBridge", start_url "/dashboard", standalone display
- **Service Worker (sw.js):** Handles push events, notification clicks, cache management (v4)
- **iOS Support:** Requires "Add to Home Screen" → open as web app → then enable notifications
- **NotificationInstructionsModal** guides iOS users through this process

---

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:
- Users can only read/write their own profile data
- Users can only access sessions they're a participant in
- Messages are scoped to session membership
- Admins (is_admin=true) have broader read/write access
- Push subscriptions are per-user
- Reports can be created by any user, viewed by reporters and admins
- message_reactions: real-time enabled, scoped to session membership

---

## Design System

### Colors (WCAG AA Compliant)
- **rb-dark:** #2D3436 (primary text)
- **rb-gray:** #4A5568 (secondary text)
- **rb-blue:** #5A7A8C (primary actions, links)
- **rb-blue-hover:** #4A6A7C (hover state)
- **rb-blue-light:** #E8F0F4 (backgrounds)
- **rb-purple:** #B8A9C9 (accents)
- **rb-white:** #FFFFFF

### Typography
- Heading1: 30px bold
- Body18: 18px semi-bold
- Body16: 16px regular

### Accessibility
- All interactive elements: min 44px touch targets
- Skip link for keyboard navigation
- Crisis resources always accessible (floating button)
- WCAG AA color contrast throughout

---

## Current Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (email/password) | ✅ Live | Supabase Auth |
| Onboarding (4-step) | ✅ Live | Role, bio, tags, guidelines |
| Dashboard (role selection) | ✅ Live | Available/Requesting/Offline |
| Real-time chat | ✅ Live | Messages, typing, read receipts |
| Message reactions | ✅ Live | 8 emoji types |
| Conversation starters | ✅ Live | Different for seekers vs listeners |
| Session feedback | ✅ Live | "Was this helpful?" |
| Push notifications | ✅ Live | VAPID + service worker |
| Always Available mode | ✅ Live | PWA + push required |
| Re-notifications | ✅ Live | Every 2 min, max 3x |
| Quiet Hours (DND) | ✅ Live | Server-side timezone filtering |
| Listener directory | ✅ Live | Search, tag filter, sort |
| Avatar upload | ✅ Live | Crop + Supabase Storage |
| Specialty tags | ✅ Live | 18 tags, max 5 per user |
| User reporting | ✅ Live | 3-step report flow |
| Admin dashboard | ✅ Live | Reports, blocks, sessions, users |
| Inactivity auto-close | ✅ Live | 15 min warn, 20 min close |
| Session cleanup (cron) | ✅ Live | Closes stale sessions |
| PWA (installable) | ✅ Live | iOS + Android |
| Crisis resources | ✅ Live | 988, Crisis Text Line, SAMHSA |
| Sentry error tracking | ✅ Live | Conditional (needs env vars) |
| SMS fallback | 🔇 Disabled | Code complete, Twilio verification pending |
| Account deletion | ✅ Live | 2-step confirmation |

---

## Known Issues & Technical Debt

1. **Admin auth is client-side only** — The admin page checks `is_admin` on the client. RLS policies enforce it server-side, but the admin check in middleware should be hardened.

2. **SMS feature disabled** — All SMS code is written and tested but commented out in `route.ts` and `profile/page.tsx`. Waiting for Twilio account verification. To re-enable:
   - Uncomment import and SMS block in `app/api/notifications/send/route.ts`
   - Uncomment SMS UI in `app/profile/page.tsx`
   - Add Twilio env vars to Vercel
   - Redeploy

3. **Unused SMS state in profile page** — The `phoneNumber`, `smsEnabled`, `savingSms`, `smsSuccess`, `smsError` state variables and `handleSaveSms` function remain in the profile page even though the UI is commented out. This is intentional for easy re-enable.

4. **PeopleSeeking heartbeat threshold** — Uses a 5-minute threshold (different from the 1-hour threshold in AvailableListeners) to keep the seeking list fresh.

5. **Service Worker cache version** — Currently at v4. Increment when making breaking changes to cached assets.

---

## Git State

- **Main branch:** `main` (auto-deploys to Vercel)
- **Production branch:** `production` (exists but main is the deploy target)
- **Active worktree:** `claude/distracted-agnesi`
- **Total commits:** ~160
- **Workflow:** Feature branches merge to main via worktree

### Recent Commits (newest first)
```
e4a5520 Reduce re-notification delay from 5 minutes to 2 minutes
3682355 Disable SMS feature until Twilio verification is complete
f63b012 Add SMS fallback notifications via Twilio
8fdd671 Add quiet hours (Do Not Disturb) for listener notifications
b7eeefb Add "Someone's Still Waiting" re-notification for unanswered support requests
dcb90b6 Make skip feedback button more prominent
5336055 Fix seekers not appearing: add heartbeat for requesting state + polling
eabc5f8 Collapse Push Notifications into dropdown accordion
f792f9b Send conversation starter immediately on tap
c54bbf6 Add separate conversation starters for seekers and listeners
877397f Filter stale seeking requests by heartbeat threshold
3f1511d Keep seeker on dashboard and auto-navigate to chat
cda354a Add People Seeking Support section to listener dashboard
608737f Add expanded reaction types and update status doc
8245ccf Add Better Chat Experience (V2 Feature #2)
478d5e1 Add Listener Matching & Discovery (V2 Feature #1)
```

---

## How to Re-Enable SMS When Twilio Is Verified

1. In `app/api/notifications/send/route.ts`:
   - Uncomment `import { sendSMS } from '@/lib/sms'` (line 4-5)
   - Replace `const smsCount = 0` with the commented-out SMS block below it
   - Remove the `/* ... */` comment wrapper

2. In `app/profile/page.tsx`:
   - Change `{/* SMS Notifications — hidden until Twilio verification is complete` back to `{/* SMS Notifications */}`
   - Remove the closing `*/}` that wraps the entire section

3. In Vercel → Settings → Environment Variables, add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`

4. Redeploy.
