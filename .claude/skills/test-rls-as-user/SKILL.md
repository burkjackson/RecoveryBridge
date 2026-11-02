---
name: test-rls-as-user
description: Test an RLS policy or grant as a specific non-admin user without a second login, using impersonation in a rolled-back transaction. Use when verifying a policy, debugging "permission denied" or empty results, or checking what a member can see.
---

# Test RLS as a user

Admin accounts hide RLS bugs, so always test as a non-admin.

1. Pick the UUIDs you need: the acting user, plus a counterpart or a stranger for the negative case.
2. Run the check inside a transaction that always rolls back:

```sql
begin;
select set_config('request.jwt.claims', json_build_object('sub','<uuid>','role','authenticated')::text, true);
set local role authenticated;
-- the query or write being tested
rollback;
```

3. Test both directions: what this user should be able to do, and what they shouldn't.
4. For writes, check the affected row count as well as errors. A write blocked by RLS often affects zero rows with no error.
5. Report counts and pass or fail, not member data. Results can include private recovery information, so don't paste rows into docs, commits or chat.
