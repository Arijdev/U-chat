"use client"

import { useState, useEffect, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  X,
  Camera,
  Edit3,
  Send,
  Trash2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Smile,
  Plus,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import {
  apiGetStories,
  apiCreateStory,
  apiDeleteStory,
  apiSendMessage,
  apiCreateConversation,
  connectChatStream,
  type ChatStory,
} from "@/lib/chat-api"

interface StoriesViewProps {
  user: User
  onClose: () => void
  onOpenChatWithContact?: (conversationId: string) => void
}

const STATUS_COLORS = [
  "#00a884", // WhatsApp Emerald
  "#7b1fa2", // Purple
  "#1565c0", // Royal Blue
  "#c2185b", // Magenta
  "#d84315", // Orange Red
  "#37474f", // Dark Slate
  "#00897b", // Teal
]

export default function StoriesView({ user, onClose, onOpenChatWithContact }: StoriesViewProps) {
  const [stories, setStories] = useState<ChatStory[]>([])
  const [loading, setLoading] = useState(true)
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set())

  // Active playing story state
  const [selectedUserGroup, setSelectedUserGroup] = useState<{
    userId: string
    user: any
    stories: ChatStory[]
  } | null>(null)
  const [activeStoryIndex, setActiveStoryIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createMode, setCreateMode] = useState<"photo" | "text">("photo")
  const [caption, setCaption] = useState("")
  const [textContent, setTextContent] = useState("")
  const [selectedColor, setSelectedColor] = useState(STATUS_COLORS[0])
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)

  // 1. Fetch stories
  const loadStories = async () => {
    try {
      const data = await apiGetStories()
      setStories(data)
    } catch (e) {
      console.error("Error loading stories:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStories()

    // Real-time stream listener
    const disconnect = connectChatStream(user.id, (event) => {
      if (event.type === "story_created" || event.type === "story_deleted") {
        loadStories()
      }
    })

    return () => disconnect()
  }, [user.id])

  // Group stories by user
  const ownStories = stories.filter((s) => s.user_id === user.id)
  const otherStories = stories.filter((s) => s.user_id !== user.id)

  const contactsWithStoriesMap = new Map<string, { userId: string; user: any; stories: ChatStory[] }>()
  otherStories.forEach((s) => {
    if (!contactsWithStoriesMap.has(s.user_id)) {
      contactsWithStoriesMap.set(s.user_id, {
        userId: s.user_id,
        user: s.user || { id: s.user_id, display_name: "Contact", email: "" },
        stories: [],
      })
    }
    contactsWithStoriesMap.get(s.user_id)!.stories.push(s)
  })

  const contactGroups = Array.from(contactsWithStoriesMap.values())

  const unviewedGroups = contactGroups.filter((g) =>
    g.stories.some((s) => !viewedStoryIds.has(s.id))
  )
  const viewedGroups = contactGroups.filter((g) =>
    g.stories.every((s) => !viewedStoryIds.has(s.id)) ? false : true
  )

  // 2. Story Progress Auto-Play Timer (5 seconds per slide)
  useEffect(() => {
    if (!selectedUserGroup) {
      setProgressPercent(0)
      return
    }

    const currentStory = selectedUserGroup.stories[activeStoryIndex]
    if (currentStory) {
      setViewedStoryIds((prev) => new Set(prev).add(currentStory.id))
    }

    if (isPaused) return

    setProgressPercent(0)
    const DURATION_MS = 5000
    const INTERVAL_MS = 50
    const step = (INTERVAL_MS / DURATION_MS) * 100

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          handleNextStory()
          return 0
        }
        return prev + step
      })
    }, INTERVAL_MS)

    progressTimerRef.current = timer

    return () => {
      clearInterval(timer)
    }
  }, [selectedUserGroup, activeStoryIndex, isPaused])

  const handleNextStory = () => {
    if (!selectedUserGroup) return

    if (activeStoryIndex < selectedUserGroup.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1)
      setProgressPercent(0)
    } else {
      // Move to next contact or close
      const currentGroupIndex = contactGroups.findIndex((g) => g.userId === selectedUserGroup.userId)
      if (currentGroupIndex >= 0 && currentGroupIndex < contactGroups.length - 1) {
        setSelectedUserGroup(contactGroups[currentGroupIndex + 1])
        setActiveStoryIndex(0)
        setProgressPercent(0)
      } else {
        setSelectedUserGroup(null)
      }
    }
  }

  const handlePrevStory = () => {
    if (!selectedUserGroup) return

    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1)
      setProgressPercent(0)
    } else {
      const currentGroupIndex = contactGroups.findIndex((g) => g.userId === selectedUserGroup.userId)
      if (currentGroupIndex > 0) {
        const prevGroup = contactGroups[currentGroupIndex - 1]
        setSelectedUserGroup(prevGroup)
        setActiveStoryIndex(prevGroup.stories.length - 1)
        setProgressPercent(0)
      }
    }
  }

  // 3. Create Story handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string)
      setCreateMode("photo")
      setShowCreateModal(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handlePublishStory = async () => {
    if (createMode === "photo" && !photoPreview) return
    if (createMode === "text" && !textContent.trim()) return

    setIsUploading(true)
    try {
      await apiCreateStory({
        user_id: user.id,
        media_url: createMode === "photo" ? photoPreview || undefined : undefined,
        text_content: createMode === "text" ? textContent.trim() : undefined,
        background_color: createMode === "text" ? selectedColor : undefined,
        caption: createMode === "photo" ? caption.trim() || undefined : undefined,
      })

      setShowCreateModal(false)
      setPhotoPreview(null)
      setCaption("")
      setTextContent("")
      loadStories()
    } catch (e) {
      console.error("Failed to publish story:", e)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteCurrentStory = async (storyId: string) => {
    if (!window.confirm("Delete this status update?")) return
    await apiDeleteStory(storyId, user.id)
    loadStories()
    setSelectedUserGroup(null)
  }

  // 4. Send Reply to Status as a direct message
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedUserGroup) return
    setSendingReply(true)

    try {
      const conv = await apiCreateConversation(user.id, selectedUserGroup.userId)
      if (conv && conv.id) {
        const currentStory = selectedUserGroup.stories[activeStoryIndex]
        const storyRef = currentStory.caption
          ? `Status: "${currentStory.caption}"`
          : currentStory.text_content
          ? `Status: "${currentStory.text_content}"`
          : "your status"

        await apiSendMessage({
          conversation_id: conv.id,
          sender_id: user.id,
          content: `Replied to ${storyRef}:\n${replyText.trim()}`,
          message_type: "text",
          is_encrypted: false,
        })

        setReplyText("")
        alert("Reply sent as direct message!")
      }
    } catch (e) {
      console.error("Failed to send reply:", e)
    } finally {
      setSendingReply(false)
    }
  }

  const formatTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const activeStory = selectedUserGroup?.stories[activeStoryIndex]

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-background overflow-hidden relative text-foreground">
      {/* LEFT PANEL: WhatsApp Status List */}
      <div className="w-full md:w-96 bg-card border-r border-border flex flex-col shrink-0 h-full overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-border px-4 flex items-center justify-between bg-white dark:bg-[#202c33] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-full cursor-pointer transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Status</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCreateMode("text")
                setShowCreateModal(true)
              }}
              className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-foreground cursor-pointer transition-colors"
              title="Text status"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white cursor-pointer transition-colors shadow-xs"
              title="Camera status"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />

        {/* Stories List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30 bg-[#f0f2f5] dark:bg-[#111b21]">
          {/* My Status Card */}
          <div
            onClick={() => {
              if (ownStories.length > 0) {
                setSelectedUserGroup({
                  userId: user.id,
                  user: {
                    id: user.id,
                    display_name: user.user_metadata?.display_name || "My status",
                    avatar_url: user.user_metadata?.avatar_url,
                  },
                  stories: ownStories,
                })
                setActiveStoryIndex(0)
              } else {
                fileInputRef.current?.click()
              }
            }}
            className="p-3.5 bg-white dark:bg-[#202c33] flex items-center gap-3.5 hover:bg-muted/40 cursor-pointer transition-colors"
          >
            <div className="relative shrink-0">
              <div
                className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center ${
                  ownStories.length > 0
                    ? "border-2 border-emerald-500 p-0.5"
                    : "bg-muted"
                }`}
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="My status"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {user.email?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>

              {ownStories.length === 0 && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-600 rounded-full border-2 border-white dark:border-[#202c33] flex items-center justify-center text-white text-xs">
                  <Plus className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">My status</p>
              <p className="text-xs text-muted-foreground truncate">
                {ownStories.length > 0
                  ? `${ownStories.length} status update${ownStories.length > 1 ? "s" : ""} • ${formatTime(
                      ownStories[0].created_at
                    )}`
                  : "Tap to add status update"}
              </p>
            </div>
          </div>

          {/* Recent Updates Section */}
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading status updates...
            </div>
          ) : contactGroups.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No updates yet</p>
              <p className="text-xs">Status updates from your contacts will appear here.</p>
            </div>
          ) : (
            <>
              {unviewedGroups.length > 0 && (
                <div className="pt-2">
                  <p className="px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Recent updates
                  </p>
                  {unviewedGroups.map((group) => (
                    <div
                      key={group.userId}
                      onClick={() => {
                        setSelectedUserGroup(group)
                        setActiveStoryIndex(0)
                      }}
                      className="p-3.5 bg-white dark:bg-[#202c33] flex items-center gap-3.5 hover:bg-muted/40 cursor-pointer transition-colors border-b border-border/20"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 p-0.5 shrink-0 shadow-xs">
                        {group.user?.avatar_url ? (
                          <img
                            src={group.user.avatar_url}
                            alt="Contact"
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-base">
                            {group.user?.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {group.user?.display_name || group.user?.email || "Contact"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Today, {formatTime(group.stories[0].created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewedGroups.length > 0 && (
                <div className="pt-2">
                  <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Viewed updates
                  </p>
                  {viewedGroups.map((group) => (
                    <div
                      key={group.userId}
                      onClick={() => {
                        setSelectedUserGroup(group)
                        setActiveStoryIndex(0)
                      }}
                      className="p-3.5 bg-white dark:bg-[#202c33] flex items-center gap-3.5 hover:bg-muted/40 cursor-pointer transition-colors border-b border-border/20 opacity-80"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-muted-foreground/40 p-0.5 shrink-0">
                        {group.user?.avatar_url ? (
                          <img
                            src={group.user.avatar_url}
                            alt="Contact"
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted rounded-full flex items-center justify-center text-foreground font-bold text-base">
                            {group.user?.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {group.user?.display_name || group.user?.email || "Contact"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Today, {formatTime(group.stories[0].created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANEL / FULL SCREEN: Authentic WhatsApp Story Viewer */}
      <div className="flex-1 flex flex-col bg-black text-white relative h-full">
        {selectedUserGroup && activeStory ? (
          <div className="flex-1 flex flex-col relative w-full h-full max-w-xl mx-auto overflow-hidden">
            {/* Top Segmented Progress Bars */}
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
              {selectedUserGroup.stories.map((s, idx) => (
                <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75"
                    style={{
                      width:
                        idx < activeStoryIndex
                          ? "100%"
                          : idx === activeStoryIndex
                          ? `${progressPercent}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Top Story Header */}
            <div className="absolute top-7 left-3 right-3 z-30 flex items-center justify-between text-white drop-shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/40 bg-black/40 shrink-0">
                  {selectedUserGroup.user?.avatar_url ? (
                    <img src={selectedUserGroup.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-emerald-600">
                      {selectedUserGroup.user?.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold truncate leading-tight">
                    {selectedUserGroup.user?.display_name || selectedUserGroup.user?.email || "Contact"}
                  </p>
                  <p className="text-[11px] text-white/80">Today, {formatTime(activeStory.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>

                {activeStory.user_id === user.id && (
                  <button
                    onClick={() => handleDeleteCurrentStory(activeStory.id)}
                    className="p-2 hover:bg-destructive/80 rounded-full cursor-pointer transition-colors text-white"
                    title="Delete story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedUserGroup(null)}
                  className="p-2 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
                  title="Close story"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Story Content View Area */}
            <div className="flex-1 flex items-center justify-center relative w-full h-full select-none">
              {/* Left & Right Click Navigation Zones */}
              <div
                onClick={handlePrevStory}
                className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                title="Previous"
              />
              <div
                onClick={handleNextStory}
                className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
                title="Next"
              />

              {/* Left/Right Navigation Arrows for Desktop */}
              <button
                onClick={handlePrevStory}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white hidden md:flex items-center justify-center cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNextStory}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white hidden md:flex items-center justify-center cursor-pointer transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image Story */}
              {activeStory.media_url ? (
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                  <img
                    src={activeStory.media_url}
                    alt="Status"
                    className="max-w-full max-h-full object-contain"
                  />
                  {activeStory.caption && (
                    <div className="absolute bottom-16 inset-x-0 bg-black/60 backdrop-blur-xs p-4 text-center text-sm text-white font-medium">
                      {activeStory.caption}
                    </div>
                  )}
                </div>
              ) : (
                /* WhatsApp Colorful Text Status */
                <div
                  className="w-full h-full flex items-center justify-center p-8 text-center"
                  style={{ backgroundColor: activeStory.background_color || "#00a884" }}
                >
                  <p className="text-2xl md:text-3xl font-bold font-sans tracking-wide leading-relaxed text-white drop-shadow-md">
                    {activeStory.text_content}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Reply Bar (Only for other contacts' stories) */}
            {activeStory.user_id !== user.id && (
              <div className="p-3 bg-black/70 backdrop-blur-md flex items-center gap-2 z-30 border-t border-white/10">
                <Input
                  placeholder="Reply to status..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                  className="flex-1 bg-white/10 border-0 text-white placeholder:text-white/60 h-10 rounded-full text-sm px-4 focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white p-0 shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Empty Viewer Placeholder */
          <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center text-white/50">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-4 text-emerald-500">
              ⭕
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Click on a status to view</h2>
            <p className="text-xs max-w-sm">
              Status updates expire after 24 hours. You can add photos, videos, or colored text statuses just like WhatsApp.
            </p>
          </div>
        )}
      </div>

      {/* CREATE STATUS MODAL (Photo or Text) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden text-card-foreground">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {createMode === "photo" ? "Add Photo Status" : "Add Text Status"}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                className="text-white hover:bg-emerald-700/60 h-8 w-8 p-0 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              {createMode === "photo" ? (
                /* Photo Status Editor */
                <div className="space-y-3">
                  {photoPreview && (
                    <div className="aspect-video max-h-60 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                      <img src={photoPreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <Input
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="h-10 text-sm bg-muted/40 border-border rounded-xl"
                  />
                </div>
              ) : (
                /* Text Status Editor with WhatsApp Color Picker */
                <div className="space-y-4">
                  <div
                    className="h-44 rounded-xl p-4 flex items-center justify-center text-center text-white transition-colors"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <textarea
                      placeholder="Type a status..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      maxLength={140}
                      rows={3}
                      className="w-full bg-transparent border-0 text-center text-xl md:text-2xl font-bold placeholder:text-white/60 focus:outline-hidden resize-none text-white drop-shadow-sm"
                      autoFocus
                    />
                  </div>

                  {/* WhatsApp Color Palette Picker */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Background Color</p>
                    <div className="flex items-center gap-2">
                      {STATUS_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setSelectedColor(c)}
                          className={`w-8 h-8 rounded-full cursor-pointer transition-transform ${
                            selectedColor === c ? "scale-110 ring-2 ring-emerald-500 ring-offset-2" : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Publish Button */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePublishStory}
                  disabled={isUploading || (createMode === "text" && !textContent.trim())}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1" /> Share Status
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
