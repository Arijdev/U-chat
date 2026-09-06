/**
 * Centralized environment configuration helper.
 * Provides validated and fallback-compatible access to Supabase variables.
 */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    if (typeof window !== "undefined") {
      console.error("NEXT_PUBLIC_SUPABASE_URL is missing. Please set it in your environment.")
    }
    return ""
  }
  return url
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  if (!key && typeof window !== "undefined") {
    console.error(
      "Neither NEXT_PUBLIC_SUPABASE_ANON_KEY nor NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is configured.",
    )
  }
  return key
}

export function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ""
}
