# Agent Network Allowlist

Reference for the **narrow egress allowlist** to grant a Claude Code (web)
session so it can reach RecoveryBridge's own surfaces directly — e.g. to test
the live site end-to-end.

Network access is governed by the **environment's network policy**, set in the
environment's settings in Claude Code on the web (not from inside a running
session). Changes take effect on a **new session**. Keep the list as tight as
the task needs — Tier 1 alone covers live testing.

Docs: https://code.claude.com/docs/en/claude-code-on-the-web

## Tier 1 — Core (lets the agent test the live app)

```
recoverybridge.app
www.recoverybridge.app
```

When the agent hits `recoverybridge.app/api/...`, the **production** server does
the Resend/Supabase work with its own secrets — the session never handles keys.

## Tier 2 — Other public surfaces (add to test Stories/blog)

```
blog.recoverybridge.app
stories.recoverybridge.app
```

Ghost properties (`next.config.js` points to `blog.recoverybridge.app`).

## Tier 3 — Backend & ops (add only per task; each widens reach)

```
<your-project-ref>.supabase.co     # host in NEXT_PUBLIC_SUPABASE_URL (copy from Vercel/Supabase);
                                   # if only domains are accepted: *.supabase.co (matches next.config image host)
api.resend.com                     # only if sending email directly from a session — normally unneeded (prod sends server-side)
o4510881520943104.ingest.us.sentry.io   # Sentry ingest host (see docs/VERCEL_ENV_SETUP.md) — only for error debugging
vercel.com                         # only to check deploy status from the session
```

## Already works — do NOT add

- **npm / package registries** (`registry.npmjs.org`, `jsr.io`, `pypi.org`, …) —
  already in the proxy's bypass list.
- **GitHub** (git push + GitHub MCP tools) — handled by the built-in git relay.

## Notes

- **Wildcards:** if the policy format supports them, `*.recoverybridge.app`
  collapses Tiers 1–2 into a single entry. Otherwise list each host.
- **Recommendation:** start with **Tier 1 only**. Add Tier 3's Supabase entry
  later only if the agent needs to run the app fully against the real backend.
