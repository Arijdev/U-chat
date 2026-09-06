import { NextRequest, NextResponse } from "next/server"
import { getServerChannels, toggleFollowChannel } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || undefined
  const channels = getServerChannels(userId)
  return NextResponse.json(channels)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, channelId, userId } = body

    if (action === "follow" && channelId && userId) {
      const updated = toggleFollowChannel(channelId, userId)
      return NextResponse.json(updated || { error: "Channel not found" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
