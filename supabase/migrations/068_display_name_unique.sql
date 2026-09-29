-- 068: display names are actually unique now, and have a sane length.
--
-- CLAUDE.md, app/signup/page.tsx and app/profile/page.tsx all assumed a
-- unique constraint on profiles.display_name ("This username is already
-- taken"). There was none: no unique index, no constraint. Found 29 Sep 2026
-- with two accounts both named "Luna". On a peer-support platform a name is
-- how a seeker recognises a listener they trust (favourites, the listener
-- list, the chat header), so a copy is an impersonation route.
--
-- 1. Unique, case-insensitively. The later "Luna" (c45f5846, 0 sessions) is
--    exempt from the index until Burk decides how to rename it; nobody else
--    can take "Luna" or any other existing name. Once renamed, drop the
--    WHERE clause (recreate the index without it).
-- 2. is_display_name_available(name): signup checks this before creating
--    the account. Without it, a taken name fails inside handle_new_user()
--    and Supabase reports only "Database error saving new user".
-- 3. A length check every existing row already passes (1-50 characters
--    after trimming; "H" from 26 Sep is 1). The forms require 2+. Bio gets
--    no database check: two existing bios are over 500, and a CHECK is
--    re-evaluated on every UPDATE of a row, so it would break heartbeats
--    and role changes for those two members. The editors cap new text at
--    500 instead.

create unique index if not exists profiles_display_name_lower_key
  on public.profiles (lower(display_name))
  where id <> 'c45f5846-479d-42f6-84b2-cc1abcd576a6';

alter table public.profiles
  add constraint display_name_length_check
  check (char_length(btrim(display_name)) between 1 and 50);

create or replace function public.is_display_name_available(name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select name is not null
    and char_length(btrim(name)) between 2 and 50
    and not exists (
      select 1 from public.profiles
      where lower(display_name) = lower(btrim(name))
    );
$$;

-- Called before sign-in exists, so anon needs it. It returns only a yes/no
-- about a name that is shown publicly anyway.
revoke execute on function public.is_display_name_available(text) from public;
grant execute on function public.is_display_name_available(text) to anon, authenticated;
