import { NextRequest, NextResponse } from "next/server"
import { addServerCall, updateServerCall, getServerCalls } from "@/lib/server-store"

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
    const { action, callId, caller_id, receiver_id, call_type, status, duration } = body

    if (action === "update" && callId) {
      const updated = updateServerCall(callId, status, duration)
      return NextResponse.json(updated)
    }

    if (!caller_id || !receiver_id) {
      return NextResponse.json({ error: "Missing caller_id or receiver_id" }, { status: 400 })
    }

    const newCall = addServerCall({
      caller_id,
      receiver_id,
      call_type: call_type || "voice",
      status: "ringing",
    })

    return NextResponse.json(newCall)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
