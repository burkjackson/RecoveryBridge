-- Add optional social link columns to blog_posts
-- Authors can share where they can be found when submitting a story

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS author_website   TEXT,
  ADD COLUMN IF NOT EXISTS author_instagram TEXT,
  ADD COLUMN IF NOT EXISTS author_twitter   TEXT,
  ADD COLUMN IF NOT EXISTS author_linkedin  TEXT,
  ADD COLUMN IF NOT EXISTS author_threads   TEXT,
  ADD COLUMN IF NOT EXISTS author_youtube   TEXT;
