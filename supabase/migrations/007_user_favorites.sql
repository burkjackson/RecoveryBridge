-- User Favorites table
-- Allows users to save preferred contacts from past sessions
-- Both directions: any user can favorite any user they've had a session with

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favorite_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- One favorite record per pair (directional: A favoriting B != B favoriting A)
  UNIQUE(user_id, favorite_user_id),

  -- A user cannot favorite themselves
  CONSTRAINT chk_no_self_favorite CHECK (user_id != favorite_user_id)
);

-- Primary lookup: "what favorites does this user have?"
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);

-- Secondary lookup: "who has favorited this user?" (used in notification API)
CREATE INDEX IF NOT EXISTS idx_user_favorites_favorite_user ON user_favorites(favorite_user_id);

-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can read their own favorites list
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add a favorite, but only if they have shared a past session with that person
CREATE POLICY "Users can add favorites from past sessions"
  ON user_favorites FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND favorite_user_id != auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM sessions
        WHERE status = 'ended'
          AND (
            (listener_id = auth.uid() AND seeker_id = favorite_user_id)
            OR
            (seeker_id = auth.uid() AND listener_id = favorite_user_id)
          )
      )
    )
  );

-- Users can remove their own favorites
CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);
