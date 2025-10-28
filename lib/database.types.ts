import { createClient } from '@/lib/supabase/client'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          email: string | null
          avatar_url: string | null
          status: string
          created_at: string
          updated_at: string
        }
      }
      call_history: {
        Row: {
          id: string
          caller_id: string
          receiver_id: string
          call_type: 'voice' | 'video'
          duration_seconds: number
          status: 'completed' | 'missed' | 'in-progress'
          created_at: string
        }
      }
    }
  }
}