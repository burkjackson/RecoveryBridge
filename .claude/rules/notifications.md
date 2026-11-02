---
paths:
  - "app/api/notifications/**"
  - "app/api/push/**"
  - "lib/notificationQueue.ts"
  - "lib/serverPush.ts"
  - "lib/pushNotifications.ts"
  - "lib/pushEndpoint.ts"
  - "components/NotificationSettings.tsx"
  - "components/NotificationControls.tsx"
  - "components/BroadcastComposer.tsx"
---

# Notifications

1. **Push** (VAPID web-push): favorites of the seeker get a personalized push first, general listeners 4s later; subscriptions auto-removed only on 404/410 (`isSubscriptionGone()`), never on throttling or a VAPID mismatch. Favourites are resolved **server-side** from `user_favorites` — the client's list is RLS-filtered and silently omits offline favourites
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
| "Your availability was paused" check-in | `announcement` | `cleanup-sessions` cron, to the exact profiles `resetStaleAvailability()` just flipped to `offline` | same; migration 037 |

**Every kind is behind an admin switch** (`notification_kind_settings`, migration 036, +037 for `listener_checkin`), separate from the per-recipient consent above — that one asks "does this person want it", this one asks "do we want it going out at all yet". Both must say yes. The four automatic kinds ship **off**; `broadcast` ships **on** because it cannot fire without an admin composing and sending. Managed in Admin → Notifications.

The switch is enforced in three places, and all of them matter: `enqueueNotifications` won't create rows for a disabled kind, the drain re-checks at delivery (so switching off *cancels* an existing backlog rather than letting it drain), and `send_broadcast` checks before writing its `user_notices` rows. It fails closed — an unknown kind, or an unreadable settings table, sends nothing.

`/api/notifications/drain` delivers them on the shared cron: it re-checks consent at send time, **defers** anything landing in the recipient's quiet hours (moves `not_before` forward rather than dropping it), retires rows past `expires_at`, and prunes terminal rows after 30 days.

Three rules worth keeping:
1. **Never fold these into the support-request toggle.** Someone who mutes push to escape an announcement also stops hearing that a person needs support. That's why the categories are separate preferences and why support requests keep the original toggle.
2. **Push text renders on a locked phone.** Nothing in `NOTIFICATION_COPY` names the other person, quotes what they wrote, or implies why the recipient uses RecoveryBridge.
3. **Don't bake a live count into a queued body.** The check-in deliberately says "listeners are around", not "3 listeners are online" — the queue can drain 35+ minutes later (longer through quiet hours), by which time a number is a lie.

## Also keep in mind
- "Ship off" is only the default. On 2 Nov 2026 all 5 kinds were switched on in production, so check `notification_kind_settings` rather than assuming.
- Don't put anything urgent in the queue: it's only as timely as the cron plus quiet-hours deferrals. Support requests and chat messages stay on their direct paths.
- A broadcast can't be unsent, and the composer says so before confirming.
- Support pushes need a long enough TTL to outlast a sleeping phone (`SUPPORT_PUSH_TTL_SECONDS`).
- A read failure in the drain must release the batch back to `pending`. Never treat it as "no subscription", which permanently mislabels rows as `skipped` (#62).
- Listener targeting uses `isListenerOnline()`. `always_available` bypasses the heartbeat check by design.
