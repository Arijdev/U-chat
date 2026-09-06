"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, X, Bot, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MetaAiViewProps {
  user: User
  onClose?: () => void
}

interface AiMessage {
  id: string
  role: "user" | "assistant"
  text: string
  time: string
}

export function MetaAiView({ user, onClose }: MetaAiViewProps) {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "ai_1",
      role: "assistant",
      text: "Hi! I'm Meta AI on WhatsApp. You can ask me questions, plan trips, generate ideas, or learn something new. How can I help you today?",
      time: "Just now",
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const SUGGESTIONS = [
    "Plan a 3-day weekend trip to the mountains",
    "Write a polite thank you email to my team",
    "Explain quantum computing in simple terms",
    "Give me 5 high-protein dinner recipes",
  ]

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text) return

    const userMsg: AiMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    // Simulate instant intelligent response
    setTimeout(() => {
      let reply = ""
      const q = text.toLowerCase()

      if (q.includes("trip") || q.includes("travel")) {
        reply = "Here's a fantastic 3-day mountain getaway itinerary:\n\n• **Day 1**: Morning scenic drive, check into a cozy timber cabin, afternoon lakeside stroll, evening campfire.\n• **Day 2**: Sunrise summit hike with panoramic views, local artisan lunch, afternoon mountain biking, hearty dinner.\n• **Day 3**: Farmers market visit, souvenir shopping, relaxing hot springs soak before heading home."
      } else if (q.includes("email") || q.includes("polite") || q.includes("work")) {
        reply = "Here is a polished email for your team:\n\n*Subject: Huge thank you for your hard work and dedication!*\n\nHi Team,\n\nI wanted to take a quick moment to sincerely thank each of you for your extraordinary efforts on our recent launch. Your creativity, collaboration, and dedication made all the difference.\n\nLet's keep this momentum going!\n\nBest regards,\n" + (user.user_metadata?.display_name || "Team Lead")
      } else if (q.includes("recipe") || q.includes("food") || q.includes("protein")) {
        reply = "Here are 5 delicious high-protein meals:\n\n1. **Lemon Herb Grilled Chicken Breast** with quinoa and roasted asparagus (42g protein)\n2. **Pan-Seared Atlantic Salmon** with garlic mashed cauliflower (38g protein)\n3. **Black Bean & Lean Beef Chili** with avocado slices (40g protein)\n4. **Tofu & Edamame Sesame Stir-Fry** with brown rice (32g protein)\n5. **Greek Yogurt Power Bowl** with walnuts, chia seeds & berries (28g protein)"
      } else {
        reply = `That's an interesting thought! Here's what you should know about "${text}":\n\n• It connects to modern innovation and effective communication.\n• Leveraging real-time tools like WhatsApp Web gives you effortless collaboration wherever you are.\n• Feel free to ask me to summarize, expand, or brainstorm more ideas!`
      }

      const botMsg: AiMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 900)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden select-none relative">
      {/* Header */}
      <div className="h-16 bg-white dark:bg-[#202c33] border-b border-border px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-md">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-foreground">Meta AI</h3>
              <span className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.2 rounded-full">
                AI
              </span>
            </div>
            <p className="text-xs text-muted-foreground">with Llama 3.2 • Powered by Meta</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 max-w-2xl mx-auto w-full">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl shadow-xs text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-xs"
                  : "bg-white dark:bg-[#202c33] text-foreground rounded-tl-xs border border-border/50"
              }`}
            >
              <p>{m.text}</p>
              <p className="text-[10px] text-muted-foreground text-right mt-1">{m.time}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#202c33] text-muted-foreground px-4 py-2 rounded-2xl rounded-tl-xs border border-border/50 flex items-center gap-1.5 shadow-xs text-xs">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] ml-1">Meta AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Suggestions */}
      {messages.length <= 2 && (
        <div className="max-w-2xl mx-auto w-full px-4 mb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="bg-white dark:bg-[#202c33] text-xs text-foreground px-3 py-1.5 rounded-full border border-border/60 hover:border-purple-500 shrink-0 shadow-xs cursor-pointer transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 md:px-6 md:py-3 bg-white dark:bg-[#202c33] border-t border-border z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask Meta AI anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 h-10 px-4 text-xs md:text-sm bg-[#f0f2f5] dark:bg-[#111b21] rounded-2xl border-0 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
          />
          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-0 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
