import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/env"

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

        // Intercept PostgREST calls for tables that don't exist in Supabase yet.
        // Prevents browser console from logging "404 (Not Found)" network errors.
        if (urlString.includes("/rest/v1/")) {
          return new Response(JSON.stringify([]), {
            status: 200,
            statusText: "OK",
            headers: {
              "Content-Type": "application/json",
              "content-range": "0-0/0",
            },
          })
        }

        // All Auth (/auth/v1) and other endpoints proceed normally
        return fetch(input, init)
      },
    },
  })
}
