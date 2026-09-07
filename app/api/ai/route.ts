import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  ""

// Optimized model order based on verified availability and latency
const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
]

interface MessageItem {
  role: "user" | "assistant" | "model"
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, history = [] } = body as {
      prompt: string
      history?: MessageItem[]
    }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    // Build Gemini contents array from history + prompt
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = []

    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-10)) {
        if (!h.content) continue
        contents.push({
          role: h.role === "assistant" || h.role === "model" ? "model" : "user",
          parts: [{ text: h.content }],
        })
      }
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    })

    const systemInstruction = {
      role: "user",
      parts: [
        {
          text: "System instruction: You are Meta AI on WhatsApp Web. You are an intelligent, friendly, fast, and helpful AI assistant powered by Google Gemini. Help users with questions, drafting messages, coding, recipes, travel, translations, summaries, and general knowledge. Format responses clearly with clean Markdown (headings, bullet points, bold text, code blocks). Keep responses concise and engaging.",
        },
      ],
    }

    let lastError = ""
    let replyText = ""
    let usedModel = ""

    // Try each model until one succeeds (with an 8-second timeout per attempt)
    for (const model of GEMINI_MODELS) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 9000)

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            systemInstruction,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        })

        clearTimeout(timeoutId)

        if (res.ok) {
          const data = await res.json()
          const candidate = data.candidates?.[0]
          const partText = candidate?.content?.parts?.[0]?.text
          if (partText) {
            replyText = partText
            usedModel = model
            break
          }
        } else {
          const errText = await res.text()
          lastError = `[${model}] ${res.status}: ${errText.slice(0, 120)}`
          console.warn(`Gemini model ${model} failed, trying next:`, lastError)
        }
      } catch (e: any) {
        lastError = `[${model}] ${e?.message || e}`
        console.warn(`Gemini fetch error on ${model}:`, e)
      }
    }

    if (!replyText) {
      return NextResponse.json({
        text: `I'm having a brief connection delay. Please try asking your question again in a moment!`,
        model: "fallback",
        error: lastError,
      })
    }

    return NextResponse.json({
      text: replyText,
      model: usedModel,
    })
  } catch (error: any) {
    console.error("AI API route error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
