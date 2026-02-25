-- Blog posts / Stories feature
-- Authors (professionals, allies, admins) can write posts
-- Draft → submitted → published workflow with admin moderation

CREATE TYPE blog_post_status AS ENUM ('draft', 'submitted', 'published');

CREATE TABLE blog_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  slug            TEXT UNIQUE NOT NULL,
  excerpt         TEXT CHECK (char_length(excerpt) <= 300),
  content         TEXT NOT NULL CHECK (char_length(content) >= 50),
  cover_image_url TEXT,
  status          blog_post_status NOT NULL DEFAULT 'draft',
  rejection_note  TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts (no auth required)
CREATE POLICY "published posts are public" ON blog_posts
  FOR SELECT USING (status = 'published');

-- Authors can create, read, update, delete their own posts
CREATE POLICY "authors manage own posts" ON blog_posts
  FOR ALL USING (author_id = auth.uid());

-- Admins can do everything
CREATE POLICY "admins manage all posts" ON blog_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_blog_posts_updated_at();
