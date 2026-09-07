"use client"

import type React from "react"
import type { User } from "@supabase/supabase-js"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  Phone,
  PhoneOff,
  Video,
  ImageIcon,
  Smile,
  Paperclip,
  FileText,
  Mic,
  Trash2,
  Search,
  Loader2,
  ArrowLeft,
  X,
  Star,
  MoreVertical,
  Users,
} from "lucide-react"
import { encryptMessage, decryptMessage } from "@/lib/encryption"
import { MessageBubble } from "./message-bubble"
import { ContactInfoDrawer } from "./contact-info-drawer"
import { StarredMessagesDrawer } from "./starred-messages-drawer"
import { GroupInfoDrawer } from "./group-info-drawer"
import {
  apiGetMessages,
  apiSendMessage,
  apiDeleteMessage,
  apiGetConversations,
  connectChatStream,
  type ChatMessage,
} from "@/lib/chat-api"
import { getProfileById, getKnownProfiles } from "@/lib/dataset"

interface ChatWindowProps {
  conversationId: string
  user: User
  initialConversation?: any
  onBack?: () => void
  onStartCall?: (type: "voice" | "video", otherUser: any) => void
}

function cleanAvatarUrl(url?: string): string {
  if (!url) return ""
  if (url.startsWith("/api/chat/avatar?userId=")) {
    const match = url.match(/\/api\/chat\/avatar\?userId=([a-zA-Z0-9_-]+)/)
    if (match) return `/api/chat/avatar?userId=${match[1]}&v=2`
  }
  return url
}

function extractOtherUserFromConv(conv: any, myUserId: string): any {
  if (!conv) return null
  if (conv.is_group) {
    return {
      id: conv.id,
      is_group: true,
      group_name: conv.group_name || "Group",
      display_name: conv.group_name || "Group",
      group_avatar: cleanAvatarUrl(conv.group_avatar || ""),
      avatar_url: cleanAvatarUrl(conv.group_avatar || ""),
      creator_id: conv.participant_1_id,
      group_members: conv.group_members || [],
      members: conv.members || [],
      status: `${(conv.group_members || []).length} members`,
    }
  }
  const otherId = conv.participant_1_id === myUserId ? conv.participant_2_id : conv.participant_1_id
  const profile = conv.participant_1_id === myUserId ? conv.participant_2 : conv.participant_1
  if (profile) {
    return {
      ...profile,
      avatar_url: cleanAvatarUrl(profile.avatar_url),
    }
  }

  const found = getProfileById(otherId) || getKnownProfiles().find((p) => p.id === otherId)
  if (found) {
    return {
      ...found,
      avatar_url: cleanAvatarUrl(found.avatar_url || `/api/chat/avatar?userId=${otherId}`),
    }
  }

  return {
    id: otherId,
    display_name: otherId.slice(0, 8),
    email: `${otherId.slice(0, 8)}@uchat.com`,
    avatar_url: `/api/chat/avatar?userId=${otherId}`,
  }
}

function sortAndDedupeMessages(list: any[]): any[] {
  const map = new Map<string, any>()
  list.forEach((m) => {
    if (m && m.id) {
      const existing = map.get(m.id)
      map.set(m.id, existing ? { ...existing, ...m } : m)
    }
  })
  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime()
    const timeB = new Date(b.created_at || 0).getTime()
    if (timeA !== timeB) return timeA - timeB
    return String(a.id).localeCompare(String(b.id))
  })
}

