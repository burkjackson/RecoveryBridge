-- 066: a dedupe key means "once", not "once at a time".
--
-- idx_notification_queue_dedupe (035) is unique on (user_id, kind, dedupe_key)
-- but only WHERE status = 'pending'. As soon as the drain marks a row sent or
-- skipped, the same key can be queued again, and the next cron run does
-- exactly that. Found 28 Sep 2026: 482 training_nudge rows for 3 people, all
-- with dedupe_key '2026-09', one new row per cron run since 1 Sep. They were
-- all skipped (none of the 3 has a push device), so nobody was spammed yet.
-- But the moment one of them enabled push, every cron run would have sent
-- them "finish your training" again, and 065 moves the cron to every 10
-- minutes.
--
-- Fixed in the database so it holds whatever the enqueue code does: a BEFORE
-- INSERT trigger silently drops a row whose (user_id, kind, dedupe_key)
-- already exists in any status. Returning NULL skips just that row, so the
-- rest of a batch insert still lands (a unique index over all statuses would
-- fail the whole batch instead). Terminal rows are pruned after 30 days,
-- which is fine for the keys in use: monthly keys roll over, and thank-you
-- and broadcast keys are unique ids.

create or replace function public.skip_duplicate_queue_rows()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.dedupe_key is not null and exists (
    select 1 from public.notification_queue
    where user_id = new.user_id
      and kind = new.kind
      and dedupe_key = new.dedupe_key
  ) then
    return null;
  end if;
  return new;
end;
$$;

revoke execute on function public.skip_duplicate_queue_rows() from anon, authenticated, public;

drop trigger if exists skip_duplicate_queue_rows on public.notification_queue;
create trigger skip_duplicate_queue_rows
  before insert on public.notification_queue
  for each row
  execute function public.skip_duplicate_queue_rows();

-- Clear the pile-up: keep the earliest row per key, drop the repeats.
delete from public.notification_queue q
using public.notification_queue keep
where q.dedupe_key is not null
  and keep.user_id = q.user_id
  and keep.kind = q.kind
  and keep.dedupe_key = q.dedupe_key
  and (keep.created_at, keep.id) < (q.created_at, q.id);
