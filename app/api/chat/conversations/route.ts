import { NextRequest, NextResponse } from "next/server"
import {
  getServerConversations,
  createServerConversation,
  createGroupConversation,
  toggleArchiveConversation,
} from "@/lib/server-store"

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
    const { action, is_group, creator_id, name, avatar_url, member_ids, participant1Id, participant2Id, conversationId, isArchived } = body

    if (action === "archive" && conversationId) {
      const ok = toggleArchiveConversation(conversationId, Boolean(isArchived))
      return NextResponse.json({ ok })
    }

    if (is_group && creator_id && name && Array.isArray(member_ids)) {
      const groupConv = createGroupConversation({
        creator_id,
        name,
        avatar_url,
        member_ids,
      })
      return NextResponse.json(groupConv)
    }

    if (!participant1Id || !participant2Id) {
      return NextResponse.json({ error: "Missing participants" }, { status: 400 })
    }

    const conv = createServerConversation(participant1Id, participant2Id)
    return NextResponse.json(conv)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
