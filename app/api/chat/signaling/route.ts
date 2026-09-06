import { NextRequest, NextResponse } from "next/server"
import { addServerSignaling } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { from, to, type, payload, sdp, candidate, callType, fromName, conversationId } = body

    const targetId = to || body.to_id
    const senderId = from || body.from_id

    if (!targetId) {
      return NextResponse.json({ error: "Missing recipient id" }, { status: 400 })
    }

    const sig = addServerSignaling({
      from_id: senderId || "unknown",
      to_id: targetId,
      type: type || "unknown",
      payload: {
        type,
        from: senderId,
        to: targetId,
        payload,
        sdp,
        candidate,
        callType,
        fromName,
        conversationId,
      },
      call_type: callType,
      conversation_id: conversationId,
    })

    return NextResponse.json({ ok: true, sig })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
