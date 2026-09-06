import { NextRequest } from "next/server"
import { subscribeToUserEvents } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return new Response("Missing userId", { status: 400 })
  }

  const responseStream = new TransformStream()
  const writer = responseStream.writable.getWriter()
  const encoder = new TextEncoder()

  // Heartbeat interval to keep SSE connection open
  const heartbeat = setInterval(() => {
    try {
      writer.write(encoder.encode(": ping\n\n"))
    } catch (e) {
      clearInterval(heartbeat)
    }
  }, 15000)

  // Send initial connection event
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

  const unsubscribe = subscribeToUserEvents(userId, (event) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
    } catch (e) {}
  })

  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat)
    unsubscribe()
    try {
      writer.close()
    } catch (e) {}
  })

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
