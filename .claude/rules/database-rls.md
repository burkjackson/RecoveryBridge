---
paths:
  - "supabase/**"
---

# Database, RLS and privileges

To apply a migration use the `apply-migration` skill. To test a policy use `test-rls-as-user`.

## Before reasoning about the live database
- `supabase/legacy/*.sql` is a stale snapshot. Query `pg_policies` for the real policy set.
- A migration file existing doesn't prove it ran. Query for what it creates.
- Migration `046` is retired. It replays old policies and would re-break uploads, notices and block checks. Never apply it.

## Privileges (plain Postgres, easy to get backwards)
- **A table-level GRANT beats a column-level REVOKE.** To restrict columns, revoke the table grant and grant back only the allowed columns. Check `information_schema.role_table_grants` first.
- **A SELECT policy is row-level, not column-level.** Any new `profiles` column is readable by everyone a policy lets in, unless excluded from the column grants.
- **A new client-readable `profiles` column** must be added to the SELECT grants (040). **A new client-editable one** must be added to the UPDATE grants (055). Any other new column stays unreachable from the client, which is the safe default.
- **An admin-only column** gets no client SELECT, plus a scoped `SECURITY DEFINER` function like `get_my_admin_status()` (059).
- **Revoking a column breaks every policy that reads it.** Before revoking anything on `profiles`, grep `pg_policies.qual` and `with_check` for the column. Migration 059 broke uploads, block checks and notices for 6 days this way. Postgres evaluates every permissive policy, so one bad policy breaks the whole table.
- In policies, use `(select public.is_admin())` rather than reading `profiles.is_admin` inline.
- **Revoking EXECUTE from PUBLIC doesn't touch `anon` or `authenticated`.** Default privileges give them their own grants at CREATE time. Revoke from `anon, authenticated, public` explicitly, then confirm with `information_schema.routine_privileges`.
- `is_admin()` must stay executable by `anon` and `authenticated`, because `public`-scoped policies call it.
- New `SECURITY DEFINER` trigger functions need their RPC access revoked, and a pinned `search_path`.

## Table-specific
- **`sessions` has no blanket `WITH CHECK`.** Any sensitive new column needs its own line in `protect_session_transitions()`, or a participant can rewrite it with a plain update.
- New connect rules belong in `validate_session_participants()`, not just the client.
- `user_mutes` must never reveal who reported whom. A user can only SELECT mutes they created, and the two-way exclusion set comes from `get_my_mute_counterparts()`, which returns bare ids with no direction or source (053).
- `user_notices`: only `read_at` is client-writable.
- A CHECK constraint re-runs on every UPDATE of a row, so one that existing rows fail breaks unrelated writes such as heartbeats. Check existing data first.
- `idx_notification_queue_dedupe` plus the trigger from 066 treat a `dedupe_key` as used in any status.

## Testing
An admin login hides RLS bugs, because `is_admin()` policies let admins read everything. Always test as a non-admin.
