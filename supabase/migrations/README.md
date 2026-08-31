# Migrations

Numbered SQL, applied in order. Paste each into the Supabase SQL editor (the
project has no CLI migration runner wired up) and run it once.

## Applied — 31 August 2026

**040 and 041 were applied together**, in that order, on 31 Aug 2026. They
close two halves of the same problem: 039 put the accept gate on `messages`
INSERT, but `sessions` UPDATE was wide open, so the person being gated could
either forge their way past it (040) or simply switch it off (041). Either one
alone leaves the gate defeatable.

Verified live after applying, in a rolled-back transaction against the real
policies — five attacks blocked, five legitimate paths working:

| | |
|---|---|
| seeker forges a message from the listener (pending) | blocked |
| seeker messages while pending | blocked |
| seeker self-accepts | blocked: *Only the listener can accept a connection request* |
| seeker swaps in a third-party listener | blocked: *Session participants cannot be changed* |
| seeker reopens an ended session | blocked: *An ended session cannot be reopened* |
| listener replies while pending (039 depends on it) | allowed |
| listener taps Accept | allowed |
| seeker messages an accepted session | allowed |
| seeker ends the chat | allowed |
| service role ends a session (cron, admin, account delete) | allowed |

Afterwards `messages` has exactly one permissive INSERT policy plus 039's
restrictive one, the `protect_session_transitions` trigger is on `sessions`, no
probe rows were left behind, and row counts were unchanged (209 sessions, 1441
messages, 101 profiles). Supabase security advisors show no new warning class;
`protect_session_transitions` lands only in the same RPC-exposure lint as the
other trigger functions, which is harmless — it returns `trigger`, so an RPC
call to it errors out.

### 041 — protect session transitions

Written and applied 31 Aug 2026.

All three permissive UPDATE policies on `sessions` say the same thing — "are
you the listener or the seeker?" — and none carries a `WITH CHECK`. For an
UPDATE, Postgres falls back to the `USING` expression as the check, so the test
applies to the row you are touching, never to the columns you are touching or
the values you put in them. A participant could rewrite the row freely.
Verified in rolled-back transactions, acting as the seeker:

| attempt | before |
|---|---|
| set `accepted_at` on their own pending session | **ALLOWED** |
| swap a third party in as `listener_id` | **ALLOWED** |
| flip an `ended` session back to `active` | **ALLOWED** |
| reassign `seeker_id` to someone else | blocked (implicit WITH CHECK caught it) |

Each one that got through matters:

- **`accepted_at`** is the whole of 039's accept gate, and the person it gates
  could lift it. 040 closes the forgery route into a pending session; this
  closes the front door.
- **`listener_id`** — `validate_session_participants()` (030) checks
  availability, consent and blocks, but it is a BEFORE **INSERT** trigger, so
  an UPDATE walks past it. A seeker could attach any user id they know as the
  listener, which then satisfies the session-participant branch of the
  `profiles` SELECT policy and drops that person into a conversation they never
  agreed to.
- **`status`** — ending a session is how both people, and moderators, get out
  of one. `block_user` and `end_session` end sessions as a moderation action; a
  blocked user could reopen the room and carry on, since the messages policy
  only asks that the session be `active`.

A BEFORE UPDATE trigger rather than a tighter policy, because a policy cannot
see OLD: "this column may not change" and "ended is one-way" are statements
about the transition, not about either row alone. Same shape as 028 and 030.
No-JWT callers (service role, cron, SQL editor) are exempt; admins are not,
following 028 — no admin path updates `sessions` from a browser JWT.

After, in the same rolled-back transaction: all three attacks raise, and every
legitimate client write still passes — listener taps Accept, seeker ends a
chat, seeker cancels a pending request, listener declines "Not now", and the
service role ends a session (cleanup cron, admin `end_session`, account
deletion).

### 040 — message sender integrity

Written 31 Aug 2026. **Closes a live impersonation hole and a bypass of 039's
accept gate.** Not applied — it changes production RLS, so it wants a
deliberate hand on it rather than being bundled with anything else.

`messages` had accumulated three overlapping permissive INSERT policies.
Permissive policies OR together, so the set is only as strong as its weakest
member, and `"Users can insert messages in their sessions"` checked neither
the sender nor the session status — only "are you in this session?". Either
participant could therefore insert a row attributed to the *other* one, and
into an already-ended conversation.

Two consequences:

