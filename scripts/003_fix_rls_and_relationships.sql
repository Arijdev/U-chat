-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;

-- Create a more permissive messages insert policy
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = messages.conversation_id 
      AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
    )
  );

-- Ensure profiles are properly indexed
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
