-- Session Feedback table
-- Stores post-session "Was this helpful?" feedback from seekers
-- Used for listener matching and discovery

CREATE TABLE IF NOT EXISTS session_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- One feedback per user per session
  UNIQUE(session_id, from_user_id)
);

-- Index for looking up feedback by listener (to_user_id)
CREATE INDEX IF NOT EXISTS idx_session_feedback_to_user ON session_feedback(to_user_id);

-- Index for checking if feedback already given
CREATE INDEX IF NOT EXISTS idx_session_feedback_session_from ON session_feedback(session_id, from_user_id);

-- RLS policies
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON session_feedback FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Users can read feedback about themselves (as listener)
CREATE POLICY "Users can read feedback about themselves"
  ON session_feedback FOR SELECT
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- Note: The profiles.tags column already exists as text[] and can be used
-- for specialty tags without any schema changes.
