# RecoveryBridge - Status and Changes Document
**Last Updated:** February 17, 2026
**Branch:** `claude/distracted-agnesi` (merged to `main`)
**Deployment Status:** Deployed to production

---

## Current State

All V2 features from the first two phases are complete and deployed. All code review issues (critical, high, and medium priority) have been addressed.

### V2 Features Shipped

#### Feature #1: Listener Matching & Discovery
- Specialty tags on listener profiles (up to 5 per listener)
- Tag-based filtering on the listeners page
- 18 recovery-appropriate specialty categories

#### Feature #2: Better Chat Experience
- **Conversation Starters** — ice-breaker prompts when a chat has 0 messages
- **Session Summary** — duration + message count in the feedback modal
- **Typing Indicators** — "X is typing..." with animated dots (Supabase Broadcast, no DB writes)
- **Read Receipts** — single check (sent) / double check (read) on own messages
- **Quick Reactions** — heart, hug, prayer hands on messages (new `message_reactions` table)

### Code Review Fixes (All Complete)

#### Critical / High Priority
- JWT validation on notification endpoint (server-side auth, not client-provided names)
- Supabase client created once per page load (not on every render)
- Race condition fix: session loads only after auth resolves
- Heartbeat cleanup on unmount
- Rate limiting on `/api/notifications/send` (3 req/user/60s)

#### Medium Priority
- `scrollToBottom` only fires on new messages, not `read_at` updates
- Message length limit (2000 chars) with character counter
- Replaced all `alert()`/`prompt()`/`confirm()` with modal dialogs
  - Report flow: 3-step modal (reason -> details -> confirm)
  - End session: confirmation modal
- Shared types imported from `lib/types/database.ts` (removed duplicated interfaces from chat page)
- Real-time listener list updates via Supabase `postgres_changes` subscription

---

## Key Commits (Most Recent First)

```
05eada9 - Fix medium-priority issues from code review
d505efe - Fix critical security and reliability issues from code review
8245ccf - Add Better Chat Experience (V2 Feature #2)
9344b23 - Fix notification click opening dashboard instead of listeners page
dae00f4 - Fix build failure: JSX syntax error and Sentry config guards
478d5e1 - Add Listener Matching & Discovery (V2 Feature #1)
3c9e12c - Fix security, type safety, accessibility, and performance issues
```

---

## Architecture Overview

### Key Files

| File | Purpose |
|------|---------|
| `app/chat/[id]/page.tsx` | Core chat page (~1280 lines) — messages, typing, reactions, read receipts, modals |
| `app/listeners/page.tsx` | Listener discovery — tag filtering, real-time updates |
| `app/dashboard/page.tsx` | Main dashboard — status toggle, heartbeat, notification settings |
| `app/api/notifications/send/route.ts` | Push notification API — rate limited, JWT-authenticated |
| `lib/constants.ts` | Centralized constants — timeouts, validation limits, tags, reactions |
| `lib/types/database.ts` | Shared TypeScript interfaces for all DB tables |
| `lib/pushNotifications.ts` | Client-side push subscription management |
| `public/sw.js` | Service worker for background push notifications |

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles, role_state, always_available, tags |
| `sessions` | Chat sessions (listener_id, seeker_id, status) |
| `messages` | Chat messages with `read_at` for read receipts |
| `message_reactions` | Heart/hug/pray reactions on messages |
| `push_subscriptions` | Web push subscription storage |
| `reports` | User reports with status tracking |
| `user_blocks` | User blocking (temporary/permanent) |
| `admin_logs` | Admin action audit trail |
| `session_feedback` | Post-session helpful/not helpful feedback |

### Real-time Channels

1. **Chat messages** — `postgres_changes` on `messages` table (filtered by session_id)
2. **Typing indicators** — Supabase Broadcast (no DB writes)
3. **Read receipts** — Broadcast for instant UI updates + DB write for persistence
4. **Reactions** — `postgres_changes` on `message_reactions` table
5. **Listener list** — `postgres_changes` on `profiles` table (role_state/availability changes)

### Time Constants (`lib/constants.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `HEARTBEAT_INTERVAL_MS` | 30s | How often to ping availability |
| `HEARTBEAT_THRESHOLD_MS` | 1 hour | Max heartbeat age for "available" |
| `INACTIVITY_WARNING_MS` | 15 min | Warning before auto-close |
| `INACTIVITY_AUTO_CLOSE_MS` | 5 min | Auto-close after warning |
| `TYPING_TIMEOUT_MS` | 2s | Clear "typing" indicator |
| `TYPING_THROTTLE_MS` | 500ms | Min interval between typing events |
| `MAX_MESSAGE_LENGTH` | 2000 | Chat message character limit |

---

## Known Pre-existing Issues

1. **`next lint` broken** — `TypeError: mod.nextLint is not a function` with Node v24.13.0. Framework-level incompatibility, not our code.
2. **Admin page type error** — `Property 'getUser' does not exist on type 'SupabaseAuthClient'` in `app/admin/page.tsx`. Intermittent — builds succeed most of the time. May need Supabase client library update.
3. **Sentry ETIMEDOUT** — Occasional timeout during build trace collection. Network issue only, doesn't affect build output.

---

## What's Next (Potential V2 Features)

These are candidates from the V2 roadmap — not yet started:

- **Enhanced Dashboard & Session Management** — session history, better status controls
- **Trust & Safety** — admin tools, moderation improvements
- **Onboarding & Education** — guided first-time experience
- **Performance & Polish** — loading states, error boundaries, offline support

---

**End of Status Document**
