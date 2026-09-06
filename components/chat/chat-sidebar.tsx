"use client"

import type { User } from "@supabase/supabase-js"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogOut, Plus, Search, Zap, Clock, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

interface ChatSidebarProps {
  user: User
  conversations: any[]
  selectedConversation: string | null
  onSelectConversation: (id: string) => void
  onShowStories: () => void
  onShowCallHistory: () => void
  loading: boolean
}

export default function ChatSidebar({
  user,
  conversations,
  selectedConversation,
  onSelectConversation,
  onShowStories,
  onShowCallHistory,
  loading,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEmail, setNewChatEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleStartNewChat = async () => {
    if (!newChatEmail.trim()) return

    const supabase = createClient()
    setError(null)

    try {
      // Get the other user's profile
      const { data: otherUser, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newChatEmail.trim())
        .single()

      if (userError || !otherUser) {
        setError("User not found with this email")
        return
      }

      if (otherUser.id === user.id) {
        setError("You cannot chat with yourself")
        return
      }

      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1_id.eq.${user.id},participant_2_id.eq.${otherUser.id}),and(participant_1_id.eq.${otherUser.id},participant_2_id.eq.${otherUser.id})`,
        )
        .single()

      if (existingConversation) {
        onSelectConversation(existingConversation.id)
      } else {
        const { data: newConversation, error: createError } = await supabase
          .from("conversations")
          .insert({
            participant_1_id: user.id,
            participant_2_id: otherUser.id,
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating conversation:", createError)
          setError("Failed to create conversation")
          return
        }

        if (newConversation) {
          onSelectConversation(newConversation.id)
        }
      }

      setNewChatEmail("")
      setShowNewChat(false)
    } catch (err) {
      console.error("Error in handleStartNewChat:", err)
      setError("An error occurred starting the chat")
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    const otherParticipant = conv.participant_1_id === user.id ? conv.participant_2 : conv.participant_1
    const q = searchQuery.toLowerCase()
    return (
      otherParticipant?.email?.toLowerCase().includes(q) ||
      otherParticipant?.display_name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="w-full md:w-80 bg-card border-r border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
              U-Chat
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/40 border-border text-sm h-9"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewChat(!showNewChat)}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 p-0 shrink-0"
            title="Start new chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onShowStories}
            className="border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground h-9 w-9 p-0 shrink-0"
            title="Stories"
          >
            <Zap className="w-4 h-4 text-amber-500" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onShowCallHistory}
            className="border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground h-9 w-9 p-0 shrink-0"
            title="Call history"
          >
            <Clock className="w-4 h-4 text-blue-500" />
          </Button>
        </div>
      </div>

      {/* New Chat Form */}
      {showNewChat && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="space-y-2">
            <Input
              placeholder="Enter contact email..."
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartNewChat()}
              className="border-border bg-background text-sm"
              autoFocus
            />
            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleStartNewChat} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                Start Chat
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewChat(false)} className="border-border text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground">Click the + button above to start a chat with someone!</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherParticipant = conv.participant_1_id === user.id ? conv.participant_2 : conv.participant_1
            const isSelected = selectedConversation === conv.id
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-3.5 text-left transition-colors flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 border-l-4 border-l-blue-600 pl-[10px]"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0 shadow-xs">
                  {otherParticipant?.display_name?.[0]?.toUpperCase() || otherParticipant?.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {otherParticipant?.display_name || otherParticipant?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{otherParticipant?.email}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
