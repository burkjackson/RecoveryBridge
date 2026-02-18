-- Add new reaction types: strong, sparkles, thumbsup, clap, blue_heart
-- Drop the old CHECK constraint and add an updated one
ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS message_reactions_reaction_check;
ALTER TABLE message_reactions ADD CONSTRAINT message_reactions_reaction_check
  CHECK (reaction IN ('heart', 'hug', 'pray', 'strong', 'sparkles', 'thumbsup', 'clap', 'blue_heart'));
