-- Live storage.objects policies on 'avatars': "Authenticated users can manage
-- avatars" is FOR ALL with just bucket_id = 'avatars', no ownership check —
-- any signed-in user can upload, overwrite (upsert), or delete anyone's
-- avatar. Three leftover template policies ("Give anon users access to JPG
-- images in folder 1oj01fe_0/_1/_2") let the anon role INSERT/UPDATE jpg
-- files under avatars/public/ — unauthenticated uploads. Neither avatars nor
-- blog-images has a file_size_limit or allowed_mime_types. blog-images still
-- accepts authenticated uploads even though the blog moved to Ghost.
--
-- Avatars move from root-level `${userId}-${timestamp}.jpg` to a per-user
-- folder `${userId}/${timestamp}.jpg` (components/AvatarUpload.tsx). The new
-- policies accept both shapes so existing root-level files stay manageable
-- by their owner.

begin;

drop policy if exists "Give anon users access to JPG images in folder 1oj01fe_0" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1oj01fe_1" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 1oj01fe_2" on storage.objects;
drop policy if exists "Authenticated users can manage avatars" on storage.objects;

-- "Anyone can view avatars" (public SELECT on bucket_id = 'avatars') is left
-- as-is — the bucket is public and avatar_url is a public URL.

create policy "avatar owners can insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = auth.uid()::text or name like auth.uid()::text || '-%')
);

create policy "avatar owners can update" on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = auth.uid()::text or name like auth.uid()::text || '-%')
)
with check (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = auth.uid()::text or name like auth.uid()::text || '-%')
);

create policy "avatar owners can delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = auth.uid()::text or name like auth.uid()::text || '-%')
);

update storage.buckets
set file_size_limit = 2 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

-- blog-images: the blog moved to Ghost, nothing in the app writes here
-- anymore. Drop the open upload policy, keep public SELECT so old post
-- images still resolve, and cap size in case something writes here later.
drop policy if exists "authenticated users can upload blog images" on storage.objects;

update storage.buckets
set file_size_limit = 2 * 1024 * 1024
where id = 'blog-images';

commit;
