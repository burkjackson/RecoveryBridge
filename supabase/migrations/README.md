# Migrations

Numbered SQL, applied in order. Paste each into the Supabase SQL editor (the
project has no CLI migration runner wired up) and run it once.

## Applied — backfilled from an abandoned branch (reconciled 4 Sep 2026)

`051` and `052` were never pasted into the SQL editor by Burk. A different
Claude session (Aug 31 2026, branch `claude/recovery-bridge-code-review-1zlgj0`,
never merged to main) had its own database access and applied both directly
to production. Found on 4 Sep 2026 while reconciling that branch — verified
still live against production before writing these files. They exist here so
the migration history matches what the database actually has; nothing below
needs to be run again, both are idempotent if it ever is.

### 051 — message sender integrity

Closes real message impersonation: `messages` had three overlapping
permissive INSERT policies, and the weakest one never checked `sender_id`
against `auth.uid()` or the session's `status`. Either participant could
insert a message attributed to the other one, including into an
already-ended conversation, and a seeker in a still-pending session could
use it to forge the listener as sender and defeat 039's accept gate. Now
exactly one permissive INSERT policy remains, requiring `sender_id =
auth.uid()` and `status = 'active'`.

### 052 — protect session transitions

Closes the front door 051 didn't: the three permissive UPDATE policies on
`sessions` all ask "are you a participant?" with no `WITH CHECK`, so a
participant could rewrite any column to any value on a row they're allowed
to touch. As the seeker: self-accept a pending session, swap in a third
party as `listener_id`, or reopen an `ended` session — all were allowed.
New `protect_session_transitions` BEFORE UPDATE trigger blocks all three
(participants and `created_at` are fixed at creation, `ended` is one-way,
and only the listener may set `accepted_at`, once). Service-role callers
(cron, server routes, SQL editor) are exempt; admins are not, since no
admin path updates `sessions` from a browser JWT anyway.

## Pending — not yet applied

### 050 — user-to-user muting

Written 3 Sep 2026 from the code review (item 24, discussed with Burk
before building — see the conversation for the product decisions). New
`user_mutes(muter_id, muted_id, session_id, source, created_at)`, modeled
directly on `user_favorites` (007): same "you can only act on someone
you've actually had a session with" RLS insert gate, same table shape.

Three differences from favorites. Enforcement is symmetric —
`validate_session_participants()` (030, extended 041/045) now also checks
`user_mutes` in both directions and rejects the session either way, so it
doesn't matter who muted whom, neither side can reach the other once a
mute exists. There's no update/delete policy yet, so nobody but a
service-role or admin action can undo one — no unmute UI in this first
version, by design. And filing a report auto-creates a mute
(`source='report'`, reporter → reported) via a new `AFTER INSERT` trigger
on `reports`, so a reporter isn't left re-matchable with someone while
their report sits unresolved — same `SECURITY DEFINER` / null-guard shape
as the other trigger functions in this set (028, 030, 041, 047).

It's silent in both directions: nobody is ever told a mute happened. The
`Users can view mutes involving themselves` policy lets each side's own
client read the mute (so their own lists can quietly filter the other
person out) without either party learning why someone disappeared from
their list.

Admin gets read access to everything (`Admins can view all mutes`,
`is_admin()`-gated) for a "muted by N people" signal next to reports.

**Verify:** the full set (manual mute succeeds given a real ended session,
blocked from both directions once a mute exists, report auto-mute fires
and stamps `source='report'`, self-mute rejected by RLS, muting someone
with no shared session rejected by RLS, an unrelated non-admin sees zero
rows, an admin sees everything) all confirmed against production in
rolled-back transactions.


### 049 — cover the FK columns real queries actually filter on

Written 3 Sep 2026 from the code review (item 23). The advisor lists 16
foreign keys with no covering index; the review named 5 to add. Checked all
16 against the app's actual query code rather than trusting either list at
face value.

