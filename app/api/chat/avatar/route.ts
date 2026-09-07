import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"
import { updateServerUserProfile, getServerUserById } from "@/lib/server-store"
import { SEED_AVATARS } from "@/lib/seed-avatars"

export const dynamic = "force-dynamic"

// In-memory cache for avatars uploaded at runtime (lives for the life of the serverless/Node instance)
const runtimeAvatarCache = new Map<string, { mime: string; buffer: Buffer }>()

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

    const imageHeaders = {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    }

    // 1. Check in-memory runtime cache (fastest, supports live uploads without disk reads)
    const cached = runtimeAvatarCache.get(userId)
    if (cached) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        headers: {
          "Content-Type": cached.mime,
          ...imageHeaders,
        },
      })
    }

    // 2. Check pre-seeded avatar data (bundled with app build, 100% persistent on Vercel)
    if (SEED_AVATARS[userId]) {
      const seed = SEED_AVATARS[userId]
      const buffer = Buffer.from(seed.base64, "base64")
      runtimeAvatarCache.set(userId, { mime: seed.mime, buffer })
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": seed.mime,
          ...imageHeaders,
        },
      })
    }

    // 3. Check public/avatars folder
    const publicAvatarJpg = path.join(process.cwd(), "public", "avatars", `${userId}.jpg`)
    if (fs.existsSync(publicAvatarJpg)) {
      try {
        const buffer = fs.readFileSync(publicAvatarJpg)
        runtimeAvatarCache.set(userId, { mime: "image/jpeg", buffer })
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "image/jpeg",
            ...imageHeaders,
          },
        })
      } catch (e) {
        console.warn("Error reading public avatar jpg:", e)
      }
    }

    const publicAvatarBin = path.join(process.cwd(), "public", "avatars", `${userId}.bin`)
    if (fs.existsSync(publicAvatarBin)) {
      try {
        const raw = fs.readFileSync(publicAvatarBin, "utf-8")
        const matches = raw.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
        if (matches && matches.length === 3) {
          const mime = matches[1]
          const buffer = Buffer.from(matches[2], "base64")
          runtimeAvatarCache.set(userId, { mime, buffer })
          return new NextResponse(new Uint8Array(buffer), {
            headers: {
              "Content-Type": mime,
              ...imageHeaders,
            },
          })
        }
      } catch (e) {
        console.warn("Error reading public avatar bin:", e)
      }
    }

    // 4. Check user avatar on disk (uchat_data/avatars)
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
            runtimeAvatarCache.set(userId, { mime, buffer })
            return new NextResponse(new Uint8Array(buffer), {
              headers: {
                "Content-Type": mime,
                ...imageHeaders,
              },
            })
          }
        } catch (e) {
          console.warn("Error reading avatar file:", e)
        }
      }
    }

    // 5. Check in-memory server store for data: URL or external http: URL
    const user = getServerUserById(userId)
    if (user?.avatar_url) {
      if (user.avatar_url.startsWith("data:")) {
        const matches = user.avatar_url.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
        if (matches && matches.length === 3) {
          const mime = matches[1]
          const buffer = Buffer.from(matches[2], "base64")
          runtimeAvatarCache.set(userId, { mime, buffer })
          return new NextResponse(new Uint8Array(buffer), {
            headers: {
              "Content-Type": mime,
              ...imageHeaders,
            },
          })
        }
      } else if (user.avatar_url.startsWith("http")) {
        return NextResponse.redirect(user.avatar_url)
      }
    }

    // 6. Graceful SVG initial avatar fallback (never cached on client so new photos display immediately)
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
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (err: any) {
    console.error("Avatar GET error:", err)
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="#00a884"/></svg>`
    return new NextResponse(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
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

    // Save to runtime in-memory cache immediately
    const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (matches && matches.length === 3) {
      const mime = matches[1]
      const buffer = Buffer.from(matches[2], "base64")
      runtimeAvatarCache.set(userId, { mime, buffer })
    }

    // Attempt to persist to disk
    const avatarsDir = ensureAvatarsDir()
    if (avatarsDir) {
      try {
        const avatarPath = path.join(avatarsDir, `${userId}.bin`)
        fs.writeFileSync(avatarPath, dataUrl, "utf-8")
      } catch (writeErr) {
        console.warn("Avatar disk write skipped:", writeErr)
      }
    }

    const publicUrl = `/api/chat/avatar?userId=${userId}&v=${Date.now()}`
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
