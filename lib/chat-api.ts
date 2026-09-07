"use client"

export interface ChatUser {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  status?: string
}

export interface ChatConversation {
  id: string
  participant_1_id: string
  participant_2_id: string
  created_at: string
  updated_at: string
  participant_1?: ChatUser
  participant_2?: ChatUser
  is_group?: boolean
  group_name?: string
  group_avatar?: string
  group_members?: string[]
  members?: string[]
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: "text" | "photo" | "video" | "document" | "audio"
  media_url?: string
  file_name?: string
  file_size?: number
  is_encrypted?: boolean
  reply_to?: {
    id: string
    sender_name: string
    content: string
  }
  reactions?: Record<string, string[]>
  is_starred?: boolean
  starred_by?: string[]
  is_deleted_for_everyone?: boolean
  deleted_for?: string[]
  created_at: string
}

export async function apiRegisterUser(user: { id: string; email: string; display_name?: string; avatar_url?: string; status?: string }): Promise<ChatUser> {
  try {
    const res = await fetch("/api/chat/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    })
    return await res.json()
  } catch (e) {
    return user as ChatUser
  }
}

export async function apiUpdateUserProfile(userId: string, updates: { display_name?: string; status?: string; avatar_url?: string }): Promise<ChatUser | null> {
  try {
    const res = await fetch("/api/chat/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, ...updates }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

export async function apiGetUsers(excludeId?: string): Promise<ChatUser[]> {
  try {
    const url = excludeId ? `/api/chat/users?excludeId=${encodeURIComponent(excludeId)}` : "/api/chat/users"
    const res = await fetch(url)
    if (!res.ok) return []
    return await res.json()
  } catch (e) {
    return []
  }
}

export async function apiGetConversations(userId: string): Promise<ChatConversation[]> {
  try {
    const res = await fetch(`/api/chat/conversations?userId=${encodeURIComponent(userId)}`)
    if (!res.ok) return []
    return await res.json()
  } catch (e) {
    return []
  }
}

export async function apiCreateConversation(participant1Id: string, participant2Id: string): Promise<ChatConversation> {
  const res = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participant1Id, participant2Id }),
  })
  return await res.json()
}

export async function apiGetMessages(conversationId: string, userId?: string): Promise<ChatMessage[]> {
  try {
    const url = userId
      ? `/api/chat/messages?conversationId=${encodeURIComponent(conversationId)}&userId=${encodeURIComponent(userId)}`
      : `/api/chat/messages?conversationId=${encodeURIComponent(conversationId)}`
    const res = await fetch(url)
    if (!res.ok) return []
    return await res.json()
  } catch (e) {
    return []
  }
}

export async function apiSendMessage(
  message: (Omit<ChatMessage, "id" | "created_at"> & { id?: string; created_at?: string })
): Promise<ChatMessage> {
  const res = await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  })
  return await res.json()
}

export async function apiDeleteMessage(
  messageId: string,
  mode: "for_me" | "for_everyone" = "for_everyone",
  userId: string = ""
): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/chat/messages?messageId=${encodeURIComponent(messageId)}&mode=${encodeURIComponent(mode)}&userId=${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
      }
    )
    return res.ok
  } catch (e) {
    return false
  }
}

// REALTIME SSE STREAM + SHORT POLLING FALLBACK
export function connectChatStream(
  userId: string,
  onEvent: (event: { type: string; payload: any }) => void
): () => void {
  if (typeof window === "undefined") return () => {}

  let eventSource: EventSource | null = null
  let pollInterval: NodeJS.Timeout | null = null
  let isClosed = false

  const startSSE = () => {
    if (isClosed) return
    try {
      eventSource = new EventSource(`/api/chat/sync?userId=${encodeURIComponent(userId)}`)

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data)
          if (parsed.type && parsed.type !== "connected") {
            onEvent(parsed)
          }
        } catch (err) {}
      }

      eventSource.onerror = () => {
        eventSource?.close()
        eventSource = null
        // Reconnect after 3s
        if (!isClosed) {
          setTimeout(startSSE, 3000)
        }
      }
    } catch (e) {}
  }

  startSSE()

  // Fallback poller every 2.5 seconds to guarantee 100% reliability
  pollInterval = setInterval(() => {
    onEvent({ type: "heartbeat_poll", payload: null })
  }, 2500)

  return () => {
    isClosed = true
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    if (pollInterval) {
      clearInterval(pollInterval)
    }
  }
}

export interface ChatStory {
  id: string
  user_id: string
  media_url?: string
  text_content?: string
  background_color?: string
  caption?: string
  created_at: string
  expires_at: string
  user?: ChatUser
}

export async function apiGetStories(): Promise<ChatStory[]> {
  try {
    const res = await fetch("/api/chat/stories")
    if (!res.ok) return []
    return await res.json()
  } catch (e) {
    return []
  }
}

export async function apiCreateStory(story: {
  user_id: string
  media_url?: string
  text_content?: string
  background_color?: string
  caption?: string
}): Promise<ChatStory | null> {
  try {
    const res = await fetch("/api/chat/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(story),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

export async function apiDeleteStory(storyId: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/chat/stories?storyId=${encodeURIComponent(storyId)}&userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    })
    return res.ok
  } catch (e) {
    return false
  }
}
