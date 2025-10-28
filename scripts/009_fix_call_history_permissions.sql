-- Fix call history table relationships and policies
DROP POLICY IF EXISTS "call_history_select_own" ON public.call_history;
DROP POLICY IF EXISTS "call_history_insert_own" ON public.call_history;

-- Add missing update policy
CREATE POLICY "call_history_select" ON public.call_history 
  FOR SELECT USING (true);

CREATE POLICY "call_history_insert" ON public.call_history 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "call_history_update_own" ON public.call_history
  FOR UPDATE USING (
    auth.uid() IN (caller_id, receiver_id)
  );

-- Re-create foreign key relationships with profiles table
ALTER TABLE public.call_history
  DROP CONSTRAINT IF EXISTS call_history_caller_id_fkey,
  DROP CONSTRAINT IF EXISTS call_history_receiver_id_fkey;

ALTER TABLE public.call_history
  ADD CONSTRAINT call_history_caller_id_fkey 
  FOREIGN KEY (caller_id) 
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.call_history
  ADD CONSTRAINT call_history_receiver_id_fkey 
  FOREIGN KEY (receiver_id) 
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_call_history_caller_receiver 
  ON public.call_history(caller_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_call_history_created_at 
  ON public.call_history(created_at DESC);

-- Grant necessary permissions
GRANT ALL ON public.call_history TO authenticated;
GRANT ALL ON public.profiles TO authenticated;