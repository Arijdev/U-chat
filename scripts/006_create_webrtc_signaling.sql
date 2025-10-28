-- Migration: create webrtc_signaling table for WebRTC signaling messages
CREATE TABLE IF NOT EXISTS public.webrtc_signaling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  from_id uuid,
  to_id uuid,
  type text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Optional: index for faster lookup by recipient
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_to_id ON public.webrtc_signaling (to_id);
