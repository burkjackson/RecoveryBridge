-- 062: let a sender edit their own message for 5 minutes after sending it,
-- while keeping every earlier version where a moderator can still read it.
--
-- Until now restrict_message_update() (004, search_path pinned in 045)
-- refused any change to `content` outright, and the only UPDATE policy on
-- messages ("Users can mark received messages as read", 002) is for the
-- RECIPIENT. Both stay in force for read receipts; this adds a narrow path
-- for the sender.
--
-- The rules, all enforced here rather than in the chat page:
--   * only the sender, signed in as themselves (service role can't edit
--     either — nothing server-side has a reason to rewrite someone's words)
--   * only within 5 minutes of created_at (lib/constants.ts
--     TIME.MESSAGE_EDIT_WINDOW_MS mirrors this for the UI)
--   * only while the session is still active
--   * the new text is trimmed, non-empty, and at most 2000 characters
--   * edited_at is set by the trigger, never by the client
--   * at most 10 edits per message
--
-- Why keep the old text: a report is decided from the transcript. If a
-- message could be quietly rewritten, someone could say something cruel,
-- get reported, and tidy it up before an admin looked. message_edits keeps
-- every prior version, readable only by admins (and by the sender in their
-- own data export, via the service role). The crisis flag route
-- (/api/sessions/flag-crisis) scans these too, so editing crisis language
-- away doesn't un-see it.

alter table public.messages add column if not exists edited_at timestamptz;

create table if not exists public.message_edits (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  previous_content text not null,
  edited_at timestamptz not null default now()
);

create index if not exists idx_message_edits_message on public.message_edits (message_id, edited_at);
create index if not exists idx_message_edits_session on public.message_edits (session_id);
create index if not exists idx_message_edits_sender on public.message_edits (sender_id);

alter table public.message_edits enable row level security;

-- Nobody writes this table from a browser; the SECURITY DEFINER trigger
-- below is the only writer. Revoke the Supabase default grants outright
-- (see Known Issue #20: a table-level grant can't be narrowed any other way).
revoke all on public.message_edits from anon, authenticated;
grant select on public.message_edits to authenticated;

drop policy if exists "Admins can view message edits" on public.message_edits;
create policy "Admins can view message edits"
  on public.message_edits
  for select
  to authenticated
  using ((select public.is_admin()));

-- The sender's UPDATE path. RLS picks the rows; the trigger decides what
-- may change on them.
drop policy if exists "Senders can edit their own recent messages" on public.messages;
create policy "Senders can edit their own recent messages"
  on public.messages
  for update
  to authenticated
  using (
    sender_id = (select auth.uid())
    and created_at > now() - interval '5 minutes'
    and exists (
      select 1 from public.sessions
      where sessions.id = messages.session_id
        and sessions.status = 'active'
        and (sessions.listener_id = (select auth.uid()) or sessions.seeker_id = (select auth.uid()))
    )
  )
  with check (sender_id = (select auth.uid()));

create or replace function public.restrict_message_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if NEW.id is distinct from OLD.id
     or NEW.sender_id is distinct from OLD.sender_id
     or NEW.session_id is distinct from OLD.session_id
     or NEW.created_at is distinct from OLD.created_at then
    raise exception 'Only read_at or content can be updated on messages';
  end if;

  if NEW.content is distinct from OLD.content then
    if v_uid is null or v_uid <> OLD.sender_id then
      raise exception 'Only the sender can edit a message';
    end if;
    if OLD.created_at < now() - interval '5 minutes' then
      raise exception 'This message can no longer be edited';
    end if;
    if NEW.read_at is distinct from OLD.read_at then
      raise exception 'Edit a message and mark it read in separate updates';
    end if;
    if not exists (
      select 1 from public.sessions
      where id = OLD.session_id and status = 'active'
    ) then
      raise exception 'This conversation has ended';
    end if;

    NEW.content := btrim(NEW.content);
    if NEW.content = '' then
      raise exception 'A message cannot be empty';
    end if;
    if char_length(NEW.content) > 2000 then
      raise exception 'A message can be at most 2000 characters';
    end if;

    NEW.edited_at := now();
  else
    -- edited_at only moves with an actual edit.
    NEW.edited_at := OLD.edited_at;
  end if;

  -- The sender's new UPDATE policy must not become a way to fake a read
  -- receipt on their own message.
  if NEW.read_at is distinct from OLD.read_at and v_uid is not null and v_uid = OLD.sender_id then
    raise exception 'You cannot mark your own message as read';
  end if;

  if NEW.read_at is not null and OLD.read_at is null then
    NEW.read_at := now();
  end if;

  if OLD.read_at is not null and NEW.read_at is null then
    raise exception 'Cannot unset read_at once a message is marked as read';
  end if;

  return NEW;
end;
$$;

-- Records the version being replaced. SECURITY DEFINER because the sender
-- has no INSERT on message_edits (and, under RLS, can't count its rows —
-- which is why the edit cap lives here and not in the BEFORE trigger).
create or replace function public.log_message_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.message_edits where message_id = OLD.id) >= 10 then
    raise exception 'This message has been edited too many times';
  end if;

  insert into public.message_edits (message_id, session_id, sender_id, previous_content, edited_at)
  values (OLD.id, OLD.session_id, OLD.sender_id, OLD.content, coalesce(NEW.edited_at, now()));

  return null;
end;
$$;

drop trigger if exists log_message_edits on public.messages;
create trigger log_message_edits
  after update of content on public.messages
  for each row
  when (OLD.content is distinct from NEW.content)
  execute function public.log_message_edit();

-- Trigger-only function: not an RPC. Revoke from every role that gets a
-- direct grant at CREATE time, not just PUBLIC (Known Issue #37).
revoke execute on function public.log_message_edit() from anon, authenticated, public;
