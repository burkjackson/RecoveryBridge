-- Create message_reactions table for quick reactions on chat messages
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('heart', 'hug', 'pray')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id, reaction)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages in their sessions
CREATE POLICY "Users can view reactions in own sessions"
ON message_reactions FOR SELECT
USING (
  message_id IN (
    SELECT m.id FROM messages m
    JOIN sessions s ON m.session_id = s.id
    WHERE s.listener_id = auth.uid() OR s.seeker_id = auth.uid()
  )
);

-- Users can add reactions to messages in their active sessions
CREATE POLICY "Users can add reactions in active sessions"
ON message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  message_id IN (
    SELECT m.id FROM messages m
    JOIN sessions s ON m.session_id = s.id
    WHERE (s.listener_id = auth.uid() OR s.seeker_id = auth.uid())
    AND s.status = 'active'
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
ON message_reactions FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