Four got an index because a real query filters on them: `messages.sender_id`
and `reports.reporter_id` and `session_feedback.from_user_id` each back a
`.eq()` filter in `app/api/account/export/route.ts` (the account-data-export
endpoint); `reports.reported_user_id` backs the admin page's
`profiles!reports_reported_user_id_fkey` embed join, which PostgREST
resolves as a join on that column.

`user_notices.created_by` — the fifth column the review named — is skipped.
It's genuinely unindexed, but nothing filters by it: every real query
against `user_notices` filters by `user_id` or `kind`, and
`idx_user_notices_user_created (user_id, created_at)` plus
`idx_user_notices_kind_created (kind, created_at)` already cover both. An
index on `created_by` would have no query to serve.

The other 6 uncovered FKs the review didn't name (`broadcasts.created_by`,
`notification_kind_settings.updated_by`, `notification_log.seeker_id`,
`user_blocks.blocked_by`, `reports.resolved_by`, `reports.session_id`) got
the same check — grepped for a real `.eq()`/`.in()` filter on each — and
came up empty, same as `admin_logs` and `blog_posts.author_id`: admin-only,
low-traffic, not worth the write overhead of an index right now.

Left the 6 flagged-unused indexes alone (`idx_messages_read_at`,
`idx_reports_status`, `idx_notification_queue_broadcast`,
`idx_admin_logs_created_at`, `idx_notification_log_listener_created`,
`blog_posts_tags_idx`) — all still show `idx_scan = 0` in
`pg_stat_user_indexes` as of 3 Sep 2026, but that's not long enough to be
confident it's a real traffic window rather than a recent stat reset.
Re-check around 3 Dec 2026; drop them then if they're still at 0.

**Verify:** all four `CREATE INDEX IF NOT EXISTS` statements confirmed to
apply cleanly in a rolled-back transaction against production.


### 048 — revoke RPC access on protect_training_completion()

