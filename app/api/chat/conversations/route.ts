import { NextRequest, NextResponse } from "next/server"
import { getServerConversations, createServerConversation } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const conversations = getServerConversations(userId)
  return NextResponse.json(conversations)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { participant1Id, participant2Id } = body

    if (!participant1Id || !participant2Id) {
      return NextResponse.json({ error: "Missing participants" }, { status: 400 })
    }

    const conv = createServerConversation(participant1Id, participant2Id)
    return NextResponse.json(conv)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
