# Migrations

Numbered SQL, applied in order. Paste each into the Supabase SQL editor (the
project has no CLI migration runner wired up) and run it once.

## Pending — from the August 2026 audit

These four came out of the full code audit and are **not yet applied**. Apply
them in order; each is independent and safe to re-run.

| File | What it does | Why |
|------|--------------|-----|
| `027_protect_admin_flag.sql` | Trigger blocking `is_admin` changes from end-user JWTs | Without it, any signed-in user can self-promote to admin — RLS is row-level, so "update your own profile" includes that column |
| `028_one_active_session_per_listener.sql` | Unique partial index on `sessions(listener_id) WHERE status='active'` | Mirrors 025's seeker-side index; two seekers could direct-connect to one listener, stranding one of them |
| `029_validate_session_participants.sql` | Trigger validating who a session may be created with | The INSERT policy only checks the creator is a participant; the counterpart was unconstrained |
| `030_expire_temporary_blocks.sql` | Retires blocks past `expires_at`, adds a supporting index | Temporary blocks set `expires_at` but nothing ever cleared `is_active`, so a 7-day block was permanent |

### After applying

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

Worth confirming while you're in there:

- **No `DELETE` policy on `profiles`.** There shouldn't be one — account
  deletion goes through `/api/account/delete` with the service role.
- **`profiles` UPDATE is `auth.uid() = id`.** If it's broader, the
  cross-user-write bug that `/api/sessions/state` exists to fix may not have
  been happening.
