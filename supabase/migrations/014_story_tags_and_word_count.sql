-- Add tags and word_count to blog_posts
-- tags: reuses the same 18 specialty tags from the main app (max 3 per story)
-- word_count: generated column, auto-computed from content, used for reading time

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS word_count integer;

-- GIN index for efficient tag overlap queries (used in filtering + related stories)
CREATE INDEX IF NOT EXISTS blog_posts_tags_idx ON blog_posts USING gin(tags);
