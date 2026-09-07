import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"
import { updateServerUserProfile, getServerUserById } from "@/lib/server-store"

export const dynamic = "force-dynamic"

function getAvatarsDir() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  const baseDir = isServerless
    ? path.join(os.tmpdir(), "uchat_data")
    : path.join(process.cwd(), ".uchat_data")
  return path.join(baseDir, "avatars")
}

function ensureAvatarsDir() {
  try {
    const dir = getAvatarsDir()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    return dir
  } catch (e) {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 })
    }

    // 1. Check if user avatar is saved on disk (or in tmpdir on Vercel)
    const avatarsDir = ensureAvatarsDir()
    if (avatarsDir) {
      const avatarPath = path.join(avatarsDir, `${userId}.bin`)
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
    }

    // 2. Check in-memory store for avatar
    const user = getServerUserById(userId)
    if (user?.avatar_url) {
      if (user.avatar_url.startsWith("data:")) {
        const matches = user.avatar_url.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
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
      } else if (user.avatar_url.startsWith("http")) {
        return NextResponse.redirect(user.avatar_url)
      }
    }

    // 3. Graceful SVG initial avatar fallback (prevents 404/500 in browser console)
    const name = user?.display_name || user?.email?.split("@")[0] || "U"
    const initial = (name[0] || "U").toUpperCase()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00a884" />
          <stop offset="100%" stop-color="#008069" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad)"/>
      <text x="50" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initial}</text>
    </svg>`

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (err: any) {
    console.error("Avatar GET error:", err)
    // Always return safe SVG fallback instead of 500
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="#00a884"/></svg>`
    return new NextResponse(fallbackSvg, {
      headers: { "Content-Type": "image/svg+xml" },
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, dataUrl } = body

    if (!userId || !dataUrl) {
      return NextResponse.json({ error: "Missing userId or dataUrl" }, { status: 400 })
    }

    const avatarsDir = ensureAvatarsDir()
    if (avatarsDir) {
      try {
        const avatarPath = path.join(avatarsDir, `${userId}.bin`)
        fs.writeFileSync(avatarPath, dataUrl, "utf-8")
      } catch (writeErr) {
        console.warn("Avatar disk write skipped:", writeErr)
      }
    }

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

