-- Storage policies for blog-images bucket
-- Allows authenticated eligible users to upload, and public to view

-- Anyone can view/read images (public bucket)
CREATE POLICY "blog images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

-- Authenticated eligible users can upload images
CREATE POLICY "eligible users can upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (user_role IN ('professional', 'ally') OR is_admin = true)
    )
  );

-- Users can update/replace their own images, admins can update any
CREATE POLICY "users can update own blog images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'blog-images'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    )
  );

-- Users can delete their own images, admins can delete any
CREATE POLICY "users can delete own blog images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog-images'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    )
  );
