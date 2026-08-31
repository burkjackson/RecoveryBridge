-- 040: a participant may only insert messages AS THEMSELVES, into a LIVE session.
--
-- `messages` accumulated three overlapping permissive INSERT policies over
-- time. Permissive policies OR together, so the set is only ever as strong as
-- its weakest member — and one of them checked neither the sender nor the
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
-- Two consequences, both verified against production data in rolled-back
-- transactions using the impersonation recipe at the bottom of README.md:
--
--   1. Impersonation. A seeker could insert a message with
--      `sender_id = <listener's id>`. It renders as the listener's own words
--      in the live chat, in /history, and in the admin transcript viewer — the
--      same transcript moderators read when deciding a report. On a peer
--      support platform, words put in a listener's mouth are about the worst
--      thing the schema can be made to say.
--
--   2. It defeated migration 039. The accept gate's restrictive policy allows
--      an insert when `accepted_at is not null OR seeker_id is distinct from
--      sender_id` — the second branch exists so a listener's own reply is
--      never blocked. Combined with the weak policy above, a seeker sitting in
--      a *pending* session could satisfy that branch by simply forging the
--      listener as the sender. The probe ran all three cases against a session
--      forced into the pending state:
--        A. seeker inserts as themselves, pending  -> blocked (42501)  [039 works]
--        B. seeker inserts AS THE LISTENER, pending -> ALLOWED         [bypass]
--        C. seeker inserts AS THE LISTENER, ended   -> ALLOWED         [forgery]
--
-- The other two permissive policies were already correct and are semantically
-- identical to each other (`IN (...)` vs `EXISTS (...)`, same three
-- conditions). Keeping one of them and dropping the other two leaves exactly
-- one permissive INSERT rule on this table, which is the point: three
-- near-duplicate policies are how a hole like this stays invisible for months.
-- Nothing legitimate is lost — every real insert comes from a participant
-- sending as themselves in an active session, which the surviving policy
-- allows, and 039's restrictive policy still ANDs on top of it.
--
-- Service-role writes (the cron routes, /api/sessions/state) bypass RLS
-- entirely and are unaffected.

-- The unsafe one. This is the actual fix.
drop policy if exists "Users can insert messages in their sessions" on public.messages;

-- The redundant duplicate of the policy kept below. Dropped so the table has a
-- single INSERT rule to reason about, not two that must be kept in sync.
drop policy if exists "Users can send messages" on public.messages;

-- Recreated rather than assumed: this migration must leave the table in a
-- known-good state even if the surviving policy had also drifted.
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
