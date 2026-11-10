# RecoveryBridge

Peer-to-peer support for people in addiction recovery. **Seekers** (needing support) and **listeners** (offering it) connect in real-time 1:1 chats, like an anonymous, on-demand peer support hotline.

- **Live:** https://recoverybridge.app (Vercel, auto-deploys from `main`)
- **The GitHub repo (`burkjackson/RecoveryBridge`) is public.** Treat anything committed as disclosed, and keep member details out of the repo.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, React 18, TypeScript) |
| Database | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Styling | Tailwind CSS 3.4, custom theme, class-based dark mode |
| Push | web-push (VAPID) + service worker |
| Email | Resend |
| SMS | Twilio, disabled pending verification |
| Errors | Sentry (`@sentry/nextjs`) |
| Image cropping | react-easy-crop |
| Hosting | Vercel |
| Cron | Supabase pg_cron every 10 min (primary); GitHub Actions and daily Vercel crons (backups) |

## Folder layout

```
app/
├── api/            # Route handlers: sessions, notifications, admin, account, cron routes
├── admin/          # Moderation dashboard
├── chat/[id]/      # Real-time 1:1 chat
├── connect/        # Notification-tap landing; asks the listener to confirm
├── dashboard/      # Main hub: role selection, listeners, seekers
├── history/ listeners/ onboarding/ profile/ training/
├── login/ signup/ forgot-password/ reset-password/
└── support/ contact/ donate/ safety/ terms/ privacy/ offline/   # Public pages
components/         # Shared UI; ui/Typography.tsx is the type scale
lib/                # Shared logic and tests (*.test.ts); supabase/ holds the clients
supabase/
├── migrations/     # 001–069 plus README.md, the record of what each one does
└── legacy/         # Stale snapshot; don't trust it, query pg_policies
docs/               # Reference docs; all public
public/sw.js        # Service worker
middleware.ts       # Route protection (auth + admin check)
.claude/rules/      # Instructions that load for matching paths
.claude/skills/     # Step-by-step procedures
.github/workflows/  # ci.yml (every push), cron.yml (backup pings)
```

## How the product works

- **Seeker:** "I Need Support" sets `role_state='requesting'` and pushes to available listeners, re-notifying every 2 min, up to 3 times. A listener confirms, a session is created, and the seeker moves to `/chat/[id]`.
- **Direct connect:** a seeker picks a listener. The session starts pending (`accepted_at IS NULL`), and nobody can chat until the listener accepts.
- **Chat:** realtime messages with a 5-minute edit window, read receipts, reactions and a crisis banner. Inactivity warns at 15 min and closes 5 min later. Ending leads to feedback.
- **Notifications:** support requests and chat messages send directly. Everything else goes through `notification_queue`.
- **Admin:** all mutations go through `/api/admin/*` (Bearer token → `is_admin` check), never client-side Supabase.
- **Routes:** `middleware.ts` uses `@supabase/ssr` cookie sessions. `/dashboard`, `/chat`, `/profile`, `/listeners`, `/training`, `/history`, `/connect` and `/admin` send signed-out users to `/login?redirect=`. `/onboarding` sends them to `/signup`. `/admin` also requires `is_admin`, else → `/dashboard`.
- **Constants:** `lib/constants.ts` is the source of truth for timing, validation, tags and copy.
- **SMS:** fully coded but disabled.

## Hard rules

### Safety and privacy
- People using this may be in crisis. Crisis help must stay reachable in every chat state.
- Push text renders on a locked phone. It must never quote the other person or imply why the recipient uses RecoveryBridge. Support-request, direct-connect and chat-message pushes show the other person's username on purpose, so the recipient knows who they're connecting with; queued notifications name no one.
- Never commit member data: user IDs, display names, per-account behaviour or message content. Put aggregate numbers in docs.
- Don't fold other notifications into the support-request toggle. Someone muting an announcement must still hear that a person needs support.

### Database
- Migration `046` is retired. **Never apply it.**
- A migration file existing doesn't prove it ran. Query for what it creates. `list_migrations` misses anything pasted into the SQL editor.
- Claude applies a migration only when Burk asks in that session. Otherwise, hand over the SQL for him to paste. Use the `apply-migration` skill.
- Never use a bare `.select()` or `select('*')` on `profiles` from the client.
- Admin logins hide RLS bugs. Test as a non-admin with the `test-rls-as-user` skill.
- Every table has RLS, and a blocked write often affects zero rows with no error.

### Code
- Never construct a Resend or service-role Supabase client at module scope in a route. Next imports every route while collecting page data during the build, so a constructor that throws on a missing key turns one absent env var into a failed deploy for the whole site. The build must succeed with no server secrets set.
- Anything that ends a session server-side must also move role state (`endSessionRoleStates()`).
- `admin`, `chat`, `profile` and `dashboard` pages are large. Extract components rather than adding to them.
- Effects with trimmed dependency arrays carry `// eslint-disable-next-line react-hooks/exhaustive-deps -- <reason>`, so a genuinely new warning stands out.
- `next` is pinned below 16, with `postcss` and `sharp` overrides in `package.json`. Revisit them when upgrading.

### Measuring
- "Connected" isn't "helped". A `sessions` row only means someone tapped connect, so any question about whether people are being helped must count **listener replies**.
- A cron 200 doesn't prove a feature works; check what it actually did.

## Quality gates

Keep all of these clean:

```
npm test          # vitest; all pass (coverage areas in docs/architecture.md)
npx tsc --noEmit  # no type errors
npx eslint .      # 0 errors, 0 warnings
npm audit         # 0 vulnerabilities
npm run build     # succeeds with NO server secrets set
```

## Git and deploy

- **Pushing to `main` deploys to production** (Vercel project `recovery-bridge`, team `burkjacksons-projects`).
- Solo project: commit to `main` directly or merge worktree branches into it. **Never open PRs.**
- CI runs typecheck, lint, test and build on every push, with no secrets.
- Domains: recoverybridge.app (+www). Stories live on Ghost at blog.recoverybridge.app (the canonical host), not in this app.
- Fetch and compare with `origin` before auditing; the local checkout can fall behind.

## Environment variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`, `CLEANUP_SECRET_KEY` (also a GitHub Actions secret), `RESEND_API_KEY`. Optional ones are listed in `docs/architecture.md`.

## Burk's preferences

- **Email drafts for manual sending (Gmail):** plain linear text only, with short paragraphs, one instruction per line and full URLs written out. No Markdown structure (bold markers, numbered lists with inline links, arrows, tables); it collapses into unreadable columns when pasted into Gmail.

## Where everything else lives

Read these when relevant; they aren't loaded automatically.

| Need | Look in |
|------|---------|
| File-by-file map, schema, detailed flows | `docs/architecture.md` |
| Open work and dated follow-ups | `docs/open-issues.md` |
| Why something is the way it is; "Known Issue #N" in code comments | `docs/fixed-issues-history.md` |
| What each migration does | `supabase/migrations/README.md` |

Rules in `.claude/rules/` load automatically for matching files: `database-rls`, `client-queries`, `sessions-connect`, `notifications`, `service-worker`, `chat-crisis`, `cron`, `design-system`.

Skills: `apply-migration`, `test-rls-as-user`, `check-cron-health`.
