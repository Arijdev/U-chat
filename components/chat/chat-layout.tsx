"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect, useCallback } from "react"
import ChatSidebar from "./chat-sidebar"
import ChatWindow from "./chat-window"
import StoriesView from "./stories-view"
import CallHistory from "./call-history"
import {
  apiRegisterUser,
  apiGetConversations,
  connectChatStream,
} from "@/lib/chat-api"
import { registerProfile } from "@/lib/dataset"

export default function ChatLayout({ user }: { user: User }) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showStories, setShowStories] = useState(false)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 1. Register current user on the backend server and local store
  useEffect(() => {
    const userData = {
      id: user.id,
      email: user.email || "",
      display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
      avatar_url: user.user_metadata?.avatar_url || "",
    }
    apiRegisterUser(userData)
    registerProfile(userData)
  }, [user])

  const loadConversations = useCallback(async () => {
    try {
      const convs = await apiGetConversations(user.id)
      setConversations(convs)
    } catch (e) {
      console.warn("Error loading conversations:", e)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadConversations()

    // Realtime server stream: updates instantaneously when any message or conversation is created
    const disconnectStream = connectChatStream(user.id, (event) => {
      if (
        event.type === "conversation_created" ||
        event.type === "message_inserted" ||
        event.type === "user_updated" ||
        event.type === "heartbeat_poll"
      ) {
        loadConversations()
      }
    })

    return () => {
      disconnectStream()
    }
  }, [user.id, loadConversations])

  const isDetailActive = Boolean(selectedConversation || showStories || showCallHistory)

  return (
    <div className="flex h-screen bg-background text-foreground w-full overflow-hidden">
      <ChatSidebar
        user={user}
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={(id) => {
          setSelectedConversation(id)
          setShowStories(false)
          setShowCallHistory(false)
        }}
        onShowStories={() => {
          setShowStories(true)
          setShowCallHistory(false)
        }}
        onShowCallHistory={() => {
          setShowCallHistory(true)
          setShowStories(false)
        }}
        loading={loading}
        className={isDetailActive ? "hidden md:flex" : "flex"}
      />

      {showStories ? (
        <StoriesView
          user={user}
          onClose={() => setShowStories(false)}
          onOpenChatWithContact={(convId) => {
            setShowStories(false)
            setSelectedConversation(convId)
          }}
        />
      ) : selectedConversation ? (
        <ChatWindow
          conversationId={selectedConversation}
          user={user}
          onBack={() => setSelectedConversation(null)}
        />
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-accent/10">
          <div className="text-center p-8 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl shadow-xs">
              💬
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">WhatsApp Web</h2>
            <p className="text-sm text-muted-foreground">
              Send and receive messages with real-time end-to-end sync, voice notes, photos, and calls.
            </p>
          </div>
        </div>
      )}

      {showCallHistory && (
        <div className="fixed inset-0 md:relative z-40 bg-background/80 md:bg-transparent flex justify-end">
          <CallHistory user={user} onClose={() => setShowCallHistory(false)} />
        </div>
      )}
    </div>
  )
}
