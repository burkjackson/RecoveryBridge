-- 039: a direct-connect session isn't "live" until the listener accepts it.
-- (Written and applied as "session_accept_gate", originally drafted as 036;
-- renumbered to 039 after a rebase picked up the real 035-037 from a
-- parallel session — see migrations/README.md.)
--
-- Direct connect (Listeners directory, dashboard's Available Listeners widget,
-- Favorites) creates an `active` session and drops the seeker straight into
-- /chat the instant they pick a listener — before that listener has seen or
-- responded to anything. The seeker could already type and send, which reads
-- to them as an open conversation with someone who is, in reality, simply
-- being paged. Two seekers hit this and got silence: real, but indistinguishable
-- from being ignored.
--
-- sessions.accepted_at marks the moment a session is actually live:
--   - NULL            = pending. Only ever set that way by the three
--                       seeker-initiated direct-connect call sites, which pass
--                       accepted_at: null explicitly.
--   - a timestamp      = accepted. The default (now()) covers every other
--                       creation path — a listener answering a broadcasting or
--                       directly-requesting seeker (app/connect, PeopleSeeking)
--                       already chose to connect, which IS acceptance, so
--                       those inserts don't need to say anything special.
--
-- The chat page hides the composer (and starter prompts) from both sides while
-- pending, and shows the listener an Accept / Not now prompt instead. That's
-- UI, not enforcement — the restrictive policy below is what actually stops a
-- seeker's message from landing while the session is pending, regardless of
-- what the client does or doesn't render.

alter table public.sessions add column accepted_at timestamptz default now();

-- Every session that already existed was, under the old model, live from the
-- moment it was created — backfill with created_at rather than "now" so
-- historical rows don't all collapse onto one accept time.
update public.sessions set accepted_at = created_at;

-- RESTRICTIVE policies AND with the existing permissive INSERT policies on
-- messages (which OR together) rather than adding another way in — this is
-- the only way to add a "must also be true" rule without touching the
-- pre-existing, overlapping policies (see supabase/migrations/README.md on
-- messages INSERT policy drift).
--
-- The listener's own messages are never blocked, even while accepted_at is
-- still NULL: if they're replying, they've self-evidently accepted, and
-- forcing an extra click first would just be friction. Only the seeker side
-- is gated.
create policy "Seeker cannot message before listener accepts"
  on public.messages
  as restrictive
  for insert
  with check (
    exists (
      select 1 from public.sessions
      where sessions.id = messages.session_id
        and (
          sessions.accepted_at is not null
          or sessions.seeker_id is distinct from messages.sender_id
        )
    )
  );
