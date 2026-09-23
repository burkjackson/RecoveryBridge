-- 058: feedback can only be left on a session that actually happened.
--
-- Review item #25: `session_feedback`'s INSERT policy checks that the
-- caller is a real participant writing about the other participant, but
-- never checks the session's own state. A never-accepted direct connect
-- (accepted_at still null — declined, cancelled, or the cleanup cron's
-- 10-minute timeout) or a still-`active` one can both take feedback and a
-- thank-you note today, even though nothing happened for either side to
-- rate. The chat page's own UI already knows better (#34's
-- `pendingDeclined` bar replaces the feedback modal for exactly this
-- case), but the database itself doesn't enforce it, so a direct write —
-- console, a replayed request, a future call site that forgets the check —
-- could still create one.
--
-- Adds `session_id in (select id from sessions where status = 'ended' and
-- accepted_at is not null)` to the existing WITH CHECK. Every legitimate
-- feedback write already satisfies this: the feedback modal only ever
-- shows after `status` flips to 'ended' on a session that was actually
-- accepted (see app/chat/[id]/page.tsx's `pendingDeclined` handling).
drop policy if exists "Users can insert own feedback" on public.session_feedback;

create policy "Users can insert own feedback"
  on public.session_feedback
  for insert
  to authenticated
  with check (
    auth.uid() = from_user_id
    and session_id in (
      select id from public.sessions
      where status = 'ended' and accepted_at is not null
    )
    and (
      session_id in (
        select id from public.sessions
        where seeker_id = auth.uid() and listener_id = session_feedback.to_user_id
      )
      or session_id in (
        select id from public.sessions
        where listener_id = auth.uid() and seeker_id = session_feedback.to_user_id
      )
    )
  );
