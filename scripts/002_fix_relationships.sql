-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_select_own_conversation" ON public.messages;

-- Recreate messages policies with better logic
CREATE POLICY "messages_select_own_conversation" ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = messages.conversation_id 
      AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_own_conversation" ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
    )
  );

-- Add UPDATE policy for messages
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE 
  USING (auth.uid() = sender_id);

-- Add DELETE policy for messages
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE 
  USING (auth.uid() = sender_id);
