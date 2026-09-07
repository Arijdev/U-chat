import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { updateServerUserProfile, getServerUserById } from "@/lib/server-store"

export const dynamic = "force-dynamic"

const DATA_DIR = path.join(process.cwd(), ".uchat_data")
const AVATARS_DIR = path.join(DATA_DIR, "avatars")

function ensureAvatarsDir() {
  if (!fs.existsSync(AVATARS_DIR)) {
    fs.mkdirSync(AVATARS_DIR, { recursive: true })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return new NextResponse("Missing userId", { status: 400 })
  }

  ensureAvatarsDir()
  const avatarPath = path.join(AVATARS_DIR, `${userId}.bin`)

  if (fs.existsSync(avatarPath)) {
    try {
      const raw = fs.readFileSync(avatarPath, "utf-8")
      const matches = raw.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        const mime = matches[1]
        const buffer = Buffer.from(matches[2], "base64")
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=86400",
          },
        })
      }
    } catch (e) {
      console.warn("Error reading avatar file:", e)
    }
  }

  // Fallback to server store avatar_url if it's an external HTTP URL
  const user = getServerUserById(userId)
  if (user?.avatar_url && user.avatar_url.startsWith("http")) {
    return NextResponse.redirect(user.avatar_url)
  }

  return new NextResponse("Not found", { status: 404 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, dataUrl } = body

    if (!userId || !dataUrl) {
      return NextResponse.json({ error: "Missing userId or dataUrl" }, { status: 400 })
    }

    ensureAvatarsDir()
    const avatarPath = path.join(AVATARS_DIR, `${userId}.bin`)
    fs.writeFileSync(avatarPath, dataUrl, "utf-8")

    const publicUrl = `/api/chat/avatar?userId=${userId}&t=${Date.now()}`
    updateServerUserProfile(userId, { avatar_url: publicUrl })

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
    })
  } catch (err: any) {
    console.error("Avatar upload error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
