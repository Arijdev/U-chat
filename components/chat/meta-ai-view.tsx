"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useRef, useEffect, useCallback } from "react"
import { Sparkles, Send, X, ArrowLeft, Trash2, Copy, Check, Bot } from "lucide-react"
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
  model?: string
}

const STORAGE_KEY = "u_chat_meta_ai_messages"

export function MetaAiView({ user, onClose }: MetaAiViewProps) {
  const [messages, setMessages] = useState<AiMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.warn("Failed to parse saved AI messages:", e)
      }
    }
    return [
      {
        id: "ai_init",
        role: "assistant",
        text: "Hi! I'm Meta AI on WhatsApp, powered by Google Gemini. Ask me anything, brainstorm ideas, write messages, plan trips, or solve problems!",
        time: "Just now",
      },
    ]
  })

  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Save conversation to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch (e) {
      // storage quota or private mode
    }
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const SUGGESTIONS = [
    "Plan a 3-day weekend trip to the mountains",
    "Write a polite thank you email to my team",
    "Explain quantum computing in simple terms",
    "Give me 5 high-protein dinner recipes",
    "Help me write a professional WhatsApp message",
  ]

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleClearHistory = useCallback(() => {
    const initialMsg: AiMessage = {
      id: `ai_${Date.now()}`,
      role: "assistant",
      text: "Hi! I'm Meta AI on WhatsApp, powered by Google Gemini. How can I assist you today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages([initialMsg])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {}
  }, [])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isTyping) return

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const userMsg: AiMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      text,
      time: nowTime,
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setIsTyping(true)

    try {
      // Prepare history for API
      const historyPayload = updated.map((m) => ({
        role: m.role,
        content: m.text,
      }))

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          history: historyPayload.slice(-8),
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }

      const data = await res.json()
      const replyText = data.text || "I couldn't process that request right now. Please try again."

      const botMsg: AiMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: data.model,
      }

      setMessages((prev) => [...prev, botMsg])
    } catch (err: any) {
      console.error("Meta AI fetch error:", err)
      const errorMsg: AiMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: "Sorry, I had trouble connecting to the service. Please check your connection and try again!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
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
              <span className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded-full">
                AI
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Powered by Google Gemini</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 1 && (
            <button
              onClick={handleClearHistory}
              title="Clear AI chat"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              title="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 max-w-2xl mx-auto w-full">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} group`}>
            <div
              className={`relative max-w-[88%] px-4 py-2.5 rounded-2xl shadow-xs text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-xs"
                  : "bg-white dark:bg-[#202c33] text-foreground rounded-tl-xs border border-border/50"
              }`}
            >
              <p>{m.text}</p>
              <div className="flex items-center justify-between gap-2 mt-1 pt-0.5 text-[10px] text-muted-foreground">
                {m.role === "assistant" ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground flex items-center gap-1 cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    {m.model && <span className="opacity-60 text-[9px]">{m.model}</span>}
                  </div>
                ) : (
                  <span />
                )}
                <span>{m.time}</span>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#202c33] text-muted-foreground px-4 py-2.5 rounded-2xl rounded-tl-xs border border-border/50 flex items-center gap-2 shadow-xs text-xs">
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
      {messages.length <= 2 && !isTyping && (
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
            ref={inputRef}
            type="text"
            placeholder="Ask Meta AI anything..."
            value={input}
            disabled={isTyping}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1 h-10 px-4 text-xs md:text-sm bg-[#f0f2f5] dark:bg-[#111b21] rounded-2xl border-0 focus:outline-hidden focus:ring-1 focus:ring-purple-500 disabled:opacity-60"
          />
          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-0 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
