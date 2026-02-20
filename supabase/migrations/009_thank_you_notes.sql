-- Add thank-you note to session feedback
-- Seekers can leave an optional attributed message for their listener
-- after a session ends. Max 300 characters.

ALTER TABLE session_feedback
  ADD COLUMN IF NOT EXISTS thank_you_note TEXT,
  ADD CONSTRAINT chk_thank_you_note_length CHECK (
    thank_you_note IS NULL OR char_length(thank_you_note) <= 300
  );
