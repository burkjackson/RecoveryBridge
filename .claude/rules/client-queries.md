---
paths:
  - "app/**"
  - "components/**"
  - "lib/**"
---

# Client Supabase queries

- **Guard every embedded profile.** Embeds like `favorite_profile:profiles!fkey(...)` are non-inner joins, so RLS returns the embed as `null` rather than dropping the row, and dereferencing it crashes the render. Use `normalizeFavorites()` (`lib/favorites.ts`) or `?.display_name || 'fallback'`. Use `!inner` only if you want RLS to filter the whole row.
- **A client can only write its own `profiles` row.** Updating someone else's silently affects zero rows with no error. Anything that moves both chat participants goes through `/api/sessions/state`.
- **A zero-row delete looks like success.** Same trap for any "delete my own X" without a DELETE policy; use a server route.
- **Never use a bare `.select()` or `select('*')` on `profiles`.** Returning columns the client can't read raises a permission error, which rolls back the update it was attached to.
- Read your own private columns with `get_my_private_profile()`, and your admin status with `get_my_admin_status()`.
- Report failed reads with `Sentry.captureException`. `console.error` doesn't reach Sentry here, and swallowed read errors hid a 6-day outage (#65).
- Destructuring only `data` discards the error. Check `error` too, or a missing column looks like an empty result (#2).
