-- Add read_at column to messages table for read receipts
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Index for efficient unread message queries
CREATE INDEX IF NOT EXISTS idx_messages_read_at
ON messages(session_id, sender_id, read_at)
WHERE read_at IS NULL;

-- RLS policy: users can update read_at on messages they RECEIVED (not sent)
CREATE POLICY "Users can mark received messages as read"
ON messages FOR UPDATE
USING (
  session_id IN (
    SELECT id FROM sessions
    WHERE listener_id = auth.uid() OR seeker_id = auth.uid()
  )
  AND sender_id != auth.uid()
)
WITH CHECK (
  session_id IN (
    SELECT id FROM sessions
    WHERE listener_id = auth.uid() OR seeker_id = auth.uid()
  )
  AND sender_id != auth.uid()
);