- **Impersonation.** A seeker could write a message with
  `sender_id = <the listener's id>`. It renders as the listener's own words in
  the live chat, in `/history`, and in the admin transcript viewer — the same
  transcript a moderator reads when judging a report.
- **It defeated 039.** The accept gate allows an insert when `accepted_at is
  not null OR seeker_id is distinct from sender_id` (that second branch is
  what keeps a listener's own reply unblocked). A seeker in a *pending*
  session could satisfy it simply by forging the listener as the sender.

Verified against production data in rolled-back transactions (recipe at the
bottom of this file), forcing a real session into the pending state. Before:

| case | result |
|------|--------|
| seeker inserts as themselves, pending | blocked (42501) — 039 working |
| seeker inserts **as the listener**, pending | **ALLOWED** — gate bypassed |
| seeker inserts **as the listener**, ended | **ALLOWED** — forgery |

After applying 040 in the same rolled-back transaction, all six probes match
intent — the two holes closed, and the three legitimate paths (listener
replying while pending, which 039 depends on; seeker and listener messaging in
an accepted active session) still allowed, plus writing into an ended session
now blocked:

| case | want | got |
|------|------|-----|
| pending, seeker as self | blocked | blocked (42501) |
| pending, seeker as listener | blocked | blocked (42501) |
| pending, listener replying | ALLOWED | ALLOWED |
| active, seeker as self | ALLOWED | ALLOWED |
| active, seeker as listener | blocked | blocked (42501) |
| ended, seeker as self | blocked | blocked (42501) |

The migration drops the unsafe policy, drops the redundant twin of the safe
one (`IN (...)` vs `EXISTS (...)`, otherwise identical), and recreates the
survivor so the table ends with exactly one permissive INSERT rule. Three
near-duplicate policies are how this stayed invisible; one is the point.
Service-role writes bypass RLS and are unaffected.

Note while you are in here: 039's comment reasons that "if they're replying,
they've self-evidently accepted", and the policy lets a listener's message
through while pending on that basis — but nothing actually *sets*
`accepted_at` when they do. Today the chat UI hides the listener's composer
until they press Accept, so the case cannot arise through the app, and the
seeker would stay gated if it ever did. Left alone deliberately; if that
branch ever needs to stand on its own, it wants a trigger setting
`accepted_at` on the listener's first message, not a widened policy.

### 038 — drop unused schema

Written 24 Aug 2026 as `035_drop_unused_schema.sql`, renumbered to 038 when
this branch was rebased onto migrations 035–037 that landed from a parallel
session in the meantime. Applied 31 Aug 2026. Removed two things nothing used:

- `profiles.requesting_since` — added early and never wired up. No code writes
  it, no code reads it, every row is null. It would have given the exact
  boundary of a seeker's requesting episode, which the "we couldn't connect
  you" guard in `/api/cleanup-sessions` currently approximates with a 3-hour
  lookback — but reviving it means populating it first, at which point the
  column can be re-added.
- `public.blocks` — superseded by `user_blocks`, which carries the
  `block_type`, `expires_at`, `is_active` and audit fields the app actually
  uses. 0 rows, referenced by no code, foreign key, trigger, function or view.
  Its own policy and its two outbound foreign keys to `profiles` drop with it.

Verified empty and unreferenced before it was written; the migration re-checks
`blocks` at apply time and raises rather than dropping a table with rows in it.
Nothing in the application reads either object, so it can be applied at any
time, independent of a deploy.

Preconditions re-checked immediately before applying: `blocks` held 0 rows with
no inbound foreign keys, `requesting_since` was null on all 101 profiles, and
neither object appeared in any view or function body. After: both gone, 101
profiles and 209 sessions intact, `user_blocks` untouched.

## Applied — from the August 2026 audit

All five were applied to production on **24 Aug 2026** and verified by
impersonating a non-admin user (recipe at the bottom of this file).

| File | What it does | Verified |
|------|--------------|----------|
| `032_view_requesting_seekers.sql` | SELECT policy exposing seekers at `role_state='requesting'`; scopes the matching 'available' policy to authenticated | A non-admin can now see a waiting seeker (was 0 rows, now 1) and open the session |
| `028_protect_admin_flag.sql` | Trigger blocking `is_admin` changes from end-user JWTs | Self-promotion attempt raises `is_admin can only be changed by an administrator` |
| `029_one_active_session_per_listener.sql` | Unique partial index on `sessions(listener_id) WHERE status='active'` | No duplicates existed at apply time; index in place |
| `030_validate_session_participants.sql` | Trigger validating who a session may be created with | Session with an unavailable counterpart raises; both legitimate paths still insert |
| `031_expire_temporary_blocks.sql` | Retires blocks past `expires_at`, adds a supporting index | No expired-but-active blocks existed at apply time |

Note that `032` was the urgent one: without it no non-admin listener could see
anyone requesting support, so People Seeking was empty and every notification
tap reported "This person is no longer waiting for support". It is a read
permission, so it fixed production on its own, ahead of any deploy.

### 039 — session accept gate

Written and applied 29 Aug 2026 (as `session_accept_gate`; the file was
originally drafted as `036_session_accept_gate.sql` and renumbered to 039 when
this branch was rebased onto the real 035–037 that had landed from a parallel
session — see the note on 038 above for the same collision). Verified in
rolled-back transactions against production data before it ran: seeker
message-insert pre-accept → denied (42501 row-level security violation);
listener message-insert pre-accept → allowed; seeker message-insert
post-accept → allowed.

A direct-connect session (Listeners directory, dashboard's Available
Listeners widget, Favorites) is created and navigated into the instant the
seeker picks a listener — before that listener has seen anything. The seeker
could already send messages, which reads to them as an active conversation
with someone who is, in reality, only just being paged. Reported after two
overnight direct-connect requests both got this treatment and went
unanswered.

Adds `sessions.accepted_at` (nullable, `default now()`), NULL only when the
three direct-connect call sites explicitly pass it — every listener-initiated
path (answering a broadcast, People Seeking) keeps the default, since the
listener choosing to connect already is acceptance. Adds a `RESTRICTIVE`
policy on `messages` INSERT so a seeker cannot write into a session whose
`accepted_at` is still NULL; the listener's own messages are never blocked
(replying is self-evidently accepting). `app/chat/[id]/page.tsx` hides the
composer and starter prompts on both sides while pending and shows the
listener an Accept / Not now prompt instead — that's UX, the policy is the
actual enforcement.

**This deliberately reverses part of `f05e80c`/`284e082` (25 Aug).** Those
commits chose transparency over blocking — tell the seeker the listener's
last-active time, then invite them to "write your message straight away,"
reasoning that median reply time for answered sessions was 12s and blocking
would cost that fast-responder majority a tap for little benefit. Revisited
29 Aug against `089148f`'s fuller number from the same audit: 96 of 202
sessions (not just direct-connect) were "seeker wrote, listener never
replied" — the reassuring copy was optimizing for the responsive half while
the other, larger half kept writing into silence, which is what got reported.
The one-tap Accept costs the fast-responder case almost nothing against a 12s
median reply; the "Cancel request" option handles the 84-second-abandon case
`284e082` was written for, without requiring a message to have been sent
first. The last-active transparency line in the confirm modal stays — it's
orthogonal and still useful — but the "write immediately" copy in
`AvailableListeners.tsx` and the in-chat waiting note that told the seeker to
go ahead and type were rewritten to match the gate instead of contradicting
it.

### 036 — per-kind send switches

Applied 25 Aug 2026. `notification_kind_settings` is one row per notification
kind with an `enabled` flag an admin owns, changeable without a deploy.

This is a different question from the per-recipient consent in 035. That asks
whether a given person wants a kind of message; this asks whether we want it
going out at all yet. Both have to say yes.

The three automatic kinds (`thank_you`, `training_nudge`, `reengagement`) are
seeded **off** — they fire on a cron or an event with nobody watching, which is
the thing worth holding back. `broadcast` is seeded **on**, because it cannot
send unless an admin writes a message and presses send; its switch exists to
stop it, not to open it.

Enforced in three places, deliberately:
- `enqueueNotifications` — never creates rows for a disabled kind;
- `/api/notifications/drain` — re-checks at delivery, so switching a kind off
  *cancels* its queued backlog (`skip_reason='kind_disabled'`) instead of
  letting it drain out after the switch said stop;
- `send_broadcast` — checks before writing `user_notices`, which happens ahead
  of the enqueue and would otherwise still land in every dashboard.

Fails closed twice over: a kind with no row is disabled, so a newly added kind
ships inert; and a query error returns an empty set rather than defaulting to
send, so a database blip cannot become an unintended push to the whole
userbase.

### 035 — notification queue, message categories, training progress

Applied 24 Aug 2026 (in two parts — the main body, then
`listener_training_progress_at`). Verified by querying
`information_schema.columns` for the three profile columns and
`information_schema.tables` for both new tables.

This is what lets a push subscription mean something other than "a seeker is
waiting". Three pieces:

**Consent per category.** `profiles.announcement_notifications_enabled`
(default **true**) covers service messages — a thank-you note you were left, an
unfinished-training nudge, an admin broadcast.
`profiles.reengagement_notifications_enabled` (default **false**) covers the
monthly "it's been a while" check-in, the one thing here close enough to
marketing to require an explicit opt-in. Support-request notifications are
governed by neither: they keep the original push toggle untouched, because the
failure mode of blurring the two is someone muting push to escape an
announcement and thereby missing the notification this app exists for.

**A queue.** `notification_queue` holds one row per recipient per message;
`/api/notifications/drain` works it in bounded batches on the shared cron. Two
reasons it isn't an inline send loop: web-push is one HTTP request per
subscription, so a broadcast to every user would exhaust the serverless budget
partway through with no record of who was reached; and queued rows can be
*deferred* through the recipient's quiet hours (`not_before` moves forward)
rather than dropped. `not_before` doubles as a claim lease — a row is claimed
by setting `status='sending'` and parking `not_before` 15 minutes out, so a run
that dies mid-batch releases its rows instead of stranding them.

Idempotency is the partial unique index on
`(user_id, kind, dedupe_key) WHERE dedupe_key IS NOT NULL AND status='pending'`.
Callers set `dedupe_key` to the feedback row's id, the broadcast's id, or
`YYYY-MM` for a monthly cron, so an overlapping cron run or a client retry
cannot double-notify anyone. Excluding terminal rows is what lets a monthly key
be reused next month.

**`broadcasts`** is the audit record for an admin announcement and the parent
the queue rows hang off.

Also `profiles.listener_training_progress` (JSONB, per-section acknowledgements)
and `listener_training_progress_at`. The first fixes a standing bug — closing
the tab lost all eight acknowledgements — and the second is what lets the nudge
cron distinguish "stalled a week ago" from "working through the page right
now". Deliberately not `profiles.updated_at`, which any unrelated profile edit
bumps.

Both new tables are admin-SELECT-only with no client write policies; every
write goes through a server route using the service role.

### 034 — notification_log

Applied 24 Aug 2026. Records that a support notification went out (listener,
seeker, channel, whether the listener was stale) so the "should we stop
notifying absent listeners?" question can be answered with data. No message
content; pruned after 60 days by the cleanup cron. Analysis query:
`supabase/queries/push_conversion.sql`.

### 033 — profile visibility for people you already know

Applied 24 Aug 2026. `/history` was rendering "Anonymous" for every past
conversation and the Favourites list dropped anyone who was offline, because
profile reads required the person to be *currently* available, *currently*
requesting, or in an **active** session with you.

033 widens that to any session you shared (past or present) plus anyone you
favourited, scoped to `authenticated`. It reveals nothing new — you saw these
people's names while talking to them, and availability state is already visible
platform-wide — and it stays scoped to relationships you're part of. Measured
after applying: a user with 45 past sessions and 1 favourite could read 16 of
91 profiles (themselves, the 14 currently-available listeners, and the one
person they actually know).

### 020 was never applied until now

`020_availability_schedule.sql` had sat unapplied since it was written. The old
scheduled-availability route destructured only `data` from its profile query,
so the "column does not exist" error was thrown away and every run answered
`{"notified": 0}` with a 200 — the cron showed 1,000+ consecutive successes
while no scheduled push had ever fired, and the profile page's schedule editor
had nothing to write to. The rewritten route surfaced it as a 500, which is
what finally made it visible. Applied 24 Aug 2026; the cron is green again.

**Never assume a migration file has been run.** Check `list_migrations`, or
look for the column.

### Also applied

`027_availability_notify_dedupe.sql` came from a parallel session and adds
`profiles.last_availability_notify_key`, so a scheduled-availability push fires
once per window occurrence. Its route degrades gracefully without the column
(it logs and skips the dedupe), which is how it shipped ahead of the migration.

### End-to-end verification (24 Aug 2026)

The whole conversation lifecycle was walked as real, auth-backed, non-admin
users inside rolled-back transactions. All passed:

| Path | Result |
|------|--------|
| Seeker sees an available listener → opens chat → sends a message | works |
| Listener reads it, sees the seeker's profile, marks read, reacts, replies | works |
| Listener ends the session; seeker leaves feedback and saves a favourite | works |
| Past conversation still readable in /history | works |
| Notification tap: listener sees a waiting seeker and connects | works |
| Seeker connects to an always-available favourite who is offline | works |
| Enabling push notifications | works |
| A bystander reading someone else's conversation | 0 rows |
| A second listener taking a seeker who is already in a chat | blocked (23505) |
| A second seeker taking a listener who is already in a chat | blocked (23505) |
| Opening a chat with someone who never asked for one | blocked |
| A user promoting themselves to admin | blocked |

Two harmless leftovers turned up while testing: profiles `test 2` and
`Test Webhook User` exist with no matching `auth.users` row, so they can't log
in and can't hold push subscriptions. Zero sessions between them; they just add
2 to the profile count (91 profiles vs 89 real accounts). Safe to delete.

### Verifying the current policy set

The SQL in `supabase/legacy/` is a historical snapshot — policies edited in the
Supabase dashboard never made it back into the repo. To see what's actually
live:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

select tgname, pg_get_triggerdef(oid)
from pg_trigger
where tgrelid = 'public.profiles'::regclass and not tgisinternal;
```

**Answers as of 24 Aug 2026** (RLS is enabled — not forced — on profiles,
sessions, messages, user_blocks, user_favorites, user_notices):

- No `DELETE` policy on `profiles` — correct, deletion goes through
  `/api/account/delete` with the service role.
- `profiles` UPDATE is `auth.uid() = id`, row-level only — which is why the
  cross-user `role_state` writes were silently dropped, and why `is_admin`
  needed a trigger rather than a policy.
- `sessions` INSERT allows `(auth.uid() = listener_id) OR (auth.uid() = seeker_id)`
  with the counterpart unconstrained — what `029` closes.
- `profiles` SELECT had no policy for `role_state = 'requesting'` — what `032`
  fixes.

Worth confirming while you're in there:

- **No `DELETE` policy on `profiles`.** There shouldn't be one — account
  deletion goes through `/api/account/delete` with the service role.
- **`profiles` UPDATE is `auth.uid() = id`.** If it's broader, the
  cross-user-write bug that `/api/sessions/state` exists to fix may not have
  been happening.

## Testing a policy as a normal user

An admin can read every profile, so testing as yourself proves nothing about
what your users see. Impersonate a non-admin inside a transaction that rolls
back — nothing persists:

```sql
begin;
  select set_config('probe.seeker',
    (select id::text from profiles where is_admin is not true order by created_at asc limit 1), true);
  select set_config('probe.listener',
    (select id::text from profiles where is_admin is not true order by created_at desc limit 1), true);

  update profiles set role_state = 'requesting'
  where id = current_setting('probe.seeker')::uuid;

  select set_config('request.jwt.claims',
    json_build_object('sub', current_setting('probe.listener'), 'role', 'authenticated')::text, true);
  set local role authenticated;

  select
    (select count(*) from profiles where id = current_setting('probe.seeker')::uuid)   as seeker_visible,
    (select count(*) from profiles where id = current_setting('probe.listener')::uuid) as own_row_visible;
rollback;
```

`own_row_visible` is the control: it must be 1, or the impersonation didn't take
and the other number means nothing. Before `032`, `seeker_visible` came back 0.

## Drift found 29 Aug 2026 — undocumented migrations already live

While applying 036, `list_migrations` showed four applied migrations with no
matching file anywhere in this repo: `notification_queue`,
`training_progress_timestamp`, `notification_kind_switches`,
`listener_checkin_switch` (all dated 24–25 Aug 2026). They created three
tables not mentioned in CLAUDE.md — `broadcasts`, `notification_queue`,
`notification_kind_settings` — plus columns on `profiles`
(`announcement_notifications_enabled`, `reengagement_notifications_enabled`,
`listener_training_progress`, `listener_training_progress_at`). Nothing in
`app/` currently reads or writes `notification_queue` or `broadcasts`, so this
looks like an in-progress admin broadcast/announcement feature built directly
against the database by another session, whose migration files and app code
never made it back into this repo. Not investigated further as part of 036 —
flagged here so the next person doesn't mistake "not in the repo" for "not in
production."
