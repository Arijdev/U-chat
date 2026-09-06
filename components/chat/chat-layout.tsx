"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import ChatSidebar from "./chat-sidebar"
import ChatWindow from "./chat-window"
import StoriesView from "./stories-view"
import CallHistory from "./call-history"
import {
  registerProfile,
  getLocalConversations,
  getKnownProfiles,
  listenToSyncEvents,
} from "@/lib/dataset"

export default function ChatLayout({ user }: { user: User }) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showStories, setShowStories] = useState(false)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Register current user into known profiles dataset
  useEffect(() => {
    registerProfile({
      id: user.id,
      email: user.email || "",
      display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
      avatar_url: user.user_metadata?.avatar_url || "",
      status: "online",
    })
  }, [user])

  const loadConversations = useCallback(async () => {
    const supabase = createClient()

    // 1. Try to sync current user profile in Supabase (silent)
    try {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
          avatar_url: user.user_metadata?.avatar_url || "",
          status: "online",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
    } catch (err) {}

    // 2. Fetch remote conversations from Supabase
    let remoteConvs: any[] = []
    try {
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })

      if (!convError && convData) {
        // Enrich profiles from Supabase
        const profileIds = new Set<string>()
        convData.forEach((c) => {
          profileIds.add(c.participant_1_id)
          profileIds.add(c.participant_2_id)
        })

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .in("id", Array.from(profileIds))

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

        remoteConvs = convData.map((conv) => ({
          ...conv,
          participant_1: profileMap.get(conv.participant_1_id),
          participant_2: profileMap.get(conv.participant_2_id),
        }))
      }
    } catch (err) {
      console.warn("Supabase conversations fetch failed:", err)
    }

    // 3. Fetch local dataset conversations
    const localConvs = getLocalConversations(user.id)

    // 4. Merge conversations (remote + local, avoiding duplicates)
    const convMap = new Map<string, any>()
    const allKnownProfiles = getKnownProfiles()
    const fallbackProfileMap = new Map(allKnownProfiles.map((p) => [p.id, p]))

    // Add local first
    localConvs.forEach((c) => {
      convMap.set(c.id, c)
    })

    // Remote overwrites local if exists
    remoteConvs.forEach((c) => {
      convMap.set(c.id, c)
    })

    // Ensure participants are enriched even if remote profiles table was missing
    const enrichedList = Array.from(convMap.values()).map((conv) => {
      const p1 = conv.participant_1 || fallbackProfileMap.get(conv.participant_1_id) || {
        id: conv.participant_1_id,
        email: "user@example.com",
        display_name: "User",
      }
      const p2 = conv.participant_2 || fallbackProfileMap.get(conv.participant_2_id) || {
        id: conv.participant_2_id,
        email: "user@example.com",
        display_name: "User",
      }
      return {
        ...conv,
        participant_1: p1,
        participant_2: p2,
      }
    })

    enrichedList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    setConversations(enrichedList)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadConversations()

    // Realtime Supabase changes
    const supabase = createClient()
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadConversations()
        },
      )
      .subscribe()

    // Realtime local sync across tabs/windows
    const stopListening = listenToSyncEvents((type) => {
      if (type === "conversation_created" || type === "message_inserted") {
        loadConversations()
      }
    })

    return () => {
      channel.unsubscribe()
      stopListening()
    }
  }, [loadConversations])

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground w-full overflow-hidden">
      <ChatSidebar
        user={user}
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        onShowStories={() => setShowStories(true)}
        onShowCallHistory={() => setShowCallHistory(true)}
        loading={loading}
      />

      {showStories ? (
        <StoriesView user={user} onClose={() => setShowStories(false)} />
      ) : selectedConversation ? (
        <ChatWindow conversationId={selectedConversation} user={user} />
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-accent/10">
          <div className="text-center p-8 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 text-3xl shadow-xs">
              💬
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Select a conversation</h2>
            <p className="text-sm text-muted-foreground">
              Choose a contact from the sidebar or click + to start messaging right away.
            </p>
          </div>
        </div>
      )}

      {showCallHistory && <CallHistory user={user} onClose={() => setShowCallHistory(false)} />}
    </div>
  )
}
