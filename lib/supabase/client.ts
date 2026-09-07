import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/env"

let clientInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (clientInstance) return clientInstance

  clientInstance = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  })

  return clientInstance
}

