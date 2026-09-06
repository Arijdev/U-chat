"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import ChatSidebar from "./chat-sidebar"
import ChatWindow from "./chat-window"
import StoriesView from "./stories-view"
import CallHistory from "./call-history"

export default function ChatLayout({ user }: { user: User }) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showStories, setShowStories] = useState(false)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConversations = async () => {
      const supabase = createClient()

      // Ensure current user profile is synced in public.profiles
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
      } catch (err) {
        console.warn("Could not sync current profile:", err)
      }

      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })

      if (convError) {
        console.log(" Error loading conversations:", convError)
        setLoading(false)
        return
      }

      // Fetch profile data for each participant
      if (convData && convData.length > 0) {
        const profileIds = new Set<string>()
        convData.forEach((conv) => {
          profileIds.add(conv.participant_1_id)
          profileIds.add(conv.participant_2_id)
        })

        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .in("id", Array.from(profileIds))

        if (!profileError && profiles) {
          const profileMap = new Map(profiles.map((p) => [p.id, p]))
          const enrichedConversations = convData.map((conv) => ({
            ...conv,
            participant_1: profileMap.get(conv.participant_1_id),
            participant_2: profileMap.get(conv.participant_2_id),
          }))
          setConversations(enrichedConversations)
        }
      } else {
        setConversations([])
      }
      setLoading(false)
    }

    loadConversations()

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
          console.log(" Conversations changed, reloading...")
          loadConversations()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user.id])

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
            <p className="text-sm text-muted-foreground">Choose a contact from the sidebar or start a new chat to begin messaging.</p>
          </div>
        </div>
      )}

      {showCallHistory && <CallHistory user={user} onClose={() => setShowCallHistory(false)} />}
    </div>
  )
}
