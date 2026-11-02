---
paths:
  - "app/api/sessions/**"
  - "app/api/cleanup-sessions/**"
  - "app/api/admin/**"
  - "app/api/account/**"
  - "app/connect/**"
  - "app/listeners/**"
  - "app/dashboard/**"
  - "components/PeopleSeeking.tsx"
  - "components/AvailableListeners.tsx"
  - "lib/sessionState.ts"
  - "lib/serverSessionState.ts"
  - "lib/directConnect.ts"
  - "lib/acceptSeeker.ts"
  - "lib/busyListeners.ts"
  - "lib/deleteUserAccount.ts"
---

# Sessions, connecting and role state

## Shared paths
- Seeker-initiated connects go through `startDirectConnect()`. Listener-initiated ones go through `acceptSeeker()`. Don't add another copy; the old copies drifted and caused real bugs (#43).
- Anything that ends a session server-side must call `endSessionRoleStates()`, or the listener stays stuck `offline` (#26).
- Every listener path confirms first. Nothing is created until a listener explicitly says they're ready, so a stray tap can't consume a seeker.

## Pending direct connects (`sessions.accepted_at IS NULL`)
- A restrictive RLS policy stops the seeker messaging until accepted. The chat UI hides the composer on both sides.
- `start` moves only the seeker while pending. The listener leaves the pool only when they tap Accept (#35).
- A declined, cancelled or timed-out pending session restores the seeker to `requesting`, not `offline` (`wasAccepted: false`). Key this off the session's own `accepted_at`, never a client value (#34).
- A pending session has nothing to rate: no feedback modal, and it's excluded from `/history`. Admin still sees it.
- Accept must filter on `status='active'` and `accepted_at is null` (#60).

## `/api/sessions/state`
It runs as the service role, so it skips the blocked-user trigger and has to check for itself:
- `start` requires `status='active'`. `end` requires `ended_at` within 2 minutes.
- `end` must not restore anyone blocked, anyone in another active session, a seeker already `requesting` again, or a listener whose heartbeat is at or after `ended_at`.
- A 409 is expected, not a Sentry-worthy failure.

## Always-available listeners
- They manage `role_state` manually: never change it on start or end, and exclude them from staleness resets (#63, #69).
- While in a chat they're hidden from lists via `get_busy_listener_ids()` and skipped by `/api/notifications/send`.
- Lists can be stale, so connect paths must explain a busy listener (`isListenerBusyError()`, `listener_busy`) rather than showing the raw index error.

## Limits and thresholds
- `sessions` has a unique index for one active session per seeker and another per listener. Handle `23505` as "someone else just connected".
- `isListenerOnline()` in `lib/constants.ts` is the single freshness check. Don't tighten the 1-hour window to fix missed connections; the supply data says it wouldn't help (#23).
