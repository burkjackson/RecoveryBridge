# Migrations

Numbered SQL, applied in order. Paste each into the Supabase SQL editor (the
project has no CLI migration runner wired up) and run it once.

## Pending — from the August 2026 audit

These came out of the full code audit and are **not yet applied**. Each is
independent and safe to re-run. Apply `031` first — it's fixing something
that is broken in production right now — then `027` through `030` in order.

| File | What it does | Why |
|------|--------------|-----|
| `031_view_requesting_seekers.sql` | **Run this first.** SELECT policy exposing seekers at `role_state='requesting'`; also scopes the matching 'available' policy to authenticated | Without it, People Seeking is empty and every notification tap says "no longer waiting" — for everyone except admins. Confirmed live 24 Aug 2026 |
| `027_protect_admin_flag.sql` | Trigger blocking `is_admin` changes from end-user JWTs | Without it, any signed-in user can self-promote to admin — RLS is row-level, so "update your own profile" includes that column |
| `028_one_active_session_per_listener.sql` | Unique partial index on `sessions(listener_id) WHERE status='active'` | Mirrors 025's seeker-side index; two seekers could direct-connect to one listener, stranding one of them |
| `029_validate_session_participants.sql` | Trigger validating who a session may be created with | The INSERT policy only checks the creator is a participant; the counterpart was unconstrained |
| `030_expire_temporary_blocks.sql` | Retires blocks past `expires_at`, adds a supporting index | Temporary blocks set `expires_at` but nothing ever cleared `is_active`, so a 7-day block was permanent |

### After applying

`031` should make People Seeking populate and notification taps connect, for a
non-admin account. Test with a second, non-admin login — an admin sees every
profile regardless and will tell you nothing.

`029` changes what the app is allowed to insert, so exercise each connect path
once: dashboard favourite, Available Listeners, People Seeking, and a
notification tap into `/connect`. All four already handle a rejected insert
gracefully, but it's worth seeing them do it.

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
and the other number means nothing. Before `031`, `seeker_visible` came back 0.
