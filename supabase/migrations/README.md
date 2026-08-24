# Migrations

Numbered SQL, applied in order. Paste each into the Supabase SQL editor (the
project has no CLI migration runner wired up) and run it once.

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
- `profiles` SELECT had no policy for `role_state = 'requesting'` — what `031`
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
