-- Move consent capture server-side, and stop the client from being able to
-- mark listener training complete without having acknowledged every section.
--
-- Before this: app/signup/page.tsx puts consent_version, consent_accepted_at,
-- age_confirmed, health_data_consent, and health_data_consent_at straight
-- into auth signup metadata (all client-controlled), and
-- app/onboarding/page.tsx later copies those same values from
-- user_metadata into profiles with a plain client UPDATE. Anyone can open
-- the console and write whatever they want into their own consent record —
-- including the timestamp. For the WA My Health My Data paperwork, the
-- acceptance and its time need to come from somewhere the user can't edit
-- after the fact.
--
-- Similarly, app/training/page.tsx's handleComplete() writes
-- listener_training_completed_at directly from the client with no server
-- check that the eight training sections were actually acknowledged.
--
-- Two independent fixes, same migration:
--   1. handle_new_user() now copies the consent fields at profile creation,
--      with the two timestamps generated server-side (now()) instead of
--      trusting NEW.raw_user_meta_data's client timestamp. Boolean/version
--      values (consent_version, age_confirmed, health_data_consent) are
--      still taken from signup metadata — signup is the one place consent
--      is actually granted, and there's no server-side source of truth for
--      *what* someone agreed to, only *when*.
--   2. A new BEFORE UPDATE trigger, protect_training_completion, only lets
--      listener_training_completed_at move from NULL to non-null when
--      listener_training_progress (jsonb) has every id in
--      lib/constants.ts's LISTENER_TRAINING_SECTION_IDS set to true. Same
--      skip-condition shape as protect_admin_flag (028) and
--      protect_blocked_role_state (041): service role and direct SQL pass
--      through untouched.

-- 1. handle_new_user(): copy consent at profile creation, timestamps from
--    the server clock rather than the client-supplied metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, display_name, email,
    consent_version, consent_accepted_at,
    age_confirmed,
    health_data_consent, health_data_consent_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'New User'),
    new.email,
    new.raw_user_meta_data->>'consent_version',
    case when new.raw_user_meta_data->>'consent_version' is not null then now() else null end,
    coalesce((new.raw_user_meta_data->>'age_confirmed')::boolean, false),
    coalesce((new.raw_user_meta_data->>'health_data_consent')::boolean, false),
    case when (new.raw_user_meta_data->>'health_data_consent')::boolean is true then now() else null end
  );
  return new;
end;
$$;

-- 2. Server-side guard on listener_training_completed_at. The section id
--    list is a literal copy of lib/constants.ts's LISTENER_TRAINING_SECTION_IDS
--    — there are eight, and this migration is the only place they need to
--    line up; a training section rename or addition needs both updated
--    together (same coupling the app already has between
--    app/training/page.tsx and lib/constants.ts).
create or replace function public.protect_training_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text;
  section_ids text[] := array['presence', 'empathy', 'safe-space', 'boundaries', 'scope', 'all-paths', 'meet-them', 'crisis'];
  section_id text;
begin
  if new.listener_training_completed_at is not distinct from old.listener_training_completed_at then
    return new;
  end if;

  jwt_role := nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role';
  if jwt_role is null or jwt_role = 'service_role' then
    return new;
  end if;

  if old.listener_training_completed_at is not null then
    raise exception 'listener_training_completed_at cannot be changed once set';
  end if;

  foreach section_id in array section_ids loop
    if coalesce((new.listener_training_progress ->> section_id)::boolean, false) is not true then
      raise exception 'listener_training_completed_at requires every training section acknowledged';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists protect_training_completion on public.profiles;

create trigger protect_training_completion
  before update on public.profiles
  for each row
  execute function public.protect_training_completion();
