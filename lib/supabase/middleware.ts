import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/env"

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request })

  // Clean any bloated cookies that cause ERR_RESPONSE_HEADERS_TOO_BIG and HTTP 431
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-") && c.name.includes("auth-token")) {
      response.cookies.delete(c.name)
    }
  }

  return response
}

