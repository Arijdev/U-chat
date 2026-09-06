"use client"

import type React from "react"
import type { User } from "@supabase/supabase-js"
import { useEffect, useRef, useState, useCallback } from "react"
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
} from "lucide-react"
import { encryptMessage, decryptMessage } from "@/lib/encryption"
import { MessageBubble } from "./message-bubble"
import { ContactInfoDrawer } from "./contact-info-drawer"
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
  onBack?: () => void
  onStartCall?: (type: "voice" | "video", otherUser: any) => void
}

export default function ChatWindow({ conversationId, user, onBack, onStartCall }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [searchInChat, setSearchInChat] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; sender_name: string } | null>(null)

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
  }, [messages, user.id])

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
        const otherId = conv.participant_1_id === user.id ? conv.participant_2_id : conv.participant_1_id
        const profile =
          conv.participant_1_id === user.id
            ? conv.participant_2
            : conv.participant_1

        if (profile) {
          setOtherUser(profile)
        } else {
          const fallback =
            getProfileById(otherId) ||
            getKnownProfiles().find((p) => p.id === otherId) || {
              id: otherId,
              display_name: otherId.slice(0, 8),
              email: `${otherId.slice(0, 8)}@uchat.com`,
            }
          setOtherUser(fallback)
        }
      }

      // 2. Get messages for this conversation
      const msgList = await apiGetMessages(conversationId)
      if (isSubscribed) {
        setMessages(msgList)
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
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
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

        case "user_updated": {
          const updated = event.payload
          if (updated && otherUser && updated.id === otherUser.id) {
            setOtherUser((prev: any) => ({ ...prev, ...updated }))
          }
          break
        }

        case "heartbeat_poll": {
          // Quiet background sync to ensure zero missed messages
          apiGetMessages(conversationId).then((latest) => {
            if (!isSubscribed) return
            setMessages((prev) => {
              if (latest.length !== prev.length || latest[latest.length - 1]?.id !== prev[prev.length - 1]?.id) {
                return latest
              }
              return prev
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
  }, [conversationId, user.id, otherUser?.display_name])

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

      // Optimistic message
      const tempId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const optimisticMsg: any = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: encryptedContent,
        message_type: "text",
        is_encrypted: isEncrypted,
        reply_to: replyingTo || undefined,
        created_at: new Date().toISOString(),
      }

      decryptedMessagesRef.current.set(tempId, messageText)
      setMessages((prev) => [...prev, optimisticMsg])
      const currentReply = replyingTo
      setReplyingTo(null)

      // Persist to server store and broadcast via SSE
      const saved = await apiSendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        content: encryptedContent,
        message_type: "text",
        is_encrypted: isEncrypted,
        reply_to: currentReply || undefined,
      })

      if (saved && saved.id) {
        decryptedMessagesRef.current.set(saved.id, messageText)
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)))
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
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const saved = await apiSendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        content: attachment.content,
        message_type: attachment.message_type,
        media_url: attachment.media_url,
        file_name: attachment.file_name,
        file_size: attachment.file_size,
        is_encrypted: false,
        reply_to: currentReply || undefined,
      })

      if (saved && saved.id) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)))
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
        prev.map((m) => (m.id === messageId ? { ...m, is_starred: isStarred } : m))
      )

      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "star",
          messageId,
          isStarred,
        }),
      })
    } catch (e) {}
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

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      decryptedMessagesRef.current.delete(messageId)
      await apiDeleteMessage(messageId)
    },
    [],
  )

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

  // Filter messages when search is active
  const displayedMessages = searchInChat.trim()
    ? messages.filter((m) => m.content?.toLowerCase().includes(searchInChat.toLowerCase()))
    : messages

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
            onClick={() => setShowContactInfo(!showContactInfo)}
            className="flex items-center gap-2.5 md:gap-3 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to view contact info"
          >
            <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-base shadow-xs">
              {otherUser?.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.display_name || "Contact"}
                  className="w-full h-full object-cover"
                />
              ) : (
                otherUser?.display_name?.[0]?.toUpperCase() || otherUser?.email?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#202c33]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm md:text-base truncate leading-tight">
              {otherUser?.display_name || otherUser?.email?.split("@")[0] || "Chat"}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate font-medium">
              {otherUser?.status || "online"}
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
              onGetDecrypted={getDecryptedContent}
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
            status: "Hey there! I am using WhatsApp.",
          }
        }
        messages={messages}
        onClose={() => setShowContactInfo(false)}
        onVoiceCall={() => handleCall("voice")}
        onVideoCall={() => handleCall("video")}
        onSearchInChat={() => setShowSearch(true)}
        onClearChat={async () => {
          for (const m of messages) {
            await apiDeleteMessage(m.id)
          }
          setMessages([])
        }}
      />
    )}
  </div>
</div>
  )
}