Written 3 Sep 2026, found while confirming item 18's leaked-password toggle
via the security advisor. `protect_training_completion()` (047) showed up as
callable by `anon` and `authenticated` at
`/rest/v1/rpc/protect_training_completion` — the same gap 045 already closed
for `handle_new_user`, `protect_admin_flag`, `protect_session_transitions`,
and `validate_session_participants`, just missed because 047 hadn't been
written yet when 045 landed. Calling it directly as an RPC would just error
(`OLD`/`NEW` aren't populated outside a real trigger context), so this isn't
a live hole — it just keeps the advisor clean.

**Verify:** `revoke execute ... from anon, authenticated, public` confirmed
to apply cleanly in a rolled-back transaction; the security advisor should
stop listing `protect_training_completion` under
`anon_security_definer_function_executable` /
`authenticated_security_definer_function_executable` once applied.

### 047 — consent and training completion from trigger, not the client

Written 3 Sep 2026 from the code review (item 17). Two independent fixes:

**Consent.** `app/signup/page.tsx` puts `consent_version`, `consent_accepted_at`,
`age_confirmed`, `health_data_consent`, and `health_data_consent_at` into
auth signup metadata (all client-controlled), and `app/onboarding/page.tsx`
later copied those same values into `profiles` with a plain client
`UPDATE` — anyone could open the console and write whatever they wanted
into their own consent record, including the timestamp. `handle_new_user()`
now copies the consent fields into the new profile row at creation time,
with `consent_accepted_at` and `health_data_consent_at` generated
server-side (`now()`) instead of trusted from the client. The boolean/version
values themselves (`consent_version`, `age_confirmed`, `health_data_consent`)
still come from signup metadata — signup is the one place consent is
actually granted, and there's no server-side source of truth for *what*
someone agreed to, only *when*. `app/onboarding/page.tsx` no longer writes
any of the five consent fields.

**Training completion.** `app/training/page.tsx` wrote
`listener_training_completed_at` directly from the client with nothing
checking that all eight sections were actually acknowledged. New trigger
`protect_training_completion` only lets the column move from `NULL` to
non-null when `listener_training_progress` has every id in
`lib/constants.ts`'s `LISTENER_TRAINING_SECTION_IDS` set to `true` — same
skip-condition shape as `protect_admin_flag` (028) and
`protect_blocked_role_state` (041), service role and direct SQL pass
through untouched. Once set, the column can't be changed again from either
direction. The section id list is a literal copy inside the trigger
function; a training section rename or addition needs both updated
together.

`app/onboarding/page.tsx`'s own listener path also sets
`listener_training_completed_at` directly (for the intent that includes
training as an onboarding step) but had never persisted
`listener_training_progress` to the DB before this — it only lived in
local component state. Fixed by writing `listener_training_progress`
in the *same* `UPDATE` call as `listener_training_completed_at`, so the
trigger's `NEW` row sees both together. `app/training/page.tsx` needed no
change — `toggleSection()` already writes progress to the DB before
`handleComplete()` can be reached.

**Verify:** as a non-admin, updating your own `listener_training_completed_at`
directly with `listener_training_progress` at less than all eight `true`
should raise `listener_training_completed_at requires every training
section acknowledged`; with the fallback default `'{}'::jsonb` from the
`profiles` table default this includes the case where progress was never
written at all. Setting it once with full progress should succeed. Trying
to change it again afterward — to any value, including clearing it — should
raise `listener_training_completed_at cannot be changed once set`. An
unrelated column edit (e.g. `bio`) on an already-completed row should pass
through untouched, confirming the trigger's early exit on a no-op change.
All four confirmed against production in rolled-back transactions before
writing this file.


### 046 — dedupe RLS policies, wrap auth.uid()

Written 3 Sep 2026 from the code review (item 13). The performance advisor
reports 96 `multiple_permissive_policies` warnings and 43
`auth_rls_initplan` warnings. Two separate fixes, no behaviour change:

**Duplicates dropped** (13 policies total). Grepping the repo for these
names before writing this turned up something worth knowing: none of the
eight true duplicates below exist in `supabase/legacy/complete-schema-setup.sql`
or `admin-schema.sql` either — they were created directly against the live
database and never captured in any file, tracked or legacy. Same class of
live-DB drift as #38 (migration 045), just RLS policies instead of
functions. The survivor in each case is the one that IS in a legacy file or
a numbered migration:

- `sessions`: `"Users can view sessions they participate in"` (dup of
  `"Users can view own sessions"`), `"Users can update sessions they
  participate in"` (dup of `"Users can update own sessions"`), `"Seekers
  can create sessions"` (subset of `"Users can create sessions"`).
- `messages`: `"Users can view messages in their sessions"` (dup of
  `"Users can view session messages"`).
- `push_subscriptions`: four separate per-command policies, all subsumed by
  the existing `FOR ALL` `"Users can manage their own push subscriptions"`.
- `user_blocks`: four separate per-command admin policies, all subsumed by
  `"Admins can manage blocks"` (`FOR ALL`, migration 016); `"Users can view
  if they are blocked"` (dup of `"Users can view own blocks"`).

**auth.uid() wrapped** as `(select auth.uid())` via `ALTER POLICY` (keeps
every name, changes nothing else) on the nine tables the review named —
`profiles`, `sessions`, `messages`, `message_reactions`,
`session_feedback`, `user_favorites`, `user_notices`, `push_subscriptions`,
`reports` — plus `user_blocks`, which the review's list left out but which
the live advisor flags for the same reason (`"Admins can manage blocks"`
and `"Users can view own blocks"` both call `auth.uid()` directly).
`is_admin()`-only policies aren't touched — no bare `auth.uid()` in the
policy text for the advisor to flag. `admin_logs`, `blog_posts`,
`broadcasts`, and the `notification_*` tables also show
`auth_rls_initplan` warnings but are out of scope here — none were in the
review's list, and they're admin/system tables with few rows where the
per-row cost doesn't matter the way it does on `sessions` or `messages`.

Every `ALTER POLICY` statement reuses each policy's existing expression
verbatim with only `auth.uid()` → `(select auth.uid())` changed. Confirmed
in a rolled-back transaction against production: the full migration applies
without error, the resulting `pg_policies` row count for each table matches
expectations exactly (`sessions` 8→5, `messages` 6→5, `push_subscriptions`
5→1, `user_blocks` 7→2), and an impersonated seeker, listener, and
unrelated third uuid against the same real session row got the same
before/after result (seeker: visible, listener: visible, stranger: not
visible).

**Verify**: run the query at the top of the migration file before and
after applying, and confirm the row counts above. Then, using the
impersonation recipe below, confirm a real seeker and a real listener can
each still see their own session, and an unrelated uuid can't:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','<uuid>','role','authenticated')::text, true);
select count(*) from sessions where id = '<a real session id>';
rollback;
```

### 038 — drop unused schema

Written 24 Aug 2026 as `035_drop_unused_schema.sql`, renumbered to 038 when
this branch was rebased onto migrations 035–037 that landed from a parallel
session in the meantime. Not applied. Removes two things nothing uses:

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

**Extended 3 Sep 2026** (code review item 21) to also drop two more unused
`profiles` columns, found the same way — grepped `app/`, `lib/`, and
`components/` for both names, zero hits:

- `bubble_user_id` (text) — null on all 108 profile rows in production as of
  this check.
- `is_suspended` (boolean, default `false`) — false on all 108 rows.
  Suspension/blocking is handled entirely by `user_blocks` (016, 031, 041);
  this column was never wired up to it.

Same guard pattern as `blocks`: a `do $$ ... $$` block re-checks both
columns are still all-null / all-false at apply time and raises rather than
dropping data. Confirmed the full migration (all four drops) applies cleanly
in a rolled-back transaction against production before writing this.

### 042 — storage policies

Written 2 Sep 2026 from the code review. Live `storage.objects` policy
"Authenticated users can manage avatars" was `FOR ALL` on just
`bucket_id = 'avatars'` with no ownership check — any signed-in user could
upload, overwrite, or delete anyone's avatar. Three leftover template
policies ("Give anon users access to JPG images in folder 1oj01fe_0/_1/_2")
let the **anon** role INSERT/UPDATE jpg files under `avatars/public/` —
unauthenticated uploads. Neither `avatars` nor `blog-images` had a
`file_size_limit` or `allowed_mime_types`. `blog-images` still accepted
authenticated uploads even though the blog moved to Ghost.

Drops all four of those and replaces them with INSERT/UPDATE/DELETE
policies scoped to `(storage.foldername(name))[1] = auth.uid()::text OR
name LIKE auth.uid()::text || '-%'` — the OR keeps existing root-level
`${userId}-${timestamp}.jpg` files manageable by their owner while new
uploads move to a `${userId}/${timestamp}.jpg` folder
(`components/AvatarUpload.tsx`). Public SELECT on `avatars` is untouched —
the bucket is public and `avatar_url` is a public URL. Set a 2 MB / jpeg+png+webp limit on `avatars` (corrected to 5 MB by 043 —
see below, `AvatarUpload.tsx` already validated up to 5 MB client-side and
2 MB silently rejected anything bigger that the client had accepted),
drops the open `blog-images` INSERT policy, keeps its public SELECT so old
post images still resolve, and caps its size too.

**Verify**: impersonate two distinct non-admin uuids (the recipe below).
As user A, inserting into `storage.objects` with `bucket_id = 'avatars'`
and a name under user B's folder should raise `42501 new row violates
row-level security policy`; a name under A's own folder, or the legacy
`A-<anything>` root form, should succeed. As `anon` (no JWT), inserting
into `avatars` should raise the same `42501` — no policy grants anon
INSERT anymore. As an authenticated user, inserting into `blog-images`
should also raise `42501`.

### 041 — enforce blocks

Written 2 Sep 2026 from the code review. `user_blocks` was only checked at
session creation, and only against the creator — a blocked user could still
flip `role_state` to `requesting`/`available`, get pushed to every listener
via `/api/notifications/send` (which didn't check either), and be connected
to by any listener who answered. Adds `is_user_blocked(uuid)` (mirrors
`lib/blocks.ts`'s `getActiveBlock()`), replaces `validate_session_participants()`
(030) to check both participants instead of just the creator, does a
one-time fix of any currently-blocked profile stuck at
available/requesting/always_available, and adds a trigger
(`protect_blocked_role_state`) stopping a blocked end user from setting
those going forward. App-side (already merged): `/api/notifications/send`
now checks the caller's block status and, for the broadcast path, that
they're actually `requesting`; the dashboard shows a restricted notice
instead of the role buttons and `setRoleState` refuses locally too; admin
`block_user` now force-sets the blocked user's own `role_state` to
`offline` immediately instead of only cleaning up if they were mid-session.

**Verify**: impersonate a blocked non-admin uuid and confirm `update
profiles set role_state = 'requesting' where id = <blocked-id>` raises
`Your account is currently restricted`, and that inserting a session naming
a blocked user as either participant raises from
`validate_session_participants`. Then confirm an *unblocked* user can still
set `role_state` normally — this trigger should never fire for them.

### 045 — function hygiene, live DB drift

Written 2 Sep 2026 from the code review plus a fresh live-vs-repo diff. Four
things:

1. `protect_session_transitions()` was live on `sessions` (locks
   participants and `created_at`, makes ending one-way, restricts
   `accepted_at` to a single listener-only transition) with **no migration
   file behind it**. Written here verbatim from the live
   `pg_get_functiondef()` output — this documents what's running, it
   doesn't change it.
2. Six functions were missing `search_path`, confirmed via the security
   advisor (`function_search_path_mutable`, all six):  `is_admin`,
   `restrict_message_update`, `handle_updated_at`, `update_updated_at_column`,
   `update_blog_posts_updated_at`, `cleanup_stale_availability`. The first
   five get `alter function ... set search_path = public`; the sixth is
   dropped instead (see 4).
3. `handle_new_user`, `protect_admin_flag`, `protect_session_transitions`,
   and `validate_session_participants` — all `SECURITY DEFINER` trigger
   functions — were callable via `/rest/v1/rpc/...` by anon and
   authenticated. Trigger functions never need RPC access; revoked
   explicitly from `anon, authenticated, public`. Two more got the same fix
   that weren't in the original review (they didn't exist when it was
   written — migration 041, same day): `protect_blocked_role_state()` and
   `is_user_blocked(uuid)`. The latter is a direct correction of a live bug:
   041's `revoke execute ... from public` didn't actually revoke anon's
   access, because Supabase's default privileges grant EXECUTE directly to
   `anon`/`authenticated` on every new function, independent of `PUBLIC` —
   see CLAUDE.md Known Issue #37. `is_admin()` is deliberately **not**
   revoked from anon — several `public`-scoped RLS policies call it
   directly, and revoking anon's EXECUTE would turn every anon-role query
   against `profiles`/`sessions`/`messages`/`reports`/`user_blocks` into a
   hard permission error instead of a quiet "not admin".
4. `cleanup_stale_availability()` dropped — dead (CLAUDE.md #17) and wrong
   even when it ran (5-minute threshold, no `always_available` exception,
   versus the two-week/excluded-always-available logic
   `resetStaleAvailability()` actually uses).

**Verify**: after applying, re-run the security advisor
(`get_advisors(type: 'security')`) — the six `function_search_path_mutable`
warnings and the four original `anon`/`authenticated`
`SECURITY DEFINER`-executable warnings (`handle_new_user`,
`protect_admin_flag`, `protect_session_transitions`,
`validate_session_participants`) should be gone; `is_admin` will still show
as anon/authenticated-executable — that one's intentional, not a leftover.
Confirm a normal session insert and update still work (the internal trigger
chain runs as the function owner regardless of the caller's own grants, so
this should be unaffected — verified in a rolled-back transaction before
this migration was handed over). Confirm `select public.validate_session_participants()`
called directly as an impersonated `authenticated` user now raises
`42501 permission denied for function validate_session_participants`.

### 044 — reports privacy

Written 2 Sep 2026 from the code review. `public.reports` had two SELECT
policies: "Users can view own reports" (`reporter_id = auth.uid()`) and a
duplicate, "Users can view their own reports"
(`auth.uid() = reporter_id OR auth.uid() = reported_user_id`) — the OR let
the reported party read `reporter_id`, `description`, and
`resolution_notes` for a report filed against them. Nothing in `app/` reads
reports as the reported user; every path is either the reporter's own view
or the admin queue. Drops the wide policy, leaves the reporter-only one in
place.

**Verify**: impersonate a non-admin uuid that is `reported_user_id` on some
report and confirm `select * from reports where id = <that report>` returns
0 rows after applying (it returned the row before). Then confirm the
reporter's own uuid still gets the row back — this should never regress.

### 043 — avatar bucket size limit

Written 2 Sep 2026, same day as 042. 042's file_size_limit of 2 MB on the
avatars bucket was picked from the code review's suggested number without
checking it against `components/AvatarUpload.tsx`'s existing client-side
check, which already allows up to 5 MB. A 2-5 MB file passed the client
check and then got silently rejected by storage — raises the bucket limit
to 5 MB to match what the app already validates, instead of picking a new
number.

**Verify**: `select file_size_limit from storage.buckets where id =
'avatars'` should read `5242880` after applying.

### 040 — profile column privacy

Written 2 Sep 2026 from the code review. Every SELECT policy on `profiles`
is row-level (see CLAUDE.md RLS gotcha #19 below), so any column added to
the table is readable by whoever a policy lets in — confirmed in
production: a non-admin selecting `email` from another member's row
returned it. Revokes table-level SELECT on `profiles` from `authenticated`
and `anon` entirely, then grants SELECT back on only the public-facing
columns; adds `get_my_private_profile()` — a SECURITY DEFINER RPC scoped to
`auth.uid()` — for a client to read its own sensitive fields (email,
phone_number, referral_source, quiet-hours settings, consent timestamps,
sms/email/announcement/reengagement flags, availability_schedule, listener
training progress) back.

**The first draft of this migration was wrong and was applied live 2 Sep
2026 without catching it.** It revoked column-level SELECT on the sensitive
columns while leaving the pre-existing blanket `grant select on table
profiles to authenticated, anon` in place — a no-op, since Postgres table-
and column-level grants are additive (a table-level SELECT grant makes
every column readable regardless of any column-level revoke). Re-checked
with the same impersonation recipe immediately after applying and `email`
still came back. Corrected the same day by revoking the table-level grant
outright and granting column-level SELECT back on only the public columns —
see CLAUDE.md gotcha #20. The `get_my_private_profile()` function from the
first draft was harmless and is unchanged; only the grant/revoke shape
changed. **As of this writing the corrected version has not yet been
re-applied to production** — the first (ineffective) draft is what's live,
so the email leak is still open. Re-run the corrected file in full; it's
idempotent against the half-applied state (the `revoke select on table`
sweeps up whatever the first draft left, `create or replace function`
handles the RPC either way).

App changes that go with it (already merged, work against either version of
the migration): `app/profile`, `app/dashboard`, and `app/training` now
fetch public columns via a plain `select()` and private ones via the RPC
and merge them; three `update().select()` calls that would have 403'd
reading back their own writes (email notifications, quiet hours,
notification-category toggles, availability schedule) now merge the
written value locally instead of round-tripping. `app/admin`'s user list
and sign-ups queries moved to two new service-role actions (`list_users`,
`list_signups`) on `/api/admin/actions`, since the revoke applies
regardless of `is_admin()`. `lib/types/database.ts`'s `Profile` type marks
every revoked field optional so a plain profiles read can't be typed as
carrying them.

**Verify** with the impersonation recipe below: as a non-admin, `select
email from profiles where id = auth.uid()` (own row!) should now error
rather than return a value — testing against another user's row isn't
enough, since a false negative there could just mean no row was visible at
all (own-row visibility is guaranteed by policy, so it isolates the column
grant from row-level RLS). `select display_name from profiles where id =
auth.uid()` should still work. Calling `get_my_private_profile()` as that
same non-admin should return their own private fields. Then click through
`/profile`, `/dashboard`, and `/training` as a non-admin and confirm
nothing breaks — those three pages are the ones actually exercising this.

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
