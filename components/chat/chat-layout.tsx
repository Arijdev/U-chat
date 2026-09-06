"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import ChatSidebar from "./chat-sidebar"
import ChatWindow from "./chat-window"
import StoriesView from "./stories-view"
import CallHistory from "./call-history"
import { AlertTriangle, ExternalLink } from "lucide-react"

export default function ChatLayout({ user }: { user: User }) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showStories, setShowStories] = useState(false)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dbNeedsSetup, setDbNeedsSetup] = useState(false)

  useEffect(() => {
    const loadConversations = async () => {
      const supabase = createClient()

      // Ensure current user profile is synced in public.profiles
      try {
        const { error: profileUpsertError } = await supabase.from("profiles").upsert(
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
        if (profileUpsertError && (profileUpsertError.code === "PGRST205" || profileUpsertError.message?.includes("schema cache") || profileUpsertError.message?.includes("profiles"))) {
          setDbNeedsSetup(true)
        }
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
        if (convError.code === "PGRST205" || convError.message?.includes("schema cache") || convError.message?.includes("conversations")) {
          setDbNeedsSetup(true)
        }
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
    <div className="flex flex-col h-screen bg-background text-foreground w-full overflow-hidden">
      {dbNeedsSetup && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200 shrink-0 z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Supabase Database Setup Required:</strong> Database tables have not been created yet in your Supabase project.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Run <code>scripts/setup_complete_database.sql</code>
            </span>
            <a
              href="https://supabase.com/dashboard/project/wngcxtcufszlzpbtvauu/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Open Supabase SQL Editor <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <ChatSidebar
          user={user}
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          onShowStories={() => setShowStories(true)}
          onShowCallHistory={() => setShowCallHistory(true)}
          loading={loading}
          dbNeedsSetup={dbNeedsSetup}
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
    </div>
  )
}
