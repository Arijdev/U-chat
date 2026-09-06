import { NextRequest, NextResponse } from "next/server"
import { getServerUsers, registerServerUser } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const excludeId = searchParams.get("excludeId") || undefined
  const users = getServerUsers(excludeId)
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, email, display_name, avatar_url } = body

    if (!id || !email) {
      return NextResponse.json({ error: "Missing id or email" }, { status: 400 })
    }

    const user = registerServerUser({ id, email, display_name, avatar_url })
    return NextResponse.json(user)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
