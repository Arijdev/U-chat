"use client"

import type { User } from "@supabase/supabase-js"
import { useState, useEffect, useCallback, useRef } from "react"
import { NavRail, type NavTab } from "./nav-rail"
import ChatSidebar from "./chat-sidebar"
import ChatWindow from "./chat-window"
import StoriesView from "./stories-view"
import CallHistory from "./call-history"
import { SettingsDrawer } from "./settings-drawer"
import { StarredMessagesDrawer } from "./starred-messages-drawer"
import { ChannelsView } from "./channels-view"
import { CommunitiesView } from "./communities-view"
import { MetaAiView } from "./meta-ai-view"
import { ProfileDrawer } from "./profile-drawer"
import { VideoCallInterface } from "./video-call-interface"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Lock } from "lucide-react"
import {
  apiRegisterUser,
  apiGetConversations,
  connectChatStream,
} from "@/lib/chat-api"
import { registerProfile } from "@/lib/dataset"
import { createSignaling, dispatchSignalingMessage } from "@/lib/signaling"
import { playIncomingRingtone, stopCallSounds } from "@/lib/sound"

interface ActiveCallData {
  callId?: string
  callType: "voice" | "video"
  otherUserId: string
  otherUserName: string
  conversationId?: string
  isCaller: boolean
  startTime: number
}

interface IncomingCallData {
  callId?: string
  callerId: string
  callerName: string
  callType: "voice" | "video"
  conversationId?: string
}

