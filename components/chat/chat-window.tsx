"use client"

import type React from "react"
import type { User } from "@supabase/supabase-js"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Phone, PhoneOff, Video, Share2, ImageIcon, Smile, MoreVertical, X } from "lucide-react"
import { encryptMessage, decryptMessage } from "@/lib/encryption"
import { VideoCallInterface } from "./video-call-interface"
import { MessageBubble } from "./message-bubble"
import { createSignaling } from "@/lib/signaling"

interface ChatWindowProps {
  conversationId: string
  user: User
}

export default function ChatWindow({ conversationId, user }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callType, setCallType] = useState<"voice" | "video" | null>(null)
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const callUnsubscribeRef = useRef<(() => void) | null>(null)
  const decryptedMessagesRef = useRef<Map<string, string>>(new Map())
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const signalingRef = useRef<any>(null)
  const [isCaller, setIsCaller] = useState(false)

  const emojis = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "😍", "🤔", "😢", "😡", "👏", "🙏", "💯", "✨", "🎊"]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getDecryptedContent = async (msg: any): Promise<string> => {
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
      console.log(" Decryption error:", err)
      return msg.content
    }
  }

  useEffect(() => {
    const loadConversationAndMessages = async () => {
      const supabase = createClient()

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single()

      if (convError) {
        console.log(" Error loading conversation:", convError)
      } else if (conversation) {
        const otherUserId =
          conversation.participant_1_id === user.id ? conversation.participant_2_id : conversation.participant_1_id

        const { data: otherUserProfile } = await supabase.from("profiles").select("*").eq("id", otherUserId).single()

        setOtherUser(otherUserProfile)
      }

      const { data, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (msgError) {
        console.log(" Error loading messages:", msgError)
      } else {
        console.log(" Loaded messages:", data?.length || 0)
        setMessages(data || [])
      }
      setLoading(false)

      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            console.log(" New message received:", payload.new)
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) {
                return prev
              }
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
            console.log(" Message deleted:", payload.old.id)
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
            decryptedMessagesRef.current.delete(payload.old.id)
          },
        )
        .subscribe((status) => {
          console.log(" Subscription status:", status)
        })

      unsubscribeRef.current = () => {
        channel.unsubscribe()
      }
    }

    loadConversationAndMessages()

    return () => {
      unsubscribeRef.current?.()
    }
  }, [conversationId, user.id])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`calls:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_history",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(" Incoming call detected:", payload.new)
          if (payload.new.status === "ringing") {
            supabase
              .from("profiles")
              .select("display_name")
              .eq("id", payload.new.caller_id)
              .single()
              .then(({ data }) => {
                console.log(" Setting incoming call from:", data?.display_name)
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
          console.log(" Call status updated:", payload.new.status)
          if (payload.new.status === "active") {
            setActiveCall({
              type: payload.new.call_type,
              startTime: Date.now(),
            })
            setIncomingCall(null)
          }
        },
      )
      .subscribe((status) => {
        console.log(" Call subscription status:", status)
      })

    callUnsubscribeRef.current = () => {
      channel.unsubscribe()
    }

    return () => {
      callUnsubscribeRef.current?.()
    }
  }, [user.id])

  // WebSocket signaling connection for faster realtime call signaling
  useEffect(() => {
    if (!user?.id) return

    const signaling = createSignaling(user.id)

    const remove = signaling.addListener((msg: any) => {
      // incoming signaling messages from the server
      try {
        switch (msg.type) {
          case 'call':
            // only handle if targeted to this user
            if (msg.to === user.id) {
              setIncomingCall({ callerId: msg.from, callerName: msg.fromName || 'User', callType: msg.callType })
            }
            break
          case 'call-accepted':
            if (msg.to === user.id) {
              setActiveCall({ type: msg.callType || 'voice', startTime: Date.now() })
              setIncomingCall(null)
            }
            break
          case 'call-rejected':
            if (msg.to === user.id) {
              setIncomingCall(null)
              setShowCallModal(false)
            }
            break
          case 'call-ended':
            if (msg.to === user.id) {
              setActiveCall(null)
              setShowCallModal(false)
            }
            break
          default:
            break
        }
      } catch (err) {
        console.warn(' Signaling handler error', err)
      }
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const supabase = createClient()

    try {
      const encryptedContent = await encryptMessage(newMessage, conversationId)

      console.log(" Sending encrypted message")

      const tempMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        content: encryptedContent,
        message_type: "text",
        is_encrypted: true,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempMessage])
      decryptedMessagesRef.current.set(tempMessage.id, newMessage)

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: encryptedContent,
          message_type: "text",
          is_encrypted: true,
        })
        .select()

      if (error) {
        console.log(" Error sending message:", error)
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id))
        alert("Error sending message: " + error.message)
      } else {
        if (data && data[0]) {
          setMessages((prev) => prev.map((m) => (m.id === tempMessage.id ? data[0] : m)))
          decryptedMessagesRef.current.delete(tempMessage.id)
          decryptedMessagesRef.current.set(data[0].id, newMessage)
        }
        setNewMessage("")
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
      }
    } catch (err) {
      console.log(" Error in handleSendMessage:", err)
      alert("Error sending message")
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string)
      setPhotoFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleSendPhoto = async () => {
    if (!photoPreview || !photoFile) return

    const supabase = createClient()

    try {
      const encryptedContent = await encryptMessage("Shared a photo", conversationId)

      const tempMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        content: encryptedContent,
        message_type: "photo",
        media_url: photoPreview,
        is_encrypted: true,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempMessage])
      decryptedMessagesRef.current.set(tempMessage.id, "Shared a photo")

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: encryptedContent,
          message_type: "photo",
          media_url: photoPreview,
          is_encrypted: true,
        })
        .select()

      if (error) {
        console.log(" Error uploading photo:", error)
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id))
        alert("Error uploading photo: " + error.message)
      } else {
        if (data && data[0]) {
          setMessages((prev) => prev.map((m) => (m.id === tempMessage.id ? data[0] : m)))
          decryptedMessagesRef.current.delete(tempMessage.id)
          decryptedMessagesRef.current.set(data[0].id, "Shared a photo")
        }
        setPhotoPreview(null)
        setPhotoFile(null)
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
      }
    } catch (err) {
      console.log(" Error in handleSendPhoto:", err)
      alert("Error uploading photo")
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    const supabase = createClient()

    try {
      const { error } = await supabase.from("messages").delete().eq("id", messageId)

      if (error) {
        console.log(" Error deleting message:", error)
        alert("Error deleting message: " + error.message)
      } else {
        console.log(" Message deleted successfully:", messageId)
      }
    } catch (err) {
      console.log(" Error in handleDeleteMessage:", err)
      alert("Error deleting message")
    }
  }

  const handleBackgroundChange = (color: string) => {
    setBackgroundColor(color)
  }

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleCall = async (type: "voice" | "video") => {
    // Request media permissions first so browser prompts user
    try {
      const constraints = type === "video" ? { audio: true, video: true } : { audio: true, video: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      // stop tracks immediately — VideoCallInterface will re-acquire or reuse as needed
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      console.log(" Media permission denied or error:", err)
      alert("Microphone and camera permission are required to start a call.")
      return
    }

    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from("call_history")
        .insert({
          caller_id: user.id,
          receiver_id: otherUser.id,
          call_type: type,
          status: "ringing",
        })
        .select()

      if (!error && data) {
        setShowCallModal(true)
        setCallType(type)
        setCallDuration(0)
        setIsCaller(true)

        if (callTimerRef.current) clearInterval(callTimerRef.current)
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1)
        }, 1000)

        console.log(" Call initiated:", data[0].id)
        // send a signaling message to the recipient (if websocket connected)
        try {
          signalingRef.current?.send({
            type: 'call',
            from: user.id,
            to: otherUser.id,
            callType: type,
            conversationId,
            fromName: (user as any)?.email || user.id,
          })
        } catch (err) {
          console.warn(' Signaling send failed', err)
        }
      }
    } catch (err) {
      console.log(" Error initiating call:", err)
      alert("Error initiating call")
    }
  }

  const handleCallEnd = async (duration: number) => {
    const supabase = createClient()
    try {
      await supabase
        .from("call_history")
        .update({
          status: "completed",
          duration_seconds: duration,
        })
        .eq("caller_id", user.id)
        .eq("receiver_id", otherUser.id)
        .order("created_at", { ascending: false })
        .limit(1)

      setActiveCall(null)
      console.log(" Call ended with duration:", duration)
  setIsCaller(false)
      try {
        // notify other user via signaling websocket
        signalingRef.current?.send({ type: 'call-ended', from: user.id, to: otherUser?.id, conversationId })
      } catch (err) {
        console.warn(' Signaling send failed', err)
      }
    } catch (err) {
      console.log(" Error ending call:", err)
    }
  }

  const handleAcceptCall = async () => {
    // Ensure we have permission to use mic/camera before accepting
    try {
      const constraints = incomingCall?.callType === "video" ? { audio: true, video: true } : { audio: true, video: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      console.log(" Media permission denied or error on accept:", err)
      alert("Microphone and camera permission are required to accept a call.")
      return
    }

    const supabase = createClient()
    try {
      await supabase
        .from("call_history")
        .update({ status: "active" })
        .eq("caller_id", incomingCall?.callerId)
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)

      setActiveCall({
        type: incomingCall?.callType || "voice",
        startTime: Date.now(),
      })
      setIncomingCall(null)
      setIsCaller(false)
      try {
        signalingRef.current?.send({ type: 'call-accepted', from: user.id, to: incomingCall?.callerId, callType: incomingCall?.callType, conversationId })
      } catch (err) {
        console.warn(' Signaling send failed', err)
      }
    } catch (err) {
      console.log(" Error accepting call:", err)
    }
  }

  const handleRejectCall = async () => {
    const supabase = createClient()
    try {
      await supabase
        .from("call_history")
        .update({ status: "rejected" })
        .eq("caller_id", incomingCall?.callerId)
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)

      setIncomingCall(null)
      setIsCaller(false)
      try {
        signalingRef.current?.send({ type: 'call-rejected', from: user.id, to: incomingCall?.callerId, conversationId })
      } catch (err) {
        console.warn(' Signaling send failed', err)
      }
    } catch (err) {
      console.log(" Error rejecting call:", err)
    }
  }

  const handleEndCall = async () => {
    if (activeCall) {
      const duration = Math.floor((Date.now() - activeCall.startTime) / 1000)
      await handleCallEnd(duration)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
        <div className="border-b border-gray-200 p-3 md:p-4 flex items-center justify-between bg-linear-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-8 md:w-10 h-8 md:h-10 bg-linear-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base shrink-0">
            {otherUser?.display_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm md:text-base truncate">
              {otherUser?.display_name || "Loading..."}
            </p>
            <p className="text-xs md:text-sm text-gray-500 truncate">{otherUser?.email || ""}</p>
          </div>
        </div>
          <div className="flex gap-1 md:gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-600 hover:text-blue-600 h-8 md:h-10 w-8 md:w-10 p-0"
            onClick={() => handleCall("voice")}
            title="Voice Call"
          >
            <Phone className="w-4 md:w-5 h-4 md:h-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-600 hover:text-blue-600 h-8 md:h-10 w-8 md:w-10 p-0"
            onClick={() => handleCall("video")}
            title="Video Call"
          >
            <Video className="w-4 md:w-5 h-4 md:h-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-600 hover:text-blue-600 h-8 md:h-10 w-8 md:w-10 p-0"
            title="Screen Share"
          >
            <Share2 className="w-4 md:w-5 h-4 md:h-5" />
          </Button>
          <div className="relative group">
            <Button size="sm" variant="ghost" className="text-gray-600 hover:text-blue-600 h-8 md:h-10 w-8 md:w-10 p-0">
              <MoreVertical className="w-4 md:w-5 h-4 md:h-5" />
            </Button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10">
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 mb-2">Chat Background</p>
                <div className="grid grid-cols-4 gap-2">
                  {["#ffffff", "#f0f9ff", "#f0fdf4", "#fef3c7", "#fecaca", "#e0e7ff", "#dbeafe", "#d1fae5"].map(
                    (color) => (
                      <button
                        key={color}
                        onClick={() => handleBackgroundChange(color)}
                        className={`w-8 h-8 rounded border-2 transition-colors ${
                          backgroundColor === color ? "border-blue-600" : "border-gray-300 hover:border-blue-600"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caller ringing modal */}
      {showCallModal && !activeCall && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 md:p-8 text-center max-w-sm mx-4">
            <div className="text-5xl md:text-6xl mb-4">{callType === "video" ? "📹" : "📞"}</div>
            <p className="text-lg font-semibold mb-2">Calling...</p>
            <p className="text-gray-600 mb-4">{otherUser?.display_name || "User"}</p>
            <p className="text-2xl font-bold text-blue-600 mb-6">
              {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, "0")}
            </p>
            <Button
              onClick={() => {
                setShowCallModal(false)
                if (callTimerRef.current) clearInterval(callTimerRef.current)
                handleEndCall()
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              End Call
            </Button>
          </div>
        </div>
      )}

      {/* Incoming call banner (non-blocking, like WhatsApp) */}
      {incomingCall && (
        <div className="fixed top-4 right-4 z-50 pointer-events-auto">
          <div className="w-72 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                {incomingCall.callerName?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{incomingCall.callerName}</p>
                <p className="text-xs text-gray-500 truncate">Incoming {incomingCall.callType} call</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleAcceptCall} className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white p-0 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button onClick={handleRejectCall} className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white p-0 flex items-center justify-center">
                  <PhoneOff className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="px-3 pb-3">
              <Button variant="ghost" size="sm" className="w-full text-left text-xs text-gray-500" onClick={() => setIncomingCall(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VideoCallInterface component for active calls */}
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

      {/* Photo Preview Modal */}
      {photoPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Preview Photo</h3>
              <button onClick={() => setPhotoPreview(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={photoPreview || "/placeholder.svg"} alt="Preview" className="w-full rounded mb-4" />
            <div className="flex gap-2">
              <Button onClick={handleSendPhoto} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Send Photo
              </Button>
              <Button onClick={() => setPhotoPreview(null)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4" style={{ backgroundColor }}>
        {loading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
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

      {/* Input */}
      <div className="border-t border-gray-200 p-2 md:p-4 bg-white">
        <div className="flex gap-1 md:gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-600 hover:text-blue-600 h-8 md:h-10 w-8 md:w-10 p-0 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Send Photo"
          >
            <ImageIcon className="w-4 md:w-5 h-4 md:h-5" />
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />

          <div className="relative shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-600 hover:text-blue-600 h-8 md:h-10 w-8 md:w-10 p-0"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Emoji"
            >
              <Smile className="w-4 md:w-5 h-4 md:h-5" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 w-max">
                <div className="grid grid-cols-5 gap-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-2xl hover:bg-gray-100 p-2 rounded transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 border-gray-300 text-sm md:text-base h-8 md:h-10"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 md:h-10 px-3 md:px-4 shrink-0"
          >
            <Send className="w-4 md:w-5 h-4 md:h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
