import { NextRequest, NextResponse } from "next/server"
import { getServerMessages, addServerMessage, deleteServerMessage } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get("conversationId")

  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
  }

  const messages = getServerMessages(conversationId)
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { conversation_id, sender_id, content, message_type, media_url, file_name, file_size, is_encrypted } = body

    if (!conversation_id || !sender_id) {
      return NextResponse.json({ error: "Missing required message fields" }, { status: 400 })
    }

    const newMsg = addServerMessage({
      conversation_id,
      sender_id,
      content: content || "",
      message_type: message_type || "text",
      media_url,
      file_name,
      file_size,
      is_encrypted: is_encrypted || false,
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
