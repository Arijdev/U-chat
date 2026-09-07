import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Clean any bloated legacy cookies that trigger ERR_RESPONSE_HEADERS_TOO_BIG and HTTP 431
  const allCookies = request.cookies.getAll()
  for (const c of allCookies) {
    if (c.name.startsWith("sb-") && c.name.includes("auth-token")) {
      response.cookies.delete(c.name)
    }
  }

  return response
}


export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
