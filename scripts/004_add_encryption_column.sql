-- Add is_encrypted column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant_1_id, participant_2_id);
