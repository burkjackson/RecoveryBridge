-- 051: a participant may only insert messages AS THEMSELVES, into a LIVE session.
--
-- BACKFILL — this documents a change already live in production, applied
-- directly on 31 Aug 2026 by a different Claude session working on its own
-- branch (never merged to main). That branch is otherwise abandoned; this
-- file exists so the migration history here matches what the database
-- actually has, rather than silently missing it. The SQL below is unchanged
-- from what actually ran and is idempotent, so re-running it is a no-op.
--
-- `messages` had accumulated three overlapping permissive INSERT policies.
-- Permissive policies OR together, so the set is only ever as strong as its
-- weakest member — and one of them checked neither the sender nor the
-- session status:
--
--   "Users can insert messages in their sessions"  (the weak one)
--     EXISTS (select 1 from sessions
--              where sessions.id = messages.session_id
--                and (sessions.listener_id = auth.uid()
--                     or sessions.seeker_id = auth.uid()))
--
-- It asks "are you in this session?" and nothing else. It never compares
-- `sender_id` to `auth.uid()`, so either participant could write a row
-- attributed to the OTHER one, and it never checks `status`, so either could
-- write into a conversation that had already ended.
--
-- Two consequences, verified against production data in rolled-back
-- transactions at the time:
--
--   1. Impersonation. A seeker could insert a message with
--      `sender_id = <listener's id>`. It renders as the listener's own words
--      in the live chat, in /history, and in the admin transcript viewer —
--      the same transcript moderators read when deciding a report.
--
--   2. It defeated migration 039. The accept gate's restrictive policy allows
--      an insert when `accepted_at is not null OR seeker_id is distinct from
--      sender_id` — the second branch exists so a listener's own reply is
--      never blocked. Combined with the weak policy above, a seeker sitting
--      in a *pending* session could satisfy that branch by forging the
--      listener as the sender.
--
-- The other two permissive policies were already correct and semantically
-- identical to each other. Keeping one and dropping the other two leaves
-- exactly one permissive INSERT rule on this table — three near-duplicate
-- policies are how a hole like this stays invisible for months.
--
-- Service-role writes (the cron routes, /api/sessions/state) bypass RLS
-- entirely and are unaffected.

drop policy if exists "Users can insert messages in their sessions" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Users can send messages in their sessions" on public.messages;

create policy "Users can send messages in their sessions"
  on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.sessions
      where sessions.id = messages.session_id
        and (sessions.listener_id = auth.uid() or sessions.seeker_id = auth.uid())
        and sessions.status = 'active'
    )
  );
