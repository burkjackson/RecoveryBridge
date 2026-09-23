-- 061: profiles.id was never actually foreign-keyed to auth.users(id) — just
-- a same-valued primary key with nothing enforcing the relationship. Every
-- table hanging off profiles (sessions, messages, user_favorites, etc.) has
-- had `ON DELETE CASCADE` back to profiles since the tables were created,
-- but that cascade chain starts at profiles — and nothing was cascading
-- INTO profiles when the auth user underneath it disappeared.
--
-- deleteUserAccount() (lib/deleteUserAccount.ts, shared by self-service and
-- admin delete) calls `auth.admin.deleteUser()` and its doc comment says
-- that "cascades to public.profiles and everything hanging off it via FK" —
-- that was never true. The auth user was gone, the login was gone, but the
-- profiles row — display_name, bio, avatar, everything — just sat there
-- forever, because nothing was watching auth.users for a delete. An admin
-- deleting a user saw them vanish from Supabase Auth and reappear in the
-- next users-list refresh, looking exactly like the deletion silently
-- failed.
--
-- Found 6 profiles like this in production, all created well before this
-- fix: test 2, Test Webhook User, Eddie G, Henry, "joer " (the same account
-- from migration 060's whitespace cleanup — it was deleted once already,
-- just never actually went away), and adrian. Deleting them here, then
-- adding the FK with ON DELETE CASCADE so this can't happen again — any
-- future auth.admin.deleteUser() call now really does take the profile,
-- and everything hanging off it, with it.
delete from public.profiles p
where not exists (
  select 1 from auth.users u where u.id = p.id
);

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;
