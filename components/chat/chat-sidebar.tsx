"use client"

import type { User } from "@supabase/supabase-js"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogOut, Plus, Search, Zap, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

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
        .eq("email", newChatEmail)
        .single()

      if (userError || !otherUser) {
        setError("User not found")
        return
      }

      if (otherUser.id === user.id) {
        setError("You cannot chat with yourself")
        return
      }

      const { data: existingConversation, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1_id.eq.${user.id},participant_2_id.eq.${otherUser.id}),and(participant_1_id.eq.${otherUser.id},participant_2_id.eq.${user.id})`,
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
          console.log(" Error creating conversation:", createError)
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
      console.log(" Error in handleStartNewChat:", err)
      setError("An error occurred")
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    const otherParticipant = conv.participant_1_id === user.id ? conv.participant_2 : conv.participant_1
    return otherParticipant?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col md:border-r md:border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">A Chat</h1>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-gray-600 hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300"
            />
          </div>
          <Button size="sm" onClick={() => setShowNewChat(!showNewChat)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onShowStories} className="border-gray-300 bg-transparent">
            <Zap className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onShowCallHistory} className="border-gray-300 bg-transparent">
            <Clock className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* New Chat Form */}
      {showNewChat && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="space-y-2">
            <Input
              placeholder="Enter email (e.g., arij@gmail.com)"
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleStartNewChat()}
              className="border-gray-300"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleStartNewChat} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Start Chat
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewChat(false)} className="border-gray-300">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No conversations yet</div>
        ) : (
          filteredConversations.map((conv) => {
            const otherParticipant = conv.participant_1_id === user.id ? conv.participant_2 : conv.participant_1
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                  selectedConversation === conv.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {otherParticipant?.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{otherParticipant?.display_name}</p>
                    <p className="text-sm text-gray-500 truncate">{otherParticipant?.email}</p>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
