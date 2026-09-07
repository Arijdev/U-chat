"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useRef, useEffect, useCallback } from "react"
import { Sparkles, Send, X, ArrowLeft, Trash2, Copy, Check, RotateCcw, Terminal, Lightbulb, Compass, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MetaAiViewProps {
  user: User
  initialPrompt?: string | null
  onClose?: () => void
}

interface AiMessage {
  id: string
  role: "user" | "assistant"
  text: string
  time: string
  model?: string
  isError?: boolean
}

const STORAGE_KEY = "u_chat_meta_ai_messages"

// Quick prompt suggestions tailored for mobile and desktop
const QUICK_SUGGESTIONS = [
  { icon: Lightbulb, label: "Brainstorm ideas", prompt: "Brainstorm 5 creative ideas for a weekend project or side hustle." },
  { icon: Compass, label: "Travel planner", prompt: "Plan a budget-friendly 3-day itinerary for exploring a scenic city." },
  { icon: Code2, label: "Help with code", prompt: "Explain how React useEffect works with cleanup functions, with a clear code example." },
  { icon: Sparkles, label: "Draft a message", prompt: "Help me write a warm, professional WhatsApp message thanking a colleague." },
]

/**
 * Lightweight Code Block component with instant copy for mobile & desktop
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-border/60 bg-[#1e1e1e] text-neutral-200 text-xs shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-white/10 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-mono lowercase">{language || "code"}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-95"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-[11.5px] leading-relaxed select-text">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/**
 * Format markdown response for mobile readability:
 * - Code blocks (```lang ... ```)
 * - Bold text (**text**)
 * - Inline code (`code`)
 * - Bullet lists (* / -)
 * - Numbered lists
 */
function FormattedAiText({ text }: { text: string }) {
  // Check for code blocks
  const parts = text.split(/(```[\s\S]*?```)/g)

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed select-text">
      {parts.map((part, pIdx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const firstLineEnd = part.indexOf("\n")
          const language = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : ""
          const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3).trim() : part.slice(3, -3).trim()
          return <CodeBlock key={pIdx} code={code} language={language} />
        }

        // Render formatted lines
        const lines = part.split("\n")
        return (
          <div key={pIdx} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim()
              if (!trimmed) {
                return <div key={lIdx} className="h-1" />
              }

              // Bullet points
              if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
                const bulletContent = trimmed.replace(/^[\*\-•]\s+/, "")
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1 my-0.5">
                    <span className="text-purple-500 font-bold text-sm leading-none mt-1">•</span>
                    <span className="flex-1">{parseInline(bulletContent)}</span>
                  </div>
                )
              }

              // Numbered list
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1 my-0.5">
                    <span className="text-purple-600 dark:text-purple-400 font-bold text-xs shrink-0 mt-0.5 min-w-4">
                      {numMatch[1]}.
                    </span>
                    <span className="flex-1">{parseInline(numMatch[2])}</span>
                  </div>
                )
              }

              // Regular paragraph
              return <p key={lIdx}>{parseInline(line)}</p>
            })}
          </div>
        )
      })}
    </div>
  )
}

