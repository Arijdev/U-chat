-- Update call_history table to add status column if it doesn't exist
ALTER TABLE public.call_history 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Update RLS policy for call_history to allow updates
DROP POLICY IF EXISTS "call_history_update_own" ON public.call_history;
CREATE POLICY "call_history_update_own" ON public.call_history FOR UPDATE 
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_call_history_receiver ON public.call_history(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_history_status ON public.call_history(status);
