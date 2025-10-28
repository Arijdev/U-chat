-- Migration: create webrtc_signaling table for WebRTC signaling messages
DROP TABLE IF EXISTS public.webrtc_signaling;

CREATE TABLE IF NOT EXISTS public.webrtc_signaling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  from_id uuid REFERENCES profiles(id),
  to_id uuid REFERENCES profiles(id),
  type text NOT NULL,
  payload jsonb,
  sdp text,        -- for WebRTC SDP offer/answer
  candidate jsonb, -- for ICE candidates
  call_type text,  -- 'voice' or 'video'
  from_name text,  -- sender display name
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookup by recipient and for realtime subscriptions
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_to_id ON public.webrtc_signaling (to_id);

-- Enable RLS but allow authenticated users to insert and read their messages
ALTER TABLE public.webrtc_signaling ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to insert signaling messages
-- This is safe because users can only read messages sent to them
CREATE POLICY "Can insert signaling messages"
  ON public.webrtc_signaling FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Can read messages sent to me"
  ON public.webrtc_signaling FOR SELECT
  TO authenticated
  USING (auth.uid() = to_id);

-- Enable realtime for the signaling table
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
END;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signaling;
