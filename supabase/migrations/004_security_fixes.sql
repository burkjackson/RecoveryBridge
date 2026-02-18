-- Security fixes: restrict message updates, enforce read_at constraints,
-- and add session membership check to feedback INSERT policy

-- 1. Trigger to restrict message UPDATE to only the read_at column
CREATE OR REPLACE FUNCTION restrict_message_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow read_at to be changed
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at can be updated on messages';
  END IF;

  -- Enforce read_at is set to current time (not arbitrary)
  IF NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    NEW.read_at := now();
  END IF;

  -- Prevent unsetting read_at once set
  IF OLD.read_at IS NOT NULL AND NEW.read_at IS NULL THEN
    RAISE EXCEPTION 'Cannot unset read_at once a message is marked as read';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_message_update_columns
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION restrict_message_update();

-- 2. Drop and recreate feedback INSERT policy with session membership check
DROP POLICY IF EXISTS "Users can insert own feedback" ON session_feedback;

CREATE POLICY "Users can insert own feedback"
  ON session_feedback FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND session_id IN (
      SELECT id FROM sessions
      WHERE listener_id = auth.uid() OR seeker_id = auth.uid()
    )
    AND (
      (session_id IN (SELECT id FROM sessions WHERE seeker_id = auth.uid() AND listener_id = to_user_id))
      OR
      (session_id IN (SELECT id FROM sessions WHERE listener_id = auth.uid() AND seeker_id = to_user_id))
    )
  );