export default function ChatWindow({ conversationId, user, initialConversation, onBack, onStartCall }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<any>(() => extractOtherUserFromConv(initialConversation, user.id))
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [searchInChat, setSearchInChat] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showStarredDrawer, setShowStarredDrawer] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<any | null>(null)
  const chatMenuRef = useRef<HTMLDivElement>(null)
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; sender_name: string } | null>(null)

  const formatGroupMemberList = (group: any) => {
    const memberIds = group.group_members || []
    if (memberIds.length === 0) return "Group"
    const names = memberIds.map((mId: string) => {
      if (mId === user.id) return "You"
      const found = (group.members || []).find((m: any) => m.id === mId)
      if (found?.display_name) return found.display_name
      const known = getKnownProfiles().find((p) => p.id === mId)
      return known?.display_name || known?.email?.split("@")[0] || "Member"
    })
    return names.join(", ")
  }

  const getSenderDisplayName = (senderId: string) => {
    if (senderId === user.id) return "You"
    const found = (otherUser?.members || []).find((m: any) => m.id === senderId)
    if (found?.display_name) return found.display_name
    const known = getKnownProfiles().find((p) => p.id === senderId)
    return known?.display_name || known?.email?.split("@")[0] || "Member"
  }

  useEffect(() => {
    if (!showChatMenu) return
    const handleClick = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false)
      }
    }
    window.addEventListener("mousedown", handleClick)
    return () => window.removeEventListener("mousedown", handleClick)
  }, [showChatMenu])

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const decryptedMessagesRef = useRef<Map<string, string>>(new Map())

  const emojis = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "😍", "🤔", "😢", "😡", "👏", "🙏", "💯", "✨", "🎊", "🙌", "🤩", "🚀", "👌", "🥳"]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const prevCountRef = useRef(0)
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (prevCountRef.current === 0 || messages[messages.length - 1]?.sender_id === user.id) {
        scrollToBottom()
      }
    }
    prevCountRef.current = messages.length
  }, [messages.length, user.id])

  const getDecryptedContent = useCallback(
    async (msg: any): Promise<string> => {
      if (!msg.is_encrypted) return msg.content

      const cacheKey = msg.id
      if (decryptedMessagesRef.current.has(cacheKey)) {
        return decryptedMessagesRef.current.get(cacheKey) || msg.content
      }

      try {
        const decrypted = await decryptMessage(msg.content, conversationId)
        decryptedMessagesRef.current.set(cacheKey, decrypted)
        return decrypted
      } catch (err) {
        return msg.content
      }
    },
    [conversationId],
  )

  // Load conversation details & messages via Server Store (prevents Supabase 404 errors)
  useEffect(() => {
    let isSubscribed = true

    const loadData = async () => {
      // 1. Get conversation info
      const convs = await apiGetConversations(user.id)
      const conv = convs.find((c) => c.id === conversationId)

      if (conv && isSubscribed) {
        const extracted = extractOtherUserFromConv(conv, user.id)
        if (extracted) {
          setOtherUser((prev: any) => {
            if (!prev) return extracted
            // Lock display_name and avatar_url once established so they never flip-flop
            const prevHasValidName =
              prev.display_name &&
              !prev.display_name.startsWith("User ") &&
              prev.display_name !== "Contact"
            const nameToKeep = prevHasValidName
              ? prev.display_name
              : extracted.display_name || prev.display_name
            const avatarToKeep = cleanAvatarUrl(prev.avatar_url || extracted.avatar_url || "")

            return {
              ...extracted,
              ...prev,
              display_name: nameToKeep,
              avatar_url: avatarToKeep,
              status: extracted.status || prev.status,
            }
          })
        }
      }

      // 2. Get messages for this conversation (filtering out messages deleted for me)
      const msgList = await apiGetMessages(conversationId, user.id)
      if (isSubscribed) {
        setMessages(sortAndDedupeMessages(msgList))
        setLoading(false)
      }
    }

    loadData()

    // 3. Connect to Real-time Event Stream
    const disconnectStream = connectChatStream(user.id, (event) => {
      if (!isSubscribed) return

      switch (event.type) {
        case "message_inserted": {
          const newMsg = event.payload
          if (newMsg && newMsg.conversation_id === conversationId) {
            setMessages((prev) => {
              // If already present with this exact ID, update in place
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m))
              }
              // If from current user, match against pending optimistic message
              const optimisticIdx = prev.findIndex(
                (m) =>
                  m.sender_id === newMsg.sender_id &&
                  (m.id.startsWith("msg-") || m.id.startsWith("temp-")) &&
                  m.content === newMsg.content &&
                  m.message_type === newMsg.message_type
              )
              if (optimisticIdx !== -1) {
                const updated = [...prev]
                updated[optimisticIdx] = newMsg
                return sortAndDedupeMessages(updated)
              }
              return sortAndDedupeMessages([...prev, newMsg])
            })
          }
          break
        }

        case "message_deleted": {
          const { conversationId: cId, messageId } = event.payload || {}
          if (cId === conversationId && messageId) {
            setMessages((prev) => prev.filter((m) => m.id !== messageId))
            decryptedMessagesRef.current.delete(messageId)
          }
          break
        }

        case "message_updated": {
          const updatedMsg = event.payload
          if (updatedMsg && updatedMsg.conversation_id === conversationId) {
            if (updatedMsg.is_deleted_for_everyone) {
              decryptedMessagesRef.current.delete(updatedMsg.id)
            }
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
            )
          }
          break
        }

        case "user_updated": {
          const updated = event.payload
          if (updated && otherUser && updated.id === otherUser.id) {
            setOtherUser((prev: any) => ({
              ...prev,
              ...updated,
              display_name: updated.display_name || prev?.display_name,
              avatar_url: cleanAvatarUrl(updated.avatar_url || prev?.avatar_url || ""),
            }))
          }
          break
        }

        case "heartbeat_poll": {
          // Quiet background sync to ensure zero missed messages without re-rendering when unchanged
          apiGetMessages(conversationId, user.id).then((latest) => {
            if (!isSubscribed) return
            setMessages((prev) => {
              const pendingOptimistic = prev.filter(
                (m) => (m.id.startsWith("msg-") || m.id.startsWith("temp-")) && !latest.some((l) => l.id === m.id)
              )
              const combined = sortAndDedupeMessages([...latest, ...pendingOptimistic])

              if (combined.length === prev.length) {
                const isIdentical = prev.every((p, idx) => {
                  const c = combined[idx]
                  return (
                    p.id === c.id &&
                    p.content === c.content &&
                    p.is_deleted_for_everyone === c.is_deleted_for_everyone &&
                    p.is_starred === c.is_starred &&
                    JSON.stringify(p.reactions) === JSON.stringify(c.reactions)
                  )
                })
                if (isIdentical) return prev
              }
              return combined
            })
          })
          break
        }

        default:
          break
      }
    })

    return () => {
      isSubscribed = false
      disconnectStream()
    }
  }, [conversationId, user.id])

  // SEND TEXT MESSAGE
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const messageText = newMessage.trim()
    setNewMessage("")

    try {
      let encryptedContent = messageText
      let isEncrypted = false

      try {
        encryptedContent = await encryptMessage(messageText, conversationId)
        isEncrypted = true
      } catch (e) {
        encryptedContent = messageText
        isEncrypted = false
      }

      // Optimistic message with unique ID passed through to server
      const tempId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const nowIso = new Date().toISOString()
      const optimisticMsg: any = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: encryptedContent,
        message_type: "text",
        is_encrypted: isEncrypted,
        reply_to: replyingTo || undefined,
        created_at: nowIso,
      }

      decryptedMessagesRef.current.set(tempId, messageText)
      setMessages((prev) => sortAndDedupeMessages([...prev, optimisticMsg]))
      const currentReply = replyingTo
      setReplyingTo(null)

      // Persist to server store and broadcast via SSE
      const saved = await apiSendMessage({
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: encryptedContent,
        message_type: "text",
        is_encrypted: isEncrypted,
        reply_to: currentReply || undefined,
        created_at: nowIso,
      })

      if (saved && saved.id) {
        decryptedMessagesRef.current.set(saved.id, messageText)
        setMessages((prev) => {
          const hasSaved = prev.some((m) => m.id === saved.id && m.id !== tempId)
          if (hasSaved) {
            return prev.filter((m) => m.id !== tempId)
          }
          return prev.map((m) => (m.id === tempId ? saved : m))
        })
      }
    } catch (err) {
      console.error("Error sending message:", err)
    }
  }

  // SEND ATTACHMENT (Photo, Video, Document, Audio - NO FILE SIZE LIMIT)
  const sendAttachment = async (attachment: {
    media_url: string
    message_type: "photo" | "video" | "document" | "audio"
    file_name?: string
    file_size?: number
    content: string
  }) => {
    setShowAttachMenu(false)

    const tempId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const currentReply = replyingTo
    setReplyingTo(null)

    const nowIso = new Date().toISOString()
    const optimisticMsg: any = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: attachment.content,
      message_type: attachment.message_type,
      media_url: attachment.media_url,
      file_name: attachment.file_name,
      file_size: attachment.file_size,
      is_encrypted: false,
      reply_to: currentReply || undefined,
      created_at: nowIso,
    }

    setMessages((prev) => sortAndDedupeMessages([...prev, optimisticMsg]))

    try {
      const saved = await apiSendMessage({
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: attachment.content,
        message_type: attachment.message_type,
        media_url: attachment.media_url,
        file_name: attachment.file_name,
        file_size: attachment.file_size,
        is_encrypted: false,
        reply_to: currentReply || undefined,
        created_at: nowIso,
      })

      if (saved && saved.id) {
        setMessages((prev) => {
          const hasSaved = prev.some((m) => m.id === saved.id && m.id !== tempId)
          if (hasSaved) {
            return prev.filter((m) => m.id !== tempId)
          }
          return prev.map((m) => (m.id === tempId ? saved : m))
        })
      }
    } catch (e) {
      console.error("Error sending attachment:", e)
    }
  }

  // MESSAGE REACTIONS
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m
          const reactions = { ...(m.reactions || {}) }
          const currentUsers = reactions[emoji] || []
          const idx = currentUsers.indexOf(user.id)
          if (idx > -1) {
            reactions[emoji] = currentUsers.filter((id: string) => id !== user.id)
            if (reactions[emoji].length === 0) delete reactions[emoji]
          } else {
            reactions[emoji] = [...currentUsers, user.id]
          }
          return { ...m, reactions }
        })
      )

      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "react",
          messageId,
          emoji,
          userId: user.id,
        }),
      })
    } catch (e) {}
  }

  // MESSAGE STARRING
  const handleStar = async (messageId: string, isStarred: boolean) => {
    try {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const currentStarredBy = Array.isArray(m.starred_by)
              ? [...m.starred_by]
              : m.is_starred
              ? [user.id]
              : []
            const newStarredBy = isStarred
              ? Array.from(new Set([...currentStarredBy, user.id]))
              : currentStarredBy.filter((id: string) => id !== user.id)
            return { ...m, is_starred: isStarred, starred_by: newStarredBy }
          }
          return m
        })
      )

      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "star",
          messageId,
          isStarred,
          userId: user.id,
        }),
      })
    } catch (e) {
      console.warn("Error updating star status:", e)
    }
  }

  // Handle Photo or Video Selection (No file size limit)
  const handlePhotoOrVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith("video/")
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      sendAttachment({
        media_url: dataUrl,
        message_type: isVideo ? "video" : "photo",
        file_name: file.name,
        file_size: file.size,
        content: isVideo ? "Shared a video" : "Shared a photo",
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Handle Document Selection (PDF, Word, TXT, Excel, ZIP, etc. - No file size limit)
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      sendAttachment({
        media_url: dataUrl,
        message_type: "document",
        file_name: file.name,
        file_size: file.size,
        content: file.name,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // VOICE NOTE RECORDING (WhatsApp style with live waveform/timer)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      alert("Microphone permission required to record voice notes.")
    }
  }

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        sendAttachment({
          media_url: dataUrl,
          message_type: "audio",
          content: "Voice note",
          file_size: audioBlob.size,
        })
      }
      reader.readAsDataURL(audioBlob)

      // Stop mic tracks
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      mediaRecorderRef.current = null
      audioChunksRef.current = []
      setIsRecording(false)
      setRecordingSeconds(0)
    }

    mediaRecorderRef.current.stop()
  }

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  const formatRecordTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const handleDeleteMessage = useCallback((msg: any) => {
    setMessageToDelete(msg)
  }, [])

  const confirmDelete = async (mode: "for_everyone" | "for_me") => {
    if (!messageToDelete) return
    const targetMsg = messageToDelete
    const targetId = targetMsg.id
    setMessageToDelete(null)

    if (mode === "for_everyone") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId
            ? {
                ...m,
                is_deleted_for_everyone: true,
                content: "This message was deleted",
                media_url: undefined,
                file_name: undefined,
                file_size: undefined,
                reactions: {},
                is_starred: false,
              }
            : m
        )
      )
      decryptedMessagesRef.current.delete(targetId)
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== targetId))
      decryptedMessagesRef.current.delete(targetId)
    }

    try {
      await apiDeleteMessage(targetId, mode, user.id)
    } catch (e) {
      console.error("Failed to delete message:", e)
    }
  }

  // CALL HANDLERS
  const handleCall = (type: "voice" | "video") => {
    if (!otherUser?.id) return
    if (onStartCall) {
      onStartCall(type, otherUser)
    }
  }

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const getCachedDecrypted = useCallback((msg: any) => {
    if (!msg.is_encrypted) return msg.content
    return decryptedMessagesRef.current.get(msg.id)
  }, [])

  // Filter messages when search is active, and ensure strictly unique keys and order
  const displayedMessages = useMemo(() => {
    const list = searchInChat.trim()
      ? messages.filter((m) => m.content?.toLowerCase().includes(searchInChat.toLowerCase()))
      : messages

    return sortAndDedupeMessages(list)
  }, [messages, searchInChat])

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden">
      {/* WhatsApp Wallpaper Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#128C7E 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* WhatsApp Header */}
      <div className="border-b border-border/60 p-2.5 md:px-4 md:py-2.5 flex items-center justify-between bg-white dark:bg-[#202c33] shadow-xs z-10">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onBack}
              className="md:hidden p-1.5 h-9 w-9 rounded-full shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          <div
            onClick={() => {
              if (otherUser?.is_group) {
                setShowGroupInfo(!showGroupInfo)
                setShowContactInfo(false)
              } else {
                setShowContactInfo(!showContactInfo)
                setShowGroupInfo(false)
              }
            }}
            className="flex items-center gap-2.5 md:gap-3 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            title={otherUser?.is_group ? "Click to view group info" : "Click to view contact info"}
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-base shadow-xs">
                {otherUser?.avatar_url || otherUser?.group_avatar || otherUser?.id ? (
                  <img
                    src={cleanAvatarUrl(otherUser.avatar_url || otherUser.group_avatar || `/api/chat/avatar?userId=${otherUser.id}`)}
                    alt={otherUser.display_name || "Group"}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                ) : otherUser?.is_group ? (
                  <Users className="w-5 h-5 text-white" />
                ) : (
                  otherUser?.display_name?.[0]?.toUpperCase() || otherUser?.email?.[0]?.toUpperCase() || "?"
                )}
              </div>
              {!otherUser?.is_group && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#202c33]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm md:text-base truncate leading-tight">
                {otherUser?.display_name && !otherUser.display_name.startsWith("User ")
                  ? otherUser.display_name
                  : otherUser?.email?.split("@")[0] || "Chat"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate font-normal">
                {otherUser?.is_group
                  ? formatGroupMemberList(otherUser)
                  : (otherUser?.status || "online")}
              </p>
            </div>
          </div>
        </div>

      {/* WhatsApp Call & Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-9 w-9 p-0 rounded-full cursor-pointer"
            onClick={() => handleCall("voice")}
            title="Voice Call"
          >
            <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-9 w-9 p-0 rounded-full cursor-pointer"
            onClick={() => handleCall("video")}
            title="Video Call"
          >
            <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-9 w-9 p-0 rounded-full cursor-pointer"
            onClick={() => setShowSearch(!showSearch)}
            title="Search in chat"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* WhatsApp Chat Options (3-dots) Menu */}
          <div className="relative" ref={chatMenuRef}>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-9 w-9 p-0 rounded-full cursor-pointer"
              onClick={() => setShowChatMenu(!showChatMenu)}
              title="Chat options"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showChatMenu && (
              <div
                className="absolute right-0 top-10 w-52 bg-card text-card-foreground border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95 select-none"
                onClick={() => setShowChatMenu(false)}
              >
                <button
                  onClick={() => {
                    if (otherUser?.is_group) {
                      setShowGroupInfo(true)
                      setShowContactInfo(false)
                    } else {
                      setShowContactInfo(true)
                      setShowGroupInfo(false)
                    }
                    setShowStarredDrawer(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-muted/80 text-left cursor-pointer transition-colors"
                >
                  <span>{otherUser?.is_group ? "Group info" : "Contact info"}</span>
                </button>
                <button
                  onClick={() => {
                    setShowStarredDrawer(true)
                    setShowContactInfo(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-muted/80 text-left cursor-pointer transition-colors text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Starred messages</span>
                </button>
                <button
                  onClick={() => setShowSearch(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-muted/80 text-left cursor-pointer transition-colors"
                >
                  <span>Search messages</span>
                </button>
                <div className="border-t border-border/50 my-1" />
                <button
                  onClick={async () => {
                    if (window.confirm("Clear all messages in this chat?")) {
                      for (const m of messages) {
                        await apiDeleteMessage(m.id)
                      }
                      setMessages([])
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-destructive hover:bg-destructive/10 text-left cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear chat</span>
                </button>
                {onBack && (
                  <button
                    onClick={onBack}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-muted/80 text-left cursor-pointer transition-colors border-t border-border/50"
                  >
                    <span>Close chat</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="bg-card border-b border-border p-2.5 flex items-center gap-2 z-10 animate-in slide-in-from-top-2">
          <Search className="w-4 h-4 text-muted-foreground ml-2" />
          <Input
            placeholder="Search messages in this chat..."
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 shadow-none"
            autoFocus
          />
          {searchInChat && (
            <button onClick={() => setSearchInChat("")} className="text-xs text-muted-foreground hover:text-foreground mr-2">
              Clear
            </button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setShowSearch(false)}>
            Close
          </Button>
        </div>
      )}


      {/* Chat Area & Contact Info Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 relative z-0">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground pt-8 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading messages...
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-12 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-600/10 text-emerald-600 mx-auto flex items-center justify-center text-xl">
              💬
            </div>
            <p className="text-sm font-semibold text-foreground">
              {searchInChat ? "No messages matching search" : "No messages yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchInChat ? "Try searching for something else" : "Messages are end-to-end encrypted. Send a message to start chatting!"}
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender_id === user.id}
              currentUserId={user.id}
              isGroup={Boolean(otherUser?.is_group)}
              senderName={getSenderDisplayName(msg.sender_id)}
              onGetDecrypted={getDecryptedContent}
              getCachedDecrypted={getCachedDecrypted}
              onDelete={handleDeleteMessage}
              onReply={setReplyingTo}
              onReact={handleReact}
              onStar={handleStar}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hidden File Inputs (Unlimited Size) */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handlePhotoOrVideoSelect} className="hidden" />
      <input ref={docInputRef} type="file" accept="*/*" onChange={handleDocumentSelect} className="hidden" />

      {/* WhatsApp Quoted Reply Preview Bar */}
      {replyingTo && (
        <div className="bg-[#f0f2f5] dark:bg-[#1f2c34] px-4 py-2 border-t border-border/60 flex items-center justify-between animate-in slide-in-from-bottom-2 z-10">
          <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-2.5 min-w-0">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Replying to {replyingTo.sender_name}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-md">{replyingTo.content}</p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="w-6 h-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp Input Bar */}
      <div className="p-2 md:px-4 md:py-3 bg-white dark:bg-[#202c33] border-t border-border/50 z-10">
        {isRecording ? (
          /* Voice Recording Mode */
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-card rounded-2xl border border-red-500/30">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-semibold text-red-500">Recording audio...</span>
              <span className="text-xs font-mono text-muted-foreground">{formatRecordTime(recordingSeconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelRecording}
                className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={stopAndSendRecording}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 rounded-xl text-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Send Voice
              </Button>
            </div>
          </div>
        ) : (
          /* Normal Message Input Mode */
          <div className="flex gap-1.5 md:gap-2 items-center relative">
            {/* Attachment Menu Button */}
            <div className="relative shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-emerald-600 hover:bg-muted/50 h-9 w-9 p-0 rounded-full cursor-pointer"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                title="Attach"
              >
                <Paperclip className="w-5 h-5" />
              </Button>

              {/* WhatsApp Attachment Menu Popup */}
              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowAttachMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-[#233138] border border-border/60 rounded-2xl shadow-xl p-3 z-40 w-52 space-y-1.5 animate-in slide-in-from-bottom-2">
                    <button
                      onClick={() => {
                        setShowAttachMenu(false)
                        docInputRef.current?.click()
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-muted/50 flex items-center gap-3 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Document</p>
                        <p className="text-[10px] text-muted-foreground">PDF, Word, any file</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowAttachMenu(false)
                        fileInputRef.current?.click()
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-muted/50 flex items-center gap-3 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Photos & Videos</p>
                        <p className="text-[10px] text-muted-foreground">Unlimited size</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Emoji Button */}
            <div className="relative shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-emerald-600 hover:bg-muted/50 h-9 w-9 p-0 rounded-full cursor-pointer"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </Button>

              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowEmojiPicker(false)} />
                  <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-[#233138] border border-border/60 rounded-2xl shadow-2xl p-3 z-40 w-64 animate-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => addEmoji(emoji)}
                          className="text-xl hover:bg-muted/60 p-2 rounded-xl transition-colors cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Message Input Box */}
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              className="flex-1 bg-[#f0f2f5] dark:bg-[#2a3942] border-0 text-foreground placeholder:text-muted-foreground text-sm h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-500/50"
            />

            {/* Send / Mic Button (WhatsApp style: shows Mic when input is empty, Send when typing) */}
            {newMessage.trim() ? (
              <Button
                onClick={handleSendMessage}
                className="bg-[#25D366] hover:bg-[#1fb855] text-white h-10 w-10 p-0 shrink-0 rounded-full shadow-md cursor-pointer transition-transform active:scale-95"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                className="bg-[#25D366] hover:bg-[#1fb855] text-white h-10 w-10 p-0 shrink-0 rounded-full shadow-md cursor-pointer transition-transform active:scale-95"
                title="Record voice note"
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>

    {/* WhatsApp Contact Info Drawer */}
    {showContactInfo && (
      <ContactInfoDrawer
        contact={
          otherUser || {
            id: "unknown",
            display_name: "Contact",
            email: "",
            status: "Hey there! I am using Arixo.",
          }
        }
        messages={messages}
        onClose={() => setShowContactInfo(false)}
        onVoiceCall={() => handleCall("voice")}
        onVideoCall={() => handleCall("video")}
        onSearchInChat={() => setShowSearch(true)}
        onOpenStarredMessages={() => {
          setShowContactInfo(false)
          setShowStarredDrawer(true)
        }}
        onClearChat={async () => {
          for (const m of messages) {
            await apiDeleteMessage(m.id, "for_me", user.id)
          }
          setMessages([])
        }}
      />
    )}

    {/* WhatsApp Group Info Drawer */}
    {showGroupInfo && otherUser?.is_group && (
      <GroupInfoDrawer
        user={user}
        group={otherUser}
        messages={messages}
        onClose={() => setShowGroupInfo(false)}
        onOpenStarredMessages={() => {
          setShowGroupInfo(false)
          setShowStarredDrawer(true)
        }}
        onGroupUpdated={(updated) => {
          setOtherUser((prev: any) => ({
            ...prev,
            ...updated,
            display_name: updated.group_name || prev.display_name,
            group_name: updated.group_name || prev.group_name,
            group_members: updated.group_members || prev.group_members,
            members: updated.members || prev.members,
            status: `${(updated.group_members || prev.group_members || []).length} members`,
          }))
        }}
        onLeaveGroup={() => {
          setShowGroupInfo(false)
          onBack?.()
        }}
      />
    )}

    {/* WhatsApp In-Chat Starred Messages Drawer */}
    {showStarredDrawer && (
      <StarredMessagesDrawer
        user={user}
        conversationId={conversationId}
        conversationTitle={otherUser?.display_name || otherUser?.email?.split("@")[0] || "Chat"}
        onClose={() => setShowStarredDrawer(false)}
        onSelectConversation={() => setShowStarredDrawer(false)}
      />
    )}

    {/* WhatsApp Style Delete Confirmation Modal */}
    {messageToDelete && (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-50"
        onClick={() => setMessageToDelete(null)}
      >
        <div
          className="bg-card text-card-foreground border border-border/80 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-foreground">
              Delete message?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {messageToDelete.sender_id === user.id && !messageToDelete.is_deleted_for_everyone
                ? "You can delete this message for everyone or just for yourself."
                : "Delete this message for yourself? It will remain visible to others in the chat."}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {/* Delete for everyone (available for own messages that aren't already deleted for everyone) */}
            {messageToDelete.sender_id === user.id && !messageToDelete.is_deleted_for_everyone && (
              <Button
                variant="destructive"
                onClick={() => confirmDelete("for_everyone")}
                className="w-full justify-center text-xs font-semibold py-2.5 rounded-xl cursor-pointer"
              >
                Delete for everyone
              </Button>
            )}

            {/* Delete for me (always available for any message) */}
            <Button
              variant="outline"
              onClick={() => confirmDelete("for_me")}
              className="w-full justify-center text-xs font-medium py-2.5 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
            >
              Delete for me
            </Button>

            {/* Cancel */}
            <Button
              variant="ghost"
              onClick={() => setMessageToDelete(null)}
              className="w-full justify-center text-xs text-muted-foreground py-2 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
  )
}
