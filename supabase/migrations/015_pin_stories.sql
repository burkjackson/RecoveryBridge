-- Add is_pinned column to blog_posts for admin-controlled story pinning
ALTER TABLE blog_posts ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Index for fast pinned-first ordering on the public listing
CREATE INDEX idx_blog_posts_pinned_published
  ON blog_posts (is_pinned DESC, published_at DESC)
  WHERE status = 'published';
