---
name: apply-migration
description: Write, apply and verify a Supabase migration for RecoveryBridge. Use when adding or changing database schema, RLS policies, grants, triggers or functions, or when checking whether a migration really ran.
---

# Apply a migration

The project has no CLI migration runner, and production is the only database.

1. **Check the live state.** Query `pg_policies`, `information_schema.role_table_grants` or `information_schema.routine_privileges` for what you're changing. Don't trust `supabase/legacy/` or older docs.
2. **Check what the change could break.** If it revokes a column, grep `pg_policies.qual` and `with_check` for that column first. See `.claude/rules/database-rls.md`.
3. **Write the file** as the next number in `supabase/migrations/`, with a header explaining why.
4. **Get it applied.**
   - Claude applies a migration only when Burk asks for that in the current session. Otherwise, give Burk the SQL to paste into the Supabase SQL editor.
   - If the harness refuses a destructive statement, hand the SQL to Burk. Don't work around it.
5. **Verify it ran by querying for what it creates:** the column, policy, trigger or grant. `list_migrations` isn't enough, because it misses anything pasted into the SQL editor.
6. **Test behaviour** as a non-admin in a rolled-back transaction, using the `test-rls-as-user` skill. Cover what should now fail as well as what should still work.
7. **Update `supabase/migrations/README.md`** with what it does, how it was verified and who applied it.
8. **Check the advisors** for new security warnings. Five intentional `SECURITY DEFINER` warnings are expected.
