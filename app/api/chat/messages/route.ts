import { NextRequest, NextResponse } from "next/server"
import {
  getServerMessages,
  addServerMessage,
  deleteServerMessage,
  toggleServerMessageReaction,
  toggleServerMessageStar,
  getStarredMessages,
} from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get("conversationId")
  const starredUserId = searchParams.get("starredUserId")

  if (starredUserId) {
    const starred = getStarredMessages(starredUserId, conversationId)
    return NextResponse.json(starred)
  }


  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
  }

  const messages = getServerMessages(conversationId)
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      action,
      messageId,
      id,
      emoji,
      userId,
      isStarred,
      conversation_id,
      sender_id,
      content,
      message_type,
      media_url,
      file_name,
      file_size,
      is_encrypted,
      reply_to,
    } = body

    if (action === "react" && messageId && emoji && userId) {
      const updated = toggleServerMessageReaction(messageId, emoji, userId)
      return NextResponse.json(updated || { error: "Message not found" })
    }

    if (action === "star" && messageId !== undefined && isStarred !== undefined) {
      const updated = toggleServerMessageStar(messageId, Boolean(isStarred), userId)
      return NextResponse.json(updated || { error: "Message not found" })
    }

    if (!conversation_id || !sender_id) {
      return NextResponse.json({ error: "Missing required message fields" }, { status: 400 })
    }

    const newMsg = addServerMessage({
      id: id || undefined,
      conversation_id,
      sender_id,
      content: content || "",
      message_type: message_type || "text",
      media_url,
      file_name,
      file_size,
      is_encrypted: is_encrypted || false,
      reply_to,
    })

    return NextResponse.json(newMsg)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get("messageId")

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 })
    }

    const success = deleteServerMessage(messageId)
    return NextResponse.json({ ok: success })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
