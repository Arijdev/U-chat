-- Add foreign key references for call_history table
ALTER TABLE IF EXISTS public.call_history
  DROP CONSTRAINT IF EXISTS call_history_caller_id_fkey,
  DROP CONSTRAINT IF EXISTS call_history_receiver_id_fkey;

-- Re-add the foreign key constraints with explicit names
ALTER TABLE public.call_history
  ADD CONSTRAINT call_history_caller_id_fkey 
  FOREIGN KEY (caller_id) 
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.call_history
  ADD CONSTRAINT call_history_receiver_id_fkey 
  FOREIGN KEY (receiver_id) 
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_history_caller_id ON public.call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_receiver_id ON public.call_history(receiver_id);

-- Verify and update permissions
GRANT SELECT ON public.call_history TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;