function parseInline(content: string) {
  // Parse inline code first
  const codeSegments = content.split(/(`[^`]+`)/g)
  return codeSegments.map((segment, idx) => {
    if (segment.startsWith("`") && segment.endsWith("`") && segment.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-[11px] text-purple-600 dark:text-purple-300 mx-0.5"
        >
          {segment.slice(1, -1)}
        </code>
      )
    }

    // Parse bold text
    const boldSegments = segment.split(/(\*\*[^\*]+\*\*)/g)
    return boldSegments.map((bSeg, bIdx) => {
      if (bSeg.startsWith("**") && bSeg.endsWith("**") && bSeg.length > 4) {
        return (
          <strong key={bIdx} className="font-semibold text-foreground">
            {bSeg.slice(2, -2)}
          </strong>
        )
      }
      return bSeg
    })
  })
}

export function MetaAiView({ user, initialPrompt, onClose }: MetaAiViewProps) {
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
        text: "Hi! I'm Meta AI on Arixo Web, powered by Google Gemini. Ask me anything, plan trips, solve coding problems, or brainstorm ideas!",
        time: "Just now",
      },
    ]
  })

  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasTriggeredInitial = useRef(false)

  // Save conversation to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch (e) {
      // storage quota or private mode
    }
  }, [messages])

  // Scroll to bottom whenever messages change or typing state updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleClearHistory = useCallback(() => {
    const initialMsg: AiMessage = {
      id: `ai_${Date.now()}`,
      role: "assistant",
      text: "Hi! I'm Meta AI on Arixo Web, powered by Google Gemini. What would you like to explore today?",
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
      const historyPayload = updated
        .filter((m) => !m.isError)
        .map((m) => ({
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
        model: data.model || "Gemini 2.5 Flash",
      }

      setMessages((prev) => [...prev, botMsg])
    } catch (err: any) {
      console.error("Meta AI fetch error:", err)
      const errorMsg: AiMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: "Sorry, I had trouble connecting to the service. Please check your connection and try again!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // Handle initial prompt if passed from search or shortcut
  useEffect(() => {
    if (initialPrompt && !hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true
      handleSend(initialPrompt)
    }
  }, [initialPrompt])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden select-none relative">
      {/* Mobile & Desktop Header */}
      <div className="h-15 sm:h-16 bg-white dark:bg-[#202c33] border-b border-border/80 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0"
              title="Back to chats"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}

          {/* Meta AI Gradient Ring Avatar */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-md animate-in zoom-in duration-200">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#202c33] rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-foreground truncate">Meta AI</h3>
              <span className="text-[9px] sm:text-[10px] bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-purple-600 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded-full border border-purple-500/20">
                Gemini
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <span className="text-emerald-500 font-medium">Online</span>
              <span>•</span>
              <span>Instant answers & ideas</span>
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 1 && (
            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              title="Close"
              className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-6 space-y-3.5 max-w-3xl mx-auto w-full">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} group animate-in fade-in-50 duration-200`}
          >
            <div
              className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl shadow-xs ${
                m.role === "user"
                  ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-xs px-3.5 py-2 sm:px-4 sm:py-2.5"
                  : "bg-white dark:bg-[#202c33] text-foreground rounded-tl-xs border border-border/40 px-3.5 py-2.5 sm:px-4 sm:py-3"
              }`}
            >
              {m.role === "assistant" ? (
                <FormattedAiText text={m.text} />
              ) : (
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text">{m.text}</p>
              )}

              {/* Message Footer: Action Buttons & Time */}
              <div className="flex items-center justify-between gap-3 mt-1.5 pt-0.5 text-[10px] text-muted-foreground">
                {m.role === "assistant" ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="opacity-75 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:opacity-100 text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer active:scale-95 py-0.5"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 text-[10px] font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                    {m.isError && (
                      <button
                        onClick={() => handleSend(messages[messages.length - 2]?.text)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 cursor-pointer font-medium"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}
                    {m.model && !m.isError && (
                      <span className="opacity-60 text-[9px] hidden sm:inline">{m.model}</span>
                    )}
                  </div>
                ) : (
                  <span />
                )}
                <span className="shrink-0 font-medium opacity-70">{m.time}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start animate-in fade-in-50 duration-200">
            <div className="bg-white dark:bg-[#202c33] text-muted-foreground px-4 py-3 rounded-2xl rounded-tl-xs border border-border/40 flex items-center gap-2.5 shadow-xs">
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center animate-spin">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0s]" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-xs text-foreground/80 font-medium ml-1">Meta AI is generating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions (when conversation is fresh) */}
      {messages.length <= 2 && !isTyping && (
        <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 mb-2 shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {QUICK_SUGGESTIONS.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  className="bg-white/90 dark:bg-[#202c33]/90 hover:bg-white dark:hover:bg-[#202c33] text-xs text-foreground px-3 py-1.5 rounded-full border border-border/80 hover:border-purple-500/60 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Icon className="w-3.5 h-3.5 text-purple-500" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Input Bar with Safe Area Bottom Padding */}
      <div className="bg-white dark:bg-[#202c33] border-t border-border/80 px-3 py-2.5 sm:px-4 sm:py-3 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="flex-1 bg-[#f0f2f5] dark:bg-[#111b21] rounded-2xl border border-transparent focus-within:border-purple-500/60 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all flex items-center px-3 py-1">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Ask Meta AI anything..."
              value={input}
              disabled={isTyping}
              enterKeyHint="send"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 max-h-32 py-1.5 text-xs sm:text-sm bg-transparent border-0 focus:outline-hidden resize-none placeholder:text-muted-foreground disabled:opacity-60 leading-relaxed"
            />
          </div>

          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-emerald-500 hover:from-blue-700 hover:to-purple-700 text-white p-0 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95 transition-all"
            title="Send prompt"
            aria-label="Send prompt"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
