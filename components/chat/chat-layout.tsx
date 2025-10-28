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
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 w-full">
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
          <div className="flex-1 flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 md:flex">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a conversation</h2>
            <p className="text-gray-600">Choose a chat to start messaging</p>
          </div>
        </div>
      )}

      {showCallHistory && <CallHistory user={user} onClose={() => setShowCallHistory(false)} />}
    </div>
  )
}
