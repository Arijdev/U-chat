"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect, useMemo } from "react"
import {
  X,
  Star,
  MessageSquare,
  ArrowRight,
  Loader2,
  Search,
  FileText,
  Play,
  Pause,
  Filter,
} from "lucide-react"
import { decryptMessage } from "@/lib/encryption"
import { getKnownProfiles } from "@/lib/dataset"

interface StarredMessagesDrawerProps {
  user: User
  conversationId?: string | null
  conversationTitle?: string | null
  onClose: () => void
  onSelectConversation: (convId: string, messageId?: string) => void
}

export function StarredMessagesDrawer({
  user,
  conversationId,
  conversationTitle,
  onClose,
  onSelectConversation,
}: StarredMessagesDrawerProps) {
  const [starredMessages, setStarredMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterThisChatOnly, setFilterThisChatOnly] = useState<boolean>(Boolean(conversationId))
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)

  const activeConvId = filterThisChatOnly ? conversationId : null

  const loadStarred = async () => {
    try {
      setLoading(true)
      const url = activeConvId
        ? `/api/chat/messages?starredUserId=${encodeURIComponent(user.id)}&conversationId=${encodeURIComponent(activeConvId)}`
        : `/api/chat/messages?starredUserId=${encodeURIComponent(user.id)}`

      const res = await fetch(url)
      if (res.ok) {
        const rawData = await res.json()
        // Decrypt all encrypted messages
        const decryptedList = await Promise.all(
          rawData.map(async (msg: any) => {
            let plainText = msg.content || ""
            if (msg.is_encrypted && msg.content) {
              try {
                plainText = await decryptMessage(msg.content, msg.conversation_id)
              } catch {
                plainText = msg.content
              }
            }
            return {
              ...msg,
              decrypted_content: plainText,
            }
          })
        )
        setStarredMessages(decryptedList)
      }
    } catch (e) {
      console.warn("Failed to load starred messages:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStarred()
  }, [user.id, activeConvId])

  const handleUnstar = async (msgId: string) => {
    try {
      setStarredMessages((prev) => prev.filter((m) => m.id !== msgId))

      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "star",
          messageId: msgId,
          isStarred: false,
          userId: user.id,
        }),
      })
    } catch (e) {
      console.warn("Failed to unstar message:", e)
    }
  }

  const toggleAudio = (msgId: string, url: string) => {
    if (playingAudioId === msgId && audioEl) {
      audioEl.pause()
      setPlayingAudioId(null)
      return
    }

    if (audioEl) {
      audioEl.pause()
    }

    const audio = new Audio(url)
    audio.onended = () => setPlayingAudioId(null)
    audio.play().catch(() => {})
    setAudioEl(audio)
    setPlayingAudioId(msgId)
  }

  const getSenderName = (msg: any) => {
    if (msg.sender_id === user.id) return "You"
    const known = getKnownProfiles().find((p) => p.id === msg.sender_id)
    return known?.display_name || known?.email?.split("@")[0] || "Contact"
  }

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return starredMessages
    const q = searchQuery.toLowerCase()
    return starredMessages.filter(
      (m) =>
        m.decrypted_content?.toLowerCase().includes(q) ||
        m.file_name?.toLowerCase().includes(q) ||
        getSenderName(m).toLowerCase().includes(q)
    )
  }, [starredMessages, searchQuery])

  return (
    <div className="w-full md:w-96 bg-[#f0f2f5] dark:bg-[#111b21] border-r border-border flex flex-col h-full z-40 select-none animate-in slide-in-from-left duration-200">
      {/* WhatsApp Green/Slate Header */}
      <div className="h-16 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between px-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-wide leading-tight truncate">
              Starred Messages
            </h2>
            {conversationTitle && (
              <p className="text-[11px] text-white/80 truncate font-normal">
                {filterThisChatOnly ? `In "${conversationTitle}"` : "All chats"}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white cursor-pointer transition-colors"
          title="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-2.5 bg-card/60 border-b border-border space-y-2">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-muted/60 dark:bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50 text-xs">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search starred messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 focus:outline-none text-foreground placeholder:text-muted-foreground text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground text-[11px]"
            >
              Clear
            </button>
          )}
        </div>

        {/* This Chat vs All Chats Filter Pill */}
        {conversationId && (
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterThisChatOnly(true)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                filterThisChatOnly
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              This Chat
            </button>
            <button
              onClick={() => setFilterThisChatOnly(false)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                !filterThisChatOnly
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Chats
            </button>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading starred messages...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-8 text-center space-y-3 text-muted-foreground mt-8">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-2xs">
              <Star className="w-7 h-7 fill-amber-500/30" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {searchQuery ? "No matching starred messages" : "No starred messages yet"}
            </p>
            <p className="text-xs max-w-xs mx-auto leading-relaxed">
              {searchQuery
                ? "Try searching for a different keyword or view all chats."
                : "Hover over any message in a chat and click the Star ⭐ icon to save it here for quick reference."}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const senderName = getSenderName(msg)
            const isOwn = msg.sender_id === user.id

            return (
              <div
                key={msg.id}
                className="bg-card text-card-foreground rounded-2xl p-3 border border-border shadow-xs hover:border-emerald-500/40 transition-all space-y-2 group relative"
              >
                {/* Header: Sender & Star Button */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {senderName}
                    </span>
                    <span className="text-[10px] opacity-75">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUnstar(msg.id)}
                      className="p-1 text-amber-500 hover:text-muted-foreground rounded-full hover:bg-muted cursor-pointer transition-colors"
                      title="Unstar message"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    </button>
                  </div>
                </div>

                {/* Media Preview (Photo) */}
                {msg.message_type === "photo" && msg.media_url && (
                  <div className="rounded-xl overflow-hidden bg-black/5 max-h-48">
                    <img
                      src={msg.media_url}
                      alt="Starred photo"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                )}

                {/* Media Preview (Video) */}
                {msg.message_type === "video" && msg.media_url && (
                  <div className="rounded-xl overflow-hidden bg-black/10 max-h-48">
                    <video
                      src={msg.media_url}
                      controls
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                )}

                {/* Document Preview */}
                {msg.message_type === "document" && msg.media_url && (
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate flex-1 font-medium">{msg.file_name || "Document"}</span>
                  </div>
                )}

                {/* Audio Voice Note Preview */}
                {msg.message_type === "audio" && msg.media_url && (
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/50">
                    <button
                      onClick={() => toggleAudio(msg.id, msg.media_url)}
                      className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center cursor-pointer shadow-xs"
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>
                    <span className="text-xs text-muted-foreground">Voice note</span>
                  </div>
                )}

                {/* Plaintext Content */}
                {msg.decrypted_content && msg.decrypted_content !== "Shared a photo" && msg.decrypted_content !== "Shared a video" && (
                  <p className="text-xs md:text-sm text-foreground break-words leading-relaxed whitespace-pre-wrap">
                    {msg.decrypted_content}
                  </p>
                )}

                {/* Bottom Footer: Date & Jump to chat */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => {
                      onSelectConversation(msg.conversation_id, msg.id)
                      onClose()
                    }}
                    className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    Jump to chat <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
