import { NextRequest, NextResponse } from "next/server"
import { getServerStories, addServerStory, deleteServerStory } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const stories = getServerStories()
    return NextResponse.json(stories)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, media_url, text_content, background_color, caption } = body

    if (!user_id || (!media_url && !text_content)) {
      return NextResponse.json({ error: "Missing required story fields" }, { status: 400 })
    }

    const story = addServerStory({
      user_id,
      media_url,
      text_content,
      background_color,
      caption,
    })

    return NextResponse.json(story)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storyId = searchParams.get("storyId")
    const userId = searchParams.get("userId")

    if (!storyId || !userId) {
      return NextResponse.json({ error: "Missing storyId or userId" }, { status: 400 })
    }

    const success = deleteServerStory(storyId, userId)
    return NextResponse.json({ ok: success })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
