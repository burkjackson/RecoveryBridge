-- 060: one-time cleanup of leading/trailing whitespace in display_name.
--
-- Neither the signup form nor the profile-edit save trimmed the raw input
-- before writing it to profiles.display_name, so a stray trailing space
-- (autocomplete, a copy-paste, a finger on the spacebar before submit) went
-- straight into the database and stayed there — invisible everywhere it's
-- rendered back, but not invisible to a strict string comparison. It was
-- 21 live profiles as of this check, one of which (display_name "joer ")
-- silently broke admin's delete-user flow: step 2 requires typing the name
-- back exactly, and nobody can type a character they can't see. Both write
-- paths are fixed in the app (app/signup/page.tsx, app/profile/page.tsx's
-- handleSave()), and the delete-user confirmation itself now trims both
-- sides of the comparison so this can't block a future case that slips
-- through some other way — this migration only cleans up what already
-- landed in the table before those fixes shipped.
update public.profiles
set display_name = trim(display_name)
where display_name is distinct from trim(display_name);
