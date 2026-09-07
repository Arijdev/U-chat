import { NextRequest, NextResponse } from "next/server"
import { addServerCall, updateServerCall, getServerCalls, deleteServerCall, clearServerCalls } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const calls = getServerCalls(userId)
  return NextResponse.json(calls)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, callId, caller_id, receiver_id, call_type, status, duration, conversation_id } = body

    if (action === "update") {
      let targetCallId = callId
      if (!targetCallId && (caller_id || receiver_id)) {
        const calls = getServerCalls(caller_id || receiver_id)
        if (calls.length > 0) {
          targetCallId = calls[0].id
        }
      }
      if (targetCallId) {
        const updated = updateServerCall(targetCallId, status, duration)
        return NextResponse.json(updated || { ok: true })
      }
      return NextResponse.json({ ok: true })
    }

    if (!caller_id || !receiver_id) {
      return NextResponse.json({ error: "Missing caller_id or receiver_id" }, { status: 400 })
    }

    const newCall = addServerCall({
      caller_id,
      receiver_id,
      call_type: call_type || "voice",
      status: "ringing",
      conversation_id,
    })

    return NextResponse.json(newCall)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const callId = searchParams.get("callId")
    const userId = searchParams.get("userId")

    if (callId) {
      const ok = deleteServerCall(callId)
      return NextResponse.json({ ok })
    }

    if (userId) {
      const ok = clearServerCalls(userId)
      return NextResponse.json({ ok })
    }

    return NextResponse.json({ error: "Missing callId or userId" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
