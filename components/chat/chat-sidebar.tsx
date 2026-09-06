"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogOut, Plus, Search, Zap, Clock, MessageSquare, UserCheck, Loader2, Edit2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProfileDrawer } from "./profile-drawer"
import {
  apiGetUsers,
  apiCreateConversation,
  apiRegisterUser,
  type ChatUser,
} from "@/lib/chat-api"
import {
  getKnownProfiles,
  searchProfiles,
  saveLocalConversation,
  registerProfile,
} from "@/lib/dataset"

interface ChatSidebarProps {
  user: User
  conversations: any[]
  selectedConversation: string | null
  onSelectConversation: (id: string) => void
  onShowStories: () => void
  onShowCallHistory: () => void
  loading: boolean
  className?: string
}

export default function ChatSidebar({
  user,
  conversations,
  selectedConversation,
  onSelectConversation,
  onShowStories,
  onShowCallHistory,
  loading,
  className,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatEmail, setNewChatEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [registeredUsers, setRegisteredUsers] = useState<ChatUser[]>([])
  const [loadingRegisteredUsers, setLoadingRegisteredUsers] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentDisplayName, setCurrentDisplayName] = useState(
    user.user_metadata?.display_name || user.email?.split("@")[0] || "User"
  )
  const [currentStatus, setCurrentStatus] = useState(
    user.user_metadata?.status || "Hey there! I am using WhatsApp."
  )
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(
    user.user_metadata?.avatar_url || ""
  )
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

      try {
        const serverUsers = await apiGetUsers(user.id)
        const localProfiles = getKnownProfiles()

        const map = new Map<string, ChatUser>()
        localProfiles.forEach((p) => {
          if (p.id !== user.id && p.email.toLowerCase() !== (user.email || "").toLowerCase()) {
            map.set(p.email.toLowerCase(), p)
          }
        })
        serverUsers.forEach((u) => {
          if (u.id !== user.id && u.email.toLowerCase() !== (user.email || "").toLowerCase()) {
            map.set(u.email.toLowerCase(), u)
          }
        })

        setRegisteredUsers(Array.from(map.values()))
      } catch (err) {
        console.warn("Could not fetch registered users:", err)
      } finally {
        setLoadingRegisteredUsers(false)
      }
    }

    fetchRegisteredUsers()
  }, [showNewChat, user.id, user.email])

  const startChatWithUser = async (targetUser: { id: string; email: string; display_name?: string }) => {
    if (targetUser.id === user.id || targetUser.email?.toLowerCase() === user.email?.toLowerCase()) {
      setError("You cannot chat with yourself")
      return
    }

    setError(null)
    setIsSearching(true)

    try {
      // 1. Check if conversation already exists in current list
      const existingInState = conversations.find(
        (c) =>
          (c.participant_1_id === user.id && c.participant_2_id === targetUser.id) ||
          (c.participant_1_id === targetUser.id && c.participant_2_id === user.id) ||
          (c.participant_1?.email?.toLowerCase() === targetUser.email.toLowerCase() ||
            c.participant_2?.email?.toLowerCase() === targetUser.email.toLowerCase())
      )

      if (existingInState) {
        onSelectConversation(existingInState.id)
        setNewChatEmail("")
        setShowNewChat(false)
        setIsSearching(false)
        return
      }

      // 2. Create conversation via server API
      const newConv = await apiCreateConversation(user.id, targetUser.id)
      if (newConv && newConv.id) {
        onSelectConversation(newConv.id)
        setNewChatEmail("")
        setShowNewChat(false)
        setIsSearching(false)
        return
      }

      // 3. Fallback locally
      const localConv = saveLocalConversation({
        participant_1_id: user.id,
        participant_2_id: targetUser.id,
      })

      onSelectConversation(localConv.id)
      setNewChatEmail("")
      setShowNewChat(false)
    } catch (err: any) {
      console.error("Error starting chat:", err)
      const localConv = saveLocalConversation({
        participant_1_id: user.id,
        participant_2_id: targetUser.id,
      })
      onSelectConversation(localConv.id)
      setNewChatEmail("")
      setShowNewChat(false)
    } finally {
      setIsSearching(false)
    }
  }

  const handleStartNewChat = async () => {
    const query = newChatEmail.trim()
    if (!query) return

    setError(null)
    setIsSearching(true)

    try {
      let targetUser: any = null

      // 1. Check loaded registered users
      const match = registeredUsers.find(
        (u) =>
          u.email.toLowerCase() === query.toLowerCase() ||
          u.display_name?.toLowerCase() === query.toLowerCase() ||
          u.email.toLowerCase().includes(query.toLowerCase())
      )

      if (match) {
        targetUser = match
      }

      // 2. Check local dataset
      if (!targetUser) {
        const localMatches = searchProfiles(query, user.id)
        if (localMatches.length > 0) {
          targetUser = localMatches[0]
        }
      }

      // 3. If user typed an email, register it and start chat
      if (!targetUser && query.includes("@")) {
        targetUser = await apiRegisterUser({
          id: `user-${query.replace(/[^a-zA-Z0-9]/g, "-")}`,
          email: query,
          display_name: query.split("@")[0],
        })
        registerProfile(targetUser)
      }

      if (!targetUser) {
        setError(`No user found matching "${query}". Try typing their full email address.`)
        setIsSearching(false)
        return
      }

      await startChatWithUser(targetUser)
    } catch (err: any) {
      console.error("Error searching for user:", err)
      setError("An error occurred starting the chat")
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
    <div className={`w-full md:w-80 bg-card border-r border-border flex flex-col shrink-0 h-full overflow-hidden ${className || ""}`}>
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
              WhatsApp
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0 cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Current User Profile Card - Click to Update Name, Photo & Status */}
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors w-full text-left cursor-pointer border border-border/50 group"
          title="Click to view & update your WhatsApp profile"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-xs">
            {currentAvatarUrl ? (
              <img src={currentAvatarUrl} alt={currentDisplayName} className="w-full h-full object-cover" />
            ) : (
              currentDisplayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600 transition-colors">
              {currentDisplayName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{currentStatus}</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium px-2 py-0.5 rounded-md bg-emerald-500/10">
            <Edit2 className="w-3 h-3" /> Profile
          </div>
        </button>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-border bg-background text-sm rounded-xl"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewChat(!showNewChat)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 w-9 p-0 shrink-0 rounded-xl cursor-pointer"
            title="Start new chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onShowStories}
            className="border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground h-9 w-9 p-0 shrink-0 cursor-pointer"
            title="Status / Stories"
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
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </Button>
        </div>
      </div>

      {/* New Chat Panel */}
      {showNewChat && (
        <div className="p-4 border-b border-border bg-muted/30 space-y-3 animate-in slide-in-from-top-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Start New Chat</span>
              <button
                onClick={() => setShowNewChat(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl h-8 cursor-pointer"
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
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Contacts:
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
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
                    ? "bg-emerald-500/10 border-l-4 border-l-emerald-600 pl-[10px]"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold shrink-0 shadow-xs">
                  {otherParticipant?.avatar_url ? (
                    <img
                      src={otherParticipant.avatar_url}
                      alt={otherParticipant.display_name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    otherParticipant?.display_name?.[0]?.toUpperCase() || otherParticipant?.email?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {otherParticipant?.display_name || otherParticipant?.email?.split('@')[0] || "Chat"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{otherParticipant?.email || ""}</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {showProfileModal && (
        <ProfileDrawer
          user={user}
          currentProfile={{
            id: user.id,
            email: user.email || "",
            display_name: currentDisplayName,
            status: currentStatus,
            avatar_url: currentAvatarUrl,
          }}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={(updated) => {
            setCurrentDisplayName(updated.display_name)
            if (updated.status) setCurrentStatus(updated.status)
            if (updated.avatar_url !== undefined) setCurrentAvatarUrl(updated.avatar_url)
          }}
        />
      )}
    </div>
  )
}