export default function ChatLayout({ user }: { user: User }) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<NavTab>("chats")
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showProfileDrawer, setShowProfileDrawer] = useState(false)
  const [metaAiInitialPrompt, setMetaAiInitialPrompt] = useState<string | null>(null)

  // Global call state
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
  const signalingRef = useRef<any>(null)

  // 1. Register current user on the backend server and local store
  useEffect(() => {
    const isBase64Avatar = user.user_metadata?.avatar_url?.startsWith("data:")
    const cleanAvatar = isBase64Avatar
      ? `/api/chat/avatar?userId=${user.id}`
      : user.user_metadata?.avatar_url || ""

    const userData = {
      id: user.id,
      email: user.email || "",
      display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
      avatar_url: cleanAvatar,
    }
    apiRegisterUser(userData)
    registerProfile(userData)
  }, [user])

  const loadConversations = useCallback(async () => {
    try {
      const convs = await apiGetConversations(user.id)
      setConversations(convs)
    } catch (e) {
      console.warn("Error loading conversations:", e)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  // Initialize universal signaling client
  useEffect(() => {
    if (!user?.id) return
    const signaling = createSignaling(user.id)
    signalingRef.current = signaling

    const removeListener = signaling.addListener((msg: any) => {
      if (msg.to && msg.to !== user.id) return

      switch (msg.type) {
        case "call":
          setIncomingCall({
            callId: msg.callId,
            callerId: msg.from,
            callerName: msg.fromName || "Contact",
            callType: msg.callType || "voice",
            conversationId: msg.conversationId,
          })
          break

        case "call-rejected":
        case "call-ended":
          setActiveCall(null)
          setIncomingCall(null)
          stopCallSounds()
          break
      }
    })

    return () => {
      removeListener()
      signaling.close()
    }
  }, [user.id])

  // Realtime server stream: updates conversations, catches SSE signaling and call notifications
  useEffect(() => {
    loadConversations()

    const disconnectStream = connectChatStream(user.id, (event) => {
      if (
        event.type === "conversation_created" ||
        event.type === "message_inserted" ||
        event.type === "user_updated" ||
        event.type === "heartbeat_poll"
      ) {
        loadConversations()
      }

      if (event.type === "signaling") {
        const sig = event.payload?.payload || event.payload
        if (sig) {
          dispatchSignalingMessage(user.id, sig)
        }
      } else if (event.type === "call_incoming") {
        const call = event.payload
        if (call && call.caller_id !== user.id) {
          setIncomingCall({
            callId: call.id,
            callerId: call.caller_id,
            callerName: call.caller_name || "Contact",
            callType: call.call_type || "voice",
            conversationId: call.conversation_id,
          })
        }
      } else if (event.type === "call_status") {
        const call = event.payload
        if (call?.status === "completed" || call?.status === "rejected") {
          setActiveCall(null)
          setIncomingCall(null)
          stopCallSounds()
        }
      }
    })

    return () => {
      disconnectStream()
    }
  }, [user.id, loadConversations])

  // Play incoming ringtone when receiving a call
  // Ensure document title is Arixo Web
  useEffect(() => {
    document.title = "Arixo Web"
  }, [])

  useEffect(() => {
    if (incomingCall) {
      playIncomingRingtone()
    } else {
      stopCallSounds()
    }
    return () => {
      stopCallSounds()
    }
  }, [incomingCall])

  // Accept incoming call
  const handleAcceptCall = async () => {
    if (!incomingCall) return
    const callToAccept = incomingCall
    stopCallSounds()
    setIncomingCall(null)

    if (callToAccept.conversationId) {
      setSelectedConversation(callToAccept.conversationId)
      setActiveTab("chats")
    }

    try {
      await fetch("/api/chat/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          callId: callToAccept.callId,
          caller_id: callToAccept.callerId,
          receiver_id: user.id,
          status: "active",
        }),
      })
    } catch (e) {}

    setActiveCall({
      callId: callToAccept.callId,
      callType: callToAccept.callType,
      otherUserId: callToAccept.callerId,
      otherUserName: callToAccept.callerName,
      conversationId: callToAccept.conversationId,
      isCaller: false,
      startTime: Date.now(),
    })

    signalingRef.current?.send({
      type: "call-accepted",
      from: user.id,
      to: callToAccept.callerId,
      callType: callToAccept.callType,
      conversationId: callToAccept.conversationId,
    })
  }

  // Reject incoming call
  const handleRejectCall = async () => {
    if (!incomingCall) return
    const callToReject = incomingCall
    stopCallSounds()
    setIncomingCall(null)

    try {
      await fetch("/api/chat/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          callId: callToReject.callId,
          caller_id: callToReject.callerId,
          receiver_id: user.id,
          status: "rejected",
        }),
      })
    } catch (e) {}

    signalingRef.current?.send({
      type: "call-rejected",
      from: user.id,
      to: callToReject.callerId,
      conversationId: callToReject.conversationId,
    })
  }

  // Start outgoing call from ChatWindow
  const handleStartCall = async (type: "voice" | "video", targetUser: any) => {
    if (!targetUser?.id) return

    try {
      const res = await fetch("/api/chat/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caller_id: user.id,
          receiver_id: targetUser.id,
          call_type: type,
          conversation_id: selectedConversation || undefined,
        }),
      })
      const callData = await res.json()

      setActiveCall({
        callId: callData.id,
        callType: type,
        otherUserId: targetUser.id,
        otherUserName: targetUser.display_name || targetUser.email?.split("@")[0] || "Contact",
        conversationId: selectedConversation || undefined,
        isCaller: true,
        startTime: Date.now(),
      })

      signalingRef.current?.send({
        type: "call",
        callId: callData.id,
        from: user.id,
        to: targetUser.id,
        callType: type,
        conversationId: selectedConversation || undefined,
        fromName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Contact",
      })
    } catch (e) {
      console.error("Start call error:", e)
    }
  }

  // End active call
  const handleCallEnd = async (duration: number) => {
    if (!activeCall) return
    const current = activeCall
    stopCallSounds()
    setActiveCall(null)

    try {
      await fetch("/api/chat/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          callId: current.callId,
          caller_id: current.isCaller ? user.id : current.otherUserId,
          receiver_id: current.isCaller ? current.otherUserId : user.id,
          status: "completed",
          duration,
        }),
      })
    } catch (e) {}

    signalingRef.current?.send({
      type: "call-ended",
      from: user.id,
      to: current.otherUserId,
      conversationId: current.conversationId,
    })
  }

  const isDetailActive = Boolean(selectedConversation && activeTab === "chats")
  const hideMobileNav = isDetailActive || activeTab === "meta_ai" || activeTab === "stories"

  return (
    <div className={`flex h-[100dvh] bg-background text-foreground w-full overflow-hidden relative ${hideMobileNav ? "pb-0" : "pb-14 md:pb-0"}`}>
      {/* 1. Left Vertical Navigation Rail (Desktop) & Bottom Navigation Bar (Mobile) */}
      <NavRail
        user={user}
        activeTab={activeTab}
        hideMobileNav={hideMobileNav}
        onSelectTab={(tab) => {
          setActiveTab(tab)
          if (tab !== "meta_ai") {
            setMetaAiInitialPrompt(null)
          }
          if (tab !== "chats") {
            setSelectedConversation(null)
          }
        }}
        onOpenProfile={() => setShowProfileDrawer(true)}
      />

      {/* 2. Main Center / Split Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TAB 1: CHATS (Sidebar + ChatWindow) */}
        {activeTab === "chats" && (
          <>
            <ChatSidebar
              user={user}
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={(id) => {
                setSelectedConversation(id)
              }}
              onShowStories={() => setActiveTab("stories")}
              onShowCallHistory={() => setActiveTab("calls")}
              onOpenMetaAi={(prompt?: string) => {
                setMetaAiInitialPrompt(prompt || null)
                setActiveTab("meta_ai")
              }}
              loading={loading}
              className={isDetailActive ? "hidden md:flex" : "flex"}
            />

            {selectedConversation ? (
              <ChatWindow
                conversationId={selectedConversation}
                user={user}
                onBack={() => setSelectedConversation(null)}
                onStartCall={handleStartCall}
              />
            ) : (
              <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35] border-b-6 border-b-emerald-500">
                <div className="text-center p-8 max-w-md space-y-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-600/10 text-emerald-600 flex items-center justify-center mx-auto text-4xl shadow-xs animate-in zoom-in duration-300">
                    💬
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Arixo Web</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Send and receive messages with end-to-end encryption. Seamless real-time sync with photos, documents, voice notes, and HD video calls.
                    </p>
                  </div>
                  <div className="pt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>End-to-end encrypted</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: STORIES / STATUS */}
        {activeTab === "stories" && (
          <StoriesView
            user={user}
            onClose={() => setActiveTab("chats")}
            onOpenChatWithContact={(convId) => {
              setActiveTab("chats")
              setSelectedConversation(convId)
            }}
          />
        )}

        {/* TAB 3: CHANNELS */}
        {activeTab === "channels" && (
          <ChannelsView user={user} onClose={() => setActiveTab("chats")} />
        )}

        {/* TAB 4: COMMUNITIES */}
        {activeTab === "communities" && (
          <CommunitiesView
            user={user}
            onClose={() => setActiveTab("chats")}
            onOpenGroupChat={(groupName) => {
              setActiveTab("chats")
            }}
          />
        )}

        {/* TAB 5: META AI */}
        {activeTab === "meta_ai" && (
          <MetaAiView
            user={user}
            initialPrompt={metaAiInitialPrompt}
            onClose={() => {
              setMetaAiInitialPrompt(null)
              setActiveTab("chats")
            }}
          />
        )}

        {/* TAB 6: STARRED MESSAGES */}
        {activeTab === "starred" && (
          <>
            <StarredMessagesDrawer
              user={user}
              onClose={() => setActiveTab("chats")}
              onSelectConversation={(convId) => {
                setActiveTab("chats")
                setSelectedConversation(convId)
              }}
            />
            {selectedConversation ? (
              <ChatWindow
                conversationId={selectedConversation}
                user={user}
                onBack={() => setSelectedConversation(null)}
                onStartCall={handleStartCall}
              />
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35] text-muted-foreground text-xs">
                Select a starred message to jump directly to its conversation.
              </div>
            )}
          </>
        )}

        {/* TAB 7: ARCHIVED CHATS */}
        {activeTab === "archived" && (
          <>
            <ChatSidebar
              user={user}
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={(id) => {
                setActiveTab("chats")
                setSelectedConversation(id)
              }}
              onShowStories={() => setActiveTab("stories")}
              onShowCallHistory={() => setActiveTab("calls")}
              loading={loading}
              className={isDetailActive ? "hidden md:flex" : "flex"}
            />
            {selectedConversation ? (
              <ChatWindow
                conversationId={selectedConversation}
                user={user}
                onBack={() => setSelectedConversation(null)}
                onStartCall={handleStartCall}
              />
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35] text-muted-foreground text-xs">
                Archived chats stay archived when new messages are received.
              </div>
            )}
          </>
        )}

        {/* TAB 8: SETTINGS */}
        {activeTab === "settings" && (
          <div className="flex flex-1 overflow-hidden">
            <SettingsDrawer
              user={user}
              onClose={() => setActiveTab("chats")}
              onOpenProfile={() => setShowProfileDrawer(true)}
            />
            <div className="hidden md:flex flex-1 items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35] text-muted-foreground text-xs">
              Configure personal profile, privacy, themes, wallpaper, notifications and shortcuts.
            </div>
          </div>
        )}

        {/* TAB 9: CALLS */}
        {activeTab === "calls" && (
          <div className="flex flex-1 overflow-hidden w-full">
            <CallHistory
              user={user}
              onClose={() => setActiveTab("chats")}
              onStartCall={handleStartCall}
            />
            <div className="hidden md:flex flex-1 items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35] text-muted-foreground text-xs">
              Call history and logs are synced across your linked devices.
            </div>
          </div>
        )}
      </div>

      {/* 3. Global Profile Drawer (when avatar clicked) */}
      {showProfileDrawer && (
        <ProfileDrawer
          user={user}
          currentProfile={{
            id: user.id,
            email: user.email || "",
            display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
            status: user.user_metadata?.status || "Hey there! I am using WhatsApp.",
            avatar_url: user.user_metadata?.avatar_url || "",
          }}
          onClose={() => setShowProfileDrawer(false)}
          onProfileUpdated={() => {
            loadConversations()
          }}
        />
      )}

      {/* 4. Incoming Call Notification (WhatsApp style banner) */}
      {incomingCall && (
        <div className="fixed top-5 right-5 z-50 pointer-events-auto animate-in slide-in-from-top-4 duration-300">
          <div className="w-80 md:w-88 bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-emerald-500/50 overflow-hidden text-card-foreground p-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md animate-pulse">
                {incomingCall.callerName?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{incomingCall.callerName}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Incoming WhatsApp {incomingCall.callType} call...
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handleAcceptCall}
                  className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white p-0 flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  title="Answer"
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleRejectCall}
                  className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white p-0 flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  title="Decline"
                >
                  <PhoneOff className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Global Full-Screen Active Voice/Video Call Interface */}
      {activeCall && (
        <VideoCallInterface
          callType={activeCall.callType}
          otherUserName={activeCall.otherUserName}
          onCallEnd={handleCallEnd}
          onClose={() => {
            stopCallSounds()
            setActiveCall(null)
          }}
          signaling={signalingRef.current}
          localUserId={user.id}
          otherUserId={activeCall.otherUserId}
          conversationId={activeCall.conversationId}
          isCaller={activeCall.isCaller}
        />
      )}
    </div>
  )
}
