"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogOut, Plus, Search, Zap, Clock, MessageSquare, UserCheck, Loader2 } from "lucide-react"
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
  const [isSearching, setIsSearching] = useState(false)
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([])
  const [loadingRegisteredUsers, setLoadingRegisteredUsers] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  // When new chat panel opens, fetch available registered users to display as quick contacts
  useEffect(() => {
    if (!showNewChat) return
    const fetchRegisteredUsers = async () => {
      setLoadingRegisteredUsers(true)
      const supabase = createClient()
      try {
        const { data, error: fetchErr } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .neq("id", user.id)
          .limit(20)

        if (!fetchErr && data) {
          setRegisteredUsers(data)
        }
      } catch (err) {
        console.warn("Could not fetch registered users:", err)
      } finally {
        setLoadingRegisteredUsers(false)
      }
    }
    fetchRegisteredUsers()
  }, [showNewChat, user.id])

  const startChatWithUser = async (targetUser: { id: string; email: string; display_name?: string }) => {
    if (targetUser.id === user.id) {
      setError("You cannot chat with yourself")
      return
    }

    const supabase = createClient()
    setError(null)
    setIsSearching(true)

    try {
      // Check if conversation already exists (checking both participant directions)
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1_id.eq.${user.id},participant_2_id.eq.${targetUser.id}),and(participant_1_id.eq.${targetUser.id},participant_2_id.eq.${user.id})`,
        )
        .limit(1)

      if (existingConversation && existingConversation.length > 0) {
        onSelectConversation(existingConversation[0].id)
        setNewChatEmail("")
        setShowNewChat(false)
        setIsSearching(false)
        return
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
          participant_1_id: user.id,
          participant_2_id: targetUser.id,
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating conversation:", createError)
        setError("Failed to create conversation: " + createError.message)
        setIsSearching(false)
        return
      }

      if (newConversation) {
        onSelectConversation(newConversation.id)
      }
      setNewChatEmail("")
      setShowNewChat(false)
    } catch (err: any) {
      console.error("Error in startChatWithUser:", err)
      setError("An error occurred starting the chat")
    } finally {
      setIsSearching(false)
    }
  }

  const handleStartNewChat = async () => {
    const query = newChatEmail.trim()
    if (!query) return

    const supabase = createClient()
    setError(null)
    setIsSearching(true)

    try {
      // 1. Try exact email match (case-insensitive)
      let { data: usersFound } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url")
        .ilike("email", query)
        .limit(1)

      // 2. Try display_name match (case-insensitive)
      if (!usersFound || usersFound.length === 0) {
        const { data: byName } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .ilike("display_name", query)
          .limit(1)
        usersFound = byName
      }

      // 3. Try partial substring match on either email or display_name
      if (!usersFound || usersFound.length === 0) {
        const { data: partialMatch } = await supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url")
          .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
          .limit(1)
        usersFound = partialMatch
      }

      const targetUser = usersFound?.[0]

      if (!targetUser) {
        setError(`No user found matching "${query}". Make sure they have registered an account on U-Chat.`)
        setIsSearching(false)
        return
      }

      await startChatWithUser(targetUser)
    } catch (err: any) {
      console.error("Error searching for user:", err)
      setError("An error occurred searching for user")
      setIsSearching(false)
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

  // Filter registered users in the new chat panel based on user input
  const filteredRegisteredUsers = registeredUsers.filter((u) => {
    if (!newChatEmail.trim()) return true
    const q = newChatEmail.toLowerCase().trim()
    return u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q)
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
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 p-0 shrink-0 cursor-pointer"
            title="Start new chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onShowStories}
            className="border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground h-9 w-9 p-0 shrink-0 cursor-pointer"
            title="Stories"
          >
            <Zap className="w-4 h-4 text-amber-500" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onShowCallHistory}
            className="border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground h-9 w-9 p-0 shrink-0 cursor-pointer"
            title="Call history"
          >
            <Clock className="w-4 h-4 text-blue-500" />
          </Button>
        </div>
      </div>

      {/* New Chat Panel */}
      {showNewChat && (
        <div className="p-4 border-b border-border bg-muted/30 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Start New Chat</span>
              <button
                onClick={() => setShowNewChat(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <Input
              placeholder="Enter email or username..."
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartNewChat()}
              className="border-border bg-background text-sm rounded-xl"
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg font-medium leading-relaxed">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleStartNewChat}
                disabled={isSearching || !newChatEmail.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl h-8"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Search & Start Chat
              </Button>
            </div>
          </div>

          {/* Quick-Pick Registered Users */}
          {registeredUsers.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-primary" /> Registered Users:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {loadingRegisteredUsers ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">Loading users...</p>
                ) : filteredRegisteredUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">No matching users</p>
                ) : (
                  filteredRegisteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startChatWithUser(u)}
                      className="w-full p-2 text-left rounded-lg hover:bg-accent flex items-center gap-2 transition-colors cursor-pointer border border-transparent hover:border-border"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {u.display_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{u.display_name || u.email?.split("@")[0]}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
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
