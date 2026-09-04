-- 042 set avatars' file_size_limit to 2 MB, following the code review's
-- suggested number without checking it against what the app already
-- enforces: components/AvatarUpload.tsx rejects anything over 5 MB
-- client-side (the crop step never runs for a bigger file), so a 2 MB
-- bucket limit meant a 2-5 MB file would pass that check and then get
-- silently rejected by storage. Raises the bucket limit to match the
-- client's existing 5 MB check instead of picking a new number.

begin;

update storage.buckets
set file_size_limit = 5 * 1024 * 1024
where id = 'avatars';

commit;
