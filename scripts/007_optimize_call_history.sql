-- Add index to improve call history query performance
CREATE INDEX IF NOT EXISTS idx_call_history_caller_receiver ON public.call_history (caller_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON public.call_history (created_at DESC);

-- Grant necessary permissions
GRANT SELECT ON public.call_history TO authenticated;
GRANT INSERT ON public.call_history TO authenticated;
GRANT UPDATE ON public.call_history TO authenticated;