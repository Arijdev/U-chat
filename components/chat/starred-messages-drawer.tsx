"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import { X, Star, MessageSquare, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StarredMessagesDrawerProps {
  user: User
  onClose: () => void
  onSelectConversation: (convId: string) => void
}

export function StarredMessagesDrawer({
  user,
  onClose,
  onSelectConversation,
}: StarredMessagesDrawerProps) {
  const [starredMessages, setStarredMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadStarred = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/chat/messages?starredUserId=${encodeURIComponent(user.id)}`)
      if (res.ok) {
        const data = await res.json()
        setStarredMessages(data)
      }
    } catch (e) {
      console.warn("Failed to load starred messages:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStarred()
  }, [user.id])

  const handleUnstar = async (msgId: string) => {
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "star",
          messageId: msgId,
          isStarred: false,
        }),
      })
      setStarredMessages((prev) => prev.filter((m) => m.id !== msgId))
    } catch (e) {}
  }

  return (
    <div className="w-full md:w-96 bg-[#f0f2f5] dark:bg-[#111b21] border-r border-border flex flex-col h-full z-40 select-none animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="h-16 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between px-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <h2 className="text-lg font-semibold tracking-wide">Starred Messages</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading starred...
          </div>
        ) : starredMessages.length === 0 ? (
          <div className="p-8 text-center space-y-3 text-muted-foreground mt-8">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Star className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-foreground">No starred messages yet</p>
            <p className="text-xs max-w-xs mx-auto leading-relaxed">
              Hover over or hold any message in a chat and click the Star icon to save it here for quick reference.
            </p>
          </div>
        ) : (
          starredMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-card text-card-foreground rounded-2xl p-3.5 border border-border shadow-xs hover:border-emerald-500/40 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {msg.sender_id === user.id ? "You" : "Contact"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">{new Date(msg.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleUnstar(msg.id)}
                    className="text-amber-500 hover:text-muted-foreground cursor-pointer"
                    title="Unstar message"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-foreground break-words">{msg.content}</p>

              <div className="pt-2 border-t border-border/50 flex justify-end">
                <button
                  onClick={() => {
                    onSelectConversation(msg.conversation_id)
                    onClose()
                  }}
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  Jump to chat <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
