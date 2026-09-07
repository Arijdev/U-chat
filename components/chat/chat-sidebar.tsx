"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  LogOut,
  Plus,
  Search,
  Zap,
  Clock,
  MessageSquare,
  UserCheck,
  Loader2,
  Edit2,
  Users,
  Archive,
  Check,
  X,
  Sparkles,
} from "lucide-react"
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
  onOpenMetaAi?: (prompt?: string) => void
  loading: boolean
  className?: string
}

type FilterTab = "all" | "unread" | "favorites" | "groups"

export default function ChatSidebar({
  user,
  conversations,
  selectedConversation,
  onSelectConversation,
  onShowStories,
  onShowCallHistory,
  onOpenMetaAi,
  loading,
  className,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([])
  const [newChatEmail, setNewChatEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [registeredUsers, setRegisteredUsers] = useState<ChatUser[]>([])
  const [loadingRegisteredUsers, setLoadingRegisteredUsers] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showArchivedOnly, setShowArchivedOnly] = useState(false)
  const [currentDisplayName, setCurrentDisplayName] = useState(
    user.user_metadata?.display_name || user.email?.split("@")[0] || "User"
  )
  const [currentStatus, setCurrentStatus] = useState(
    user.user_metadata?.status || "Hey there! I am using Arixo."
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

  // Load available users for contacts & group creation
  useEffect(() => {
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
  }, [user.id, user.email])

  const startChatWithUser = async (targetUser: { id: string; email: string; display_name?: string }) => {
    if (targetUser.id === user.id || targetUser.email?.toLowerCase() === user.email?.toLowerCase()) {
      setError("You cannot chat with yourself")
      return
    }

    setError(null)
    setIsSearching(true)

    try {
      const existingInState = conversations.find(
        (c) =>
          !c.is_group &&
          ((c.participant_1_id === user.id && c.participant_2_id === targetUser.id) ||
            (c.participant_1_id === targetUser.id && c.participant_2_id === user.id) ||
            c.participant_1?.email?.toLowerCase() === targetUser.email.toLowerCase() ||
            c.participant_2?.email?.toLowerCase() === targetUser.email.toLowerCase())
      )

      if (existingInState) {
        onSelectConversation(existingInState.id)
        setNewChatEmail("")
        setShowNewChat(false)
        setIsSearching(false)
        return
      }

      const newConv = await apiCreateConversation(user.id, targetUser.id)
      if (newConv && newConv.id) {
        onSelectConversation(newConv.id)
        setNewChatEmail("")
        setShowNewChat(false)
        setIsSearching(false)
        return
      }

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

      const match = registeredUsers.find(
        (u) =>
          u.email.toLowerCase() === query.toLowerCase() ||
          u.display_name?.toLowerCase() === query.toLowerCase() ||
          u.email.toLowerCase().includes(query.toLowerCase())
      )

      if (match) {
        targetUser = match
      }

      if (!targetUser) {
        const localMatches = searchProfiles(query, user.id)
        if (localMatches.length > 0) {
          targetUser = localMatches[0]
        }
      }

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

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_group: true,
          creator_id: user.id,
          name: groupName.trim(),
          member_ids: selectedGroupMembers,
        }),
      })

      if (res.ok) {
        const groupConv = await res.json()
        onSelectConversation(groupConv.id)
        setShowNewGroupModal(false)
        setGroupName("")
        setSelectedGroupMembers([])
      }
    } catch (e) {
      console.error("Failed to create group:", e)
    }
  }

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (showArchivedOnly) {
      return conv.is_archived
    }
    if (conv.is_archived) return false

    // Tabs filter
    if (filterTab === "groups" && !conv.is_group) return false
    if (filterTab === "unread" && !conv.unread_count) return false

    const otherParticipant = conv.participant_1_id === user.id ? conv.participant_2 : conv.participant_1
    const title = conv.is_group ? conv.group_name : otherParticipant?.display_name || otherParticipant?.email
    const q = searchQuery.toLowerCase()

    if (!q) return true
    return title?.toLowerCase().includes(q) || otherParticipant?.email?.toLowerCase().includes(q)
  })

  const archivedCount = conversations.filter((c) => c.is_archived).length

  return (
    <div
      className={`w-full md:w-88 bg-card border-r border-border flex flex-col shrink-0 h-full overflow-hidden select-none ${
        className || ""
      }`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-border space-y-3 bg-[#f0f2f5] dark:bg-[#111b21]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Chats</h1>
          <div className="flex items-center gap-1">
            {onOpenMetaAi && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenMetaAi()}
                className="text-muted-foreground hover:text-purple-600 h-8 w-8 p-0 rounded-full cursor-pointer transition-transform hover:scale-105"
                title="Ask Meta AI"
              >
                <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-xs">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                  </div>
                </div>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowNewGroupModal(true)}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-full cursor-pointer"
              title="New Group"
            >
              <Users className="w-4.5 h-4.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowNewChat(!showNewChat)}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-full cursor-pointer"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ask Meta AI or Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 border-0 bg-background text-xs rounded-xl shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500"
          />
        </div>

        {/* WhatsApp Filter Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "favorites", label: "Favorites" },
              { id: "groups", label: "Groups" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setShowArchivedOnly(false)
                setFilterTab(tab.id)
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
                !showArchivedOnly && filterTab === tab.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* New Chat Slide-down Panel */}
      {showNewChat && (
        <div className="p-3.5 border-b border-border bg-muted/40 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">New Chat</span>
            <button
              onClick={() => setShowNewChat(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <Input
            placeholder="Search contact email or username..."
            value={newChatEmail}
            onChange={(e) => setNewChatEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStartNewChat()}
            className="h-8 text-xs bg-background rounded-lg border-border"
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-lg font-medium">
              {error}
            </p>
          )}

          {/* Quick-Pick Registered Users */}
          {registeredUsers.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Contacts on WhatsApp:
              </p>
              {registeredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChatWithUser(u)}
                  className="w-full p-2 text-left rounded-lg hover:bg-card flex items-center gap-2.5 transition-colors cursor-pointer border border-transparent hover:border-border"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {u.display_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{u.display_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ask Meta AI prompt row when searching */}
      {searchQuery.trim().length > 0 && onOpenMetaAi && (
        <button
          onClick={() => {
            const q = searchQuery.trim()
            setSearchQuery("")
            onOpenMetaAi(q)
          }}
          className="w-full px-3.5 py-2.5 bg-purple-500/10 hover:bg-purple-500/15 border-b border-purple-500/20 flex items-center gap-3 transition-colors cursor-pointer text-left shrink-0 active:scale-[0.99]"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-emerald-400 p-0.5 shrink-0 flex items-center justify-center shadow-xs">
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">Ask Meta AI</span>
              <span className="text-[9px] bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded-full">
                AI
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          </div>
        </button>
      )}

      {/* Archived Chats Row */}
      {archivedCount > 0 && (
        <button
          onClick={() => setShowArchivedOnly(!showArchivedOnly)}
          className={`w-full p-3 border-b border-border/50 flex items-center justify-between transition-colors cursor-pointer ${
            showArchivedOnly ? "bg-emerald-500/10 text-emerald-600" : "hover:bg-muted/40 text-foreground"
          }`}
        >
          <div className="flex items-center gap-3">
            <Archive className="w-4.5 h-4.5 text-emerald-600" />
            <span className="text-xs font-semibold">Archived</span>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
            {archivedCount}
          </span>
        </button>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading chats...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">No chats found</p>
            <p className="text-xs text-muted-foreground">Start a chat or create a group with your contacts!</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversation === conv.id
            const isGroup = Boolean(conv.is_group)
            const otherParticipant = conv.participant_1_id === user.id ? conv.participant_2 : conv.participant_1
            const title = isGroup
              ? conv.group_name
              : otherParticipant?.display_name || otherParticipant?.email?.split("@")[0] || "Contact"
            const subtitle = isGroup ? `${conv.group_members?.length || 2} members` : otherParticipant?.status || otherParticipant?.email

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-3 text-left transition-colors flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-[#f0f2f5] dark:bg-[#2a3942] border-l-4 border-l-emerald-600 pl-2.5"
                    : "hover:bg-muted/40"
                }`}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-xs">
                  {isGroup ? (
                    conv.group_avatar ? (
                      <img src={conv.group_avatar} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-white" />
                    )
                  ) : otherParticipant?.avatar_url ? (
                    <img src={otherParticipant.avatar_url} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    title?.[0]?.toUpperCase() || "?"
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground truncate">{title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(conv.updated_at || conv.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" /> New Group
              </h3>
              <button
                onClick={() => setShowNewGroupModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Group Subject</label>
                <input
                  type="text"
                  placeholder="Type group subject here..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Add Members ({selectedGroupMembers.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2 bg-background/50">
                  {registeredUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2 text-center">No contacts available</p>
                  ) : (
                    registeredUsers.map((u) => {
                      const isSelected = selectedGroupMembers.includes(u.id)
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleGroupMember(u.id)}
                          className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? "bg-emerald-500/10 border border-emerald-500/40" : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                              {u.display_name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{u.display_name}</p>
                              <p className="text-[10px] text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-border bg-card"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewGroupModal(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
              >
                Create Group
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Floating Meta AI Ring Button on Mobile */}
      {onOpenMetaAi && (
        <button
          onClick={() => onOpenMetaAi()}
          className="md:hidden fixed bottom-20 right-5 z-20 w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-emerald-400 p-0.5 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          title="Ask Meta AI"
        >
          <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
        </button>
      )}
    </div>
  )
}
