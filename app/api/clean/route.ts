import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL("/auth/login", req.url)
  const res = NextResponse.redirect(url)

  const allCookies = req.cookies.getAll()
  for (const c of allCookies) {
    res.cookies.delete(c.name)
    res.cookies.set(c.name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    })
  }

  // Also proactively clear potential Supabase chunked tokens
  for (let i = 0; i < 30; i++) {
    const chunkName = `sb-wngcxtcufszlzpbtvauu-auth-token.${i}`
    res.cookies.delete(chunkName)
    res.cookies.set(chunkName, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    })
  }

  return res
}
