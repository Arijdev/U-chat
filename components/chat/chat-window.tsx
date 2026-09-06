"use client"

import type React from "react"
import type { User } from "@supabase/supabase-js"
import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  Phone,
  PhoneOff,
  Video,
  Share2,
  ImageIcon,
  Smile,
  MoreVertical,
  X,
  Loader2,
  Paperclip,
  FileText,
  Mic,
  Trash2,
  Search,
  Check,
  CheckCheck,
} from "lucide-react"
import { encryptMessage, decryptMessage } from "@/lib/encryption"
import { VideoCallInterface } from "./video-call-interface"
import { MessageBubble } from "./message-bubble"
import { createSignaling } from "@/lib/signaling"
import {
  getLocalConversations,
  getLocalMessages,
  saveLocalMessage,
  deleteLocalMessage,
  getProfileById,
  getKnownProfiles,
  listenToSyncEvents,
} from "@/lib/dataset"

interface ChatWindowProps {
  conversationId: string
  user: User
}

export default function ChatWindow({ conversationId, user }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [searchInChat, setSearchInChat] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Calling state
  const [showCallModal, setShowCallModal] = useState(false)
  const [callType, setCallType] = useState<"voice" | "video">("voice")
  const [callStatus, setCallStatus] = useState<"ringing" | "connected" | "ended">("ringing")
  const [callDuration, setCallDuration] = useState(0)
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string
    callerName: string
    callType: "voice" | "video"
  } | null>(null)
  const [activeCall, setActiveCall] = useState<{
    type: "voice" | "video"
    startTime: number
  } | null>(null)
  const [isCaller, setIsCaller] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const callUnsubscribeRef = useRef<(() => void) | null>(null)
  const decryptedMessagesRef = useRef<Map<string, string>>(new Map())
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const signalingRef = useRef<any>(null)

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

  useEffect(() => {
    const loadConversationAndMessages = async () => {
      const supabase = createClient()

      let convData: any = null
      try {
        const { data: conversation } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .single()

        if (conversation) {
          convData = conversation
        }
      } catch (e) {}

      if (!convData) {
        const localConvs = getLocalConversations(user.id)
        convData = localConvs.find((c) => c.id === conversationId)
      }

      if (convData) {
        const otherUserId =
          convData.participant_1_id === user.id ? convData.participant_2_id : convData.participant_1_id

        let profile = convData.participant_1_id === user.id ? convData.participant_2 : convData.participant_1

        if (!profile) {
          try {
            const { data: otherUserProfile } = await supabase.from("profiles").select("*").eq("id", otherUserId).single()
            if (otherUserProfile) profile = otherUserProfile
          } catch (e) {}
        }

        if (!profile) {
          profile = getProfileById(otherUserId) || getKnownProfiles().find((p) => p.id === otherUserId) || {
            id: otherUserId,
            display_name: "Contact",
            email: "user@example.com",
          }
        }

        setOtherUser(profile)
      }

      let remoteMessages: any[] = []
      try {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(100)

        if (data) {
          remoteMessages = (data || []).reverse()
        }
      } catch (e) {}

      const localMessages = getLocalMessages(conversationId)

      const msgMap = new Map<string, any>()
      localMessages.forEach((m) => msgMap.set(m.id, m))
      remoteMessages.forEach((m) => msgMap.set(m.id, m))

      const allMessages = Array.from(msgMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      setMessages(allMessages)
      setHasMoreMessages(remoteMessages.length >= 100)
      setLoading(false)

      // Supabase Realtime for instant messaging
      const channelName = `messages:${conversationId}:${Date.now()}`
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
            decryptedMessagesRef.current.delete(payload.old.id)
          },
        )
        .subscribe()

      // Cross-tab realtime synchronization
      const stopLocalSync = listenToSyncEvents((type, payload) => {
        if (type === "message_inserted" && payload?.conversationId === conversationId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.message.id)) return prev
            return [...prev, payload.message]
          })
        } else if (type === "message_deleted" && payload?.conversationId === conversationId) {
          setMessages((prev) => prev.filter((m) => m.id !== payload.messageId))
          decryptedMessagesRef.current.delete(payload.messageId)
        }
      })

      unsubscribeRef.current = () => {
        try {
          supabase.removeChannel(channel)
        } catch (e) {}
        stopLocalSync()
      }
    }

    loadConversationAndMessages()

    return () => {
      unsubscribeRef.current?.()
    }
  }, [conversationId, user.id])

  // Call notifications listener
  useEffect(() => {
    const supabase = createClient()
    const channelName = `calls:${user.id}:${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_history",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status === "ringing") {
            supabase
              .from("profiles")
              .select("display_name")
              .eq("id", payload.new.caller_id)
              .single()
              .then(({ data }) => {
                setIncomingCall({
                  callerId: payload.new.caller_id,
                  callerName: data?.display_name || "Unknown",
                  callType: payload.new.call_type,
                })
              })
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_history",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status === "active") {
            setActiveCall({
              type: payload.new.call_type,
              startTime: Date.now(),
            })
            setIncomingCall(null)
          }
        },
      )
      .subscribe()

    callUnsubscribeRef.current = () => {
      try {
        supabase.removeChannel(channel)
      } catch (e) {}
    }

    return () => {
      callUnsubscribeRef.current?.()
    }
  }, [user.id])

  // WebRTC Signaling connection
  useEffect(() => {
    if (!user?.id) return

    const signaling = createSignaling(user.id)

    const remove = signaling.addListener((msg: any) => {
      try {
        switch (msg.type) {
          case "call":
            if (msg.to === user.id) {
              setIncomingCall({
                callerId: msg.from,
                callerName: msg.fromName || "Unknown",
                callType: msg.callType || "voice",
              })
            }
            break
          case "call-accepted":
            if (msg.to === user.id) {
              setActiveCall({ type: msg.callType || "voice", startTime: Date.now() })
              setIncomingCall(null)
            }
            break
          case "call-rejected":
          case "call-ended":
            if (msg.to === user.id) {
              setActiveCall(null)
              setIncomingCall(null)
              setShowCallModal(false)
            }
            break
          default:
            break
        }
      } catch (err) {}
    })

    signalingRef.current = signaling

    return () => {
      try {
        remove()
        signaling.close()
      } catch (err) {}
      signalingRef.current = null
    }
  }, [user.id])

  // SEND TEXT MESSAGE
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const messageText = newMessage.trim()
    setNewMessage("")
    const supabase = createClient()

    try {
      const encryptedContent = await encryptMessage(messageText, conversationId)

      const messageObj = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        conversation_id: conversationId,
        sender_id: user.id,
        content: encryptedContent,
        message_type: "text",
        is_encrypted: true,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, messageObj])
      decryptedMessagesRef.current.set(messageObj.id, messageText)
      saveLocalMessage(conversationId, messageObj)

      // Store in Supabase
      try {
        const { data } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: encryptedContent,
            message_type: "text",
            is_encrypted: true,
          })
          .select()

        if (data && data[0]) {
          setMessages((prev) => prev.map((m) => (m.id === messageObj.id ? data[0] : m)))
          decryptedMessagesRef.current.delete(messageObj.id)
          decryptedMessagesRef.current.set(data[0].id, messageText)
          saveLocalMessage(conversationId, data[0])
        }

        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId)
      } catch (e) {}
    } catch (err) {}
  }

  // SEND ATTACHMENT (Photo, Video, Document - NO FILE SIZE LIMIT)
  const sendAttachment = async (attachment: {
    media_url: string
    message_type: "photo" | "video" | "document" | "audio"
    file_name?: string
    file_size?: number
    content: string
  }) => {
    setShowAttachMenu(false)
    const supabase = createClient()

    const msgObj = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content: attachment.content,
      message_type: attachment.message_type,
      media_url: attachment.media_url,
      file_name: attachment.file_name,
      file_size: attachment.file_size,
      is_encrypted: false,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, msgObj])
    saveLocalMessage(conversationId, msgObj)

    try {
      const { data } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: attachment.content,
          message_type: attachment.message_type,
          media_url: attachment.media_url,
          is_encrypted: false,
        })
        .select()

      if (data && data[0]) {
        const enriched = { ...data[0], file_name: attachment.file_name, file_size: attachment.file_size }
        setMessages((prev) => prev.map((m) => (m.id === msgObj.id ? enriched : m)))
        saveLocalMessage(conversationId, enriched)
      }

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId)
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

  // VOICE NOTE RECORDING (WhatsApp style)
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
      alert("Microphone permission required to record voice messages.")
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

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    decryptedMessagesRef.current.delete(messageId)
    deleteLocalMessage(conversationId, messageId)

    const supabase = createClient()
    try {
      await supabase.from("messages").delete().eq("id", messageId)
    } catch (err) {}
  }, [conversationId])

  // CALL HANDLERS
  const handleCall = async (type: "voice" | "video") => {
    try {
      const constraints = type === "video" ? { audio: true, video: true } : { audio: true, video: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      alert("Microphone and camera permission are required to start a call.")
      return
    }

    const supabase = createClient()
    try {
      await supabase.from("call_history").insert({
        caller_id: user.id,
        receiver_id: otherUser.id,
        call_type: type,
        status: "ringing",
      })

      setShowCallModal(true)
      setCallType(type)
      setCallDuration(0)
      setIsCaller(true)

      if (callTimerRef.current) clearInterval(callTimerRef.current)
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)

      signalingRef.current?.send({
        type: "call",
        from: user.id,
        to: otherUser.id,
        callType: type,
        conversationId,
        fromName: (user as any)?.email || user.id,
      })
    } catch (err) {}
  }

  const handleCallEnd = async (duration: number) => {
    const supabase = createClient()
    try {
      const { data: calls } = await supabase
        .from("call_history")
        .select("id")
        .or(
          `and(caller_id.eq.${user.id},receiver_id.eq.${otherUser?.id}),and(caller_id.eq.${otherUser?.id},receiver_id.eq.${user.id})`
        )
        .in("status", ["ringing", "active"])
        .order("created_at", { ascending: false })
        .limit(1)

      if (calls && calls[0]) {
        await supabase
          .from("call_history")
          .update({ status: "completed", duration_seconds: duration })
          .eq("id", calls[0].id)
      }

      setActiveCall(null)
      setIsCaller(false)
      signalingRef.current?.send({ type: "call-ended", from: user.id, to: otherUser?.id, conversationId })
    } catch (err) {}
  }

  const handleAcceptCall = async () => {
    try {
      const constraints = incomingCall?.callType === "video" ? { audio: true, video: true } : { audio: true, video: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      alert("Microphone and camera permission are required to accept a call.")
      return
    }

    const supabase = createClient()
    try {
      const { data: calls } = await supabase
        .from("call_history")
        .select("id")
        .or(
          `and(caller_id.eq.${incomingCall?.callerId},receiver_id.eq.${user.id}),and(caller_id.eq.${user.id},receiver_id.eq.${incomingCall?.callerId})`
        )
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1)

      if (calls && calls[0]) {
        await supabase.from("call_history").update({ status: "active" }).eq("id", calls[0].id)
      }

      setActiveCall({ type: incomingCall?.callType || "voice", startTime: Date.now() })
      setIncomingCall(null)
      setIsCaller(false)
      signalingRef.current?.send({ type: "call-accepted", from: user.id, to: incomingCall?.callerId, conversationId })
    } catch (err) {}
  }

  const handleRejectCall = async () => {
    const supabase = createClient()
    try {
      const { data: calls } = await supabase
        .from("call_history")
        .select("id")
        .or(
          `and(caller_id.eq.${incomingCall?.callerId},receiver_id.eq.${user.id}),and(caller_id.eq.${user.id},receiver_id.eq.${incomingCall?.callerId})`
        )
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1)

      if (calls && calls[0]) {
        await supabase.from("call_history").update({ status: "rejected" }).eq("id", calls[0].id)
      }

      setIncomingCall(null)
      setIsCaller(false)
      signalingRef.current?.send({ type: "call-rejected", from: user.id, to: incomingCall?.callerId, conversationId })
    } catch (err) {}
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
      <div className="border-b border-border/60 p-3 md:px-4 md:py-2.5 flex items-center justify-between bg-white dark:bg-[#202c33] shadow-xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-xs">
              {otherUser?.display_name?.[0]?.toUpperCase() || otherUser?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#202c33]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm md:text-base truncate leading-tight">
              {otherUser?.display_name || otherUser?.email?.split("@")[0] || "Chat"}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate font-medium">online</p>
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

      {/* Incoming Call Notification (WhatsApp style) */}
      {incomingCall && (
        <div className="fixed top-4 right-4 z-50 pointer-events-auto animate-in slide-in-from-top-3">
          <div className="w-80 bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-500/40 overflow-hidden text-card-foreground">
            <div className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-lg shrink-0 shadow-sm animate-pulse">
                {incomingCall.callerName?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{incomingCall.callerName}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                  Incoming WhatsApp {incomingCall.callType} call...
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handleAcceptCall}
                  className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white p-0 flex items-center justify-center shadow-md cursor-pointer"
                  title="Answer"
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleRejectCall}
                  className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white p-0 flex items-center justify-center shadow-md cursor-pointer"
                  title="Decline"
                >
                  <PhoneOff className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video / Audio Call Interface */}
      {activeCall && (
        <VideoCallInterface
          callType={activeCall.type}
          otherUserName={otherUser?.display_name || "User"}
          onCallEnd={handleCallEnd}
          onClose={() => {
            setActiveCall(null)
            setIsCaller(false)
            if (callTimerRef.current) clearInterval(callTimerRef.current)
          }}
          signaling={signalingRef.current}
          localUserId={user.id}
          otherUserId={otherUser?.id}
          conversationId={conversationId}
          isCaller={isCaller}
        />
      )}

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
              onGetDecrypted={getDecryptedContent}
              onDelete={handleDeleteMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hidden File Inputs (Unlimited Size) */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handlePhotoOrVideoSelect} className="hidden" />
      <input ref={docInputRef} type="file" accept="*/*" onChange={handleDocumentSelect} className="hidden" />

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
                className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={stopAndSendRecording}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 rounded-xl text-xs"
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
  )
}
