import fs from "fs"
import path from "path"

export interface ServerUser {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  status?: string
  last_seen?: string
}

export interface ServerConversation {
  id: string
  participant_1_id: string
  participant_2_id: string
  created_at: string
  updated_at: string
  participant_1?: ServerUser
  participant_2?: ServerUser
}

export interface ServerMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: "text" | "photo" | "video" | "document" | "audio"
  media_url?: string
  file_name?: string
  file_size?: number
  is_encrypted?: boolean
  created_at: string
}

export interface ServerCall {
  id: string
  caller_id: string
  receiver_id: string
  call_type: "voice" | "video"
  status: "ringing" | "active" | "completed" | "rejected"
  duration_seconds?: number
  created_at: string
  conversation_id?: string
}

export interface ServerSignaling {
  id: string
  from_id: string
  to_id: string
  type: string
  payload?: any
  call_type?: string
  conversation_id?: string
  created_at: string
}

export interface ServerStory {
  id: string
  user_id: string
  media_url?: string
  text_content?: string
  background_color?: string
  caption?: string
  created_at: string
  expires_at: string
  user?: ServerUser
}

interface StoreData {
  users: ServerUser[]
  conversations: ServerConversation[]
  messages: ServerMessage[]
  calls: ServerCall[]
  signaling: ServerSignaling[]
  stories: ServerStory[]
}

const DATA_DIR = path.join(process.cwd(), ".uchat_data")
const DATA_FILE = path.join(DATA_DIR, "store.json")

// In-memory cache + file persistence
let store: StoreData = {
  users: [
    {
      id: "9f914f53-8e69-44d2-8759-4dc5cb935b4d",
      email: "wowarij@gmail.com",
      display_name: "Wow Arij",
      status: "online",
    },
    {
      id: "24e4970f-7369-46ed-871b-a64ce2f3f3e0",
      email: "arij.chowdhuryr@gmail.com",
      display_name: "Arij Chowdhury",
      status: "online",
    },
  ],
  conversations: [],
  messages: [],
  calls: [],
  signaling: [],
  stories: [],
}

// Event listeners for SSE
type SSEListener = (data: { type: string; payload: any }) => void
const sseListeners = new Map<string, Set<SSEListener>>()

function initStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8")
      const parsed = JSON.parse(raw)
      store = { ...store, ...parsed }
    } else {
      saveStore()
    }
  } catch (e) {
    console.error("[server-store] init error:", e)
  }
}

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8")
  } catch (e) {
    console.error("[server-store] save error:", e)
  }
}

initStore()

export function registerServerUser(user: Partial<ServerUser> & { id: string; email: string }): ServerUser {
  const emailLower = user.email.toLowerCase()
  const idx = store.users.findIndex((u) => u.email.toLowerCase() === emailLower || u.id === user.id)

  const updated: ServerUser = {
    id: user.id,
    email: user.email,
    display_name: user.display_name || user.email.split("@")[0],
    avatar_url: user.avatar_url || "",
    status: "online",
    last_seen: new Date().toISOString(),
  }

  if (idx >= 0) {
    store.users[idx] = { ...store.users[idx], ...updated }
  } else {
    store.users.push(updated)
  }

  saveStore()

  // Broadcast to all active listeners that user profile was updated
  sseListeners.forEach((listenerSet) => {
    listenerSet.forEach((fn) => {
      try {
        fn({ type: "user_updated", payload: updated })
      } catch (e) {}
    })
  })

  return updated
}

export function updateServerUserProfile(
  userId: string,
  updates: { display_name?: string; status?: string; avatar_url?: string }
): ServerUser | null {
  const user = store.users.find((u) => u.id === userId)
  if (!user) return null

  if (updates.display_name !== undefined) user.display_name = updates.display_name
  if (updates.status !== undefined) user.status = updates.status
  if (updates.avatar_url !== undefined) user.avatar_url = updates.avatar_url

  saveStore()

  // Broadcast to all active listeners that user profile was updated
  sseListeners.forEach((listenerSet) => {
    listenerSet.forEach((fn) => {
      try {
        fn({ type: "user_updated", payload: user })
      } catch (e) {}
    })
  })

  return user
}

export function getServerUsers(excludeId?: string): ServerUser[] {
  return store.users.filter((u) => !excludeId || u.id !== excludeId)
}

export function getServerUserById(id: string): ServerUser | undefined {
  return store.users.find((u) => u.id === id)
}

export function getServerUserByEmail(email: string): ServerUser | undefined {
  return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function getServerConversations(userId: string): ServerConversation[] {
  const userMap = new Map(store.users.map((u) => [u.id, u]))

  // Ensure default conversation between the two primary users exists
  if (store.conversations.length === 0 && store.users.length >= 2) {
    const u1 = store.users[0]
    const u2 = store.users[1]
    store.conversations.push({
      id: `conv_${u1.id}_${u2.id}`,
      participant_1_id: u1.id,
      participant_2_id: u2.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    saveStore()
  }

  return store.conversations
    .filter((c) => c.participant_1_id === userId || c.participant_2_id === userId)
    .map((c) => ({
      ...c,
      participant_1: userMap.get(c.participant_1_id) || { id: c.participant_1_id, email: "user1@example.com", display_name: "User 1" },
      participant_2: userMap.get(c.participant_2_id) || { id: c.participant_2_id, email: "user2@example.com", display_name: "User 2" },
    }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function createServerConversation(participant1Id: string, participant2Id: string): ServerConversation {
  // Check existing
  const existing = store.conversations.find(
    (c) =>
      (c.participant_1_id === participant1Id && c.participant_2_id === participant2Id) ||
      (c.participant_1_id === participant2Id && c.participant_2_id === participant1Id)
  )
  if (existing) return existing

  const newConv: ServerConversation = {
    id: `conv_${participant1Id}_${participant2Id}`,
    participant_1_id: participant1Id,
    participant_2_id: participant2Id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  store.conversations.unshift(newConv)
  saveStore()

  notifyUser(participant1Id, { type: "conversation_created", payload: newConv })
  notifyUser(participant2Id, { type: "conversation_created", payload: newConv })

  return newConv
}

export function getServerMessages(conversationId: string): ServerMessage[] {
  return store.messages
    .filter((m) => m.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function addServerMessage(msg: Omit<ServerMessage, "id" | "created_at"> & { id?: string; created_at?: string }): ServerMessage {
  const newMsg: ServerMessage = {
    id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    content: msg.content,
    message_type: msg.message_type || "text",
    media_url: msg.media_url,
    file_name: msg.file_name,
    file_size: msg.file_size,
    is_encrypted: msg.is_encrypted || false,
    created_at: msg.created_at || new Date().toISOString(),
  }

  store.messages.push(newMsg)

  // Update conversation updated_at
  const conv = store.conversations.find((c) => c.id === msg.conversation_id)
  if (conv) {
    conv.updated_at = newMsg.created_at
    // Notify both participants
    notifyUser(conv.participant_1_id, { type: "message_inserted", payload: newMsg })
    notifyUser(conv.participant_2_id, { type: "message_inserted", payload: newMsg })
  }

  saveStore()
  return newMsg
}

export function deleteServerMessage(messageId: string): boolean {
  const msg = store.messages.find((m) => m.id === messageId)
  if (!msg) return false

  store.messages = store.messages.filter((m) => m.id !== messageId)
  saveStore()

  const conv = store.conversations.find((c) => c.id === msg.conversation_id)
  if (conv) {
    notifyUser(conv.participant_1_id, { type: "message_deleted", payload: { conversationId: conv.id, messageId } })
    notifyUser(conv.participant_2_id, { type: "message_deleted", payload: { conversationId: conv.id, messageId } })
  }

  return true
}

// CALLS & SIGNALING
export function addServerCall(call: Omit<ServerCall, "id" | "created_at">): ServerCall {
  const newCall: ServerCall = {
    id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...call,
    created_at: new Date().toISOString(),
  }
  store.calls.unshift(newCall)
  saveStore()

  const callerUser = store.users.find((u) => u.id === call.caller_id)
  notifyUser(call.receiver_id, {
    type: "call_incoming",
    payload: {
      ...newCall,
      caller_name: callerUser?.display_name || callerUser?.email?.split("@")[0] || "Contact",
    },
  })
  return newCall
}

export function updateServerCall(callId: string, status: ServerCall["status"], duration?: number): ServerCall | null {
  const call = store.calls.find((c) => c.id === callId)
  if (!call) return null

  call.status = status
  if (duration !== undefined) call.duration_seconds = duration
  saveStore()

  notifyUser(call.caller_id, { type: "call_status", payload: call })
  notifyUser(call.receiver_id, { type: "call_status", payload: call })
  return call
}

export function getServerCalls(userId: string): any[] {
  const userMap = new Map(store.users.map((u) => [u.id, u]))
  return store.calls
    .filter((c) => c.caller_id === userId || c.receiver_id === userId)
    .map((c) => ({
      ...c,
      caller: userMap.get(c.caller_id) || { id: c.caller_id, display_name: "Contact" },
      receiver: userMap.get(c.receiver_id) || { id: c.receiver_id, display_name: "Contact" },
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function addServerSignaling(sig: Omit<ServerSignaling, "id" | "created_at">): ServerSignaling {
  const newSig: ServerSignaling = {
    id: `sig_${Date.now()}`,
    ...sig,
    created_at: new Date().toISOString(),
  }
  store.signaling.push(newSig)
  if (store.signaling.length > 200) store.signaling.shift()

  notifyUser(sig.to_id, { type: "signaling", payload: newSig })
  return newSig
}

// STORIES / STATUS
export function getServerStories(): ServerStory[] {
  const now = new Date().getTime()
  const userMap = new Map(store.users.map((u) => [u.id, u]))

  // Clean up expired stories (> 24h)
  if (!store.stories) store.stories = []
  store.stories = store.stories.filter((s) => new Date(s.expires_at).getTime() > now)

  return store.stories
    .map((s) => ({
      ...s,
      user: userMap.get(s.user_id) || {
        id: s.user_id,
        email: "user@example.com",
        display_name: "Contact",
      },
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function addServerStory(story: {
  user_id: string
  media_url?: string
  text_content?: string
  background_color?: string
  caption?: string
}): ServerStory {
  if (!store.stories) store.stories = []

  const newStory: ServerStory = {
    id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    user_id: story.user_id,
    media_url: story.media_url,
    text_content: story.text_content,
    background_color: story.background_color,
    caption: story.caption,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  store.stories.unshift(newStory)
  saveStore()

  // Broadcast to all active users that a story was added
  sseListeners.forEach((listenerSet) => {
    listenerSet.forEach((fn) => {
      try {
        fn({ type: "story_created", payload: newStory })
      } catch (e) {}
    })
  })

  return newStory
}

export function deleteServerStory(storyId: string, userId: string): boolean {
  if (!store.stories) return false

  const initialLen = store.stories.length
  store.stories = store.stories.filter((s) => s.id !== storyId || s.user_id !== userId)

  if (store.stories.length !== initialLen) {
    saveStore()
    sseListeners.forEach((listenerSet) => {
      listenerSet.forEach((fn) => {
        try {
          fn({ type: "story_deleted", payload: { storyId } })
        } catch (e) {}
      })
    })
    return true
  }

  return false
}

// REALTIME SSE NOTIFIER
export function subscribeToUserEvents(userId: string, listener: SSEListener): () => void {
  if (!sseListeners.has(userId)) {
    sseListeners.set(userId, new Set())
  }
  sseListeners.get(userId)!.add(listener)

  return () => {
    const set = sseListeners.get(userId)
    if (set) {
      set.delete(listener)
      if (set.size === 0) sseListeners.delete(userId)
    }
  }
}

function notifyUser(userId: string, data: { type: string; payload: any }) {
  const listeners = sseListeners.get(userId)
  if (listeners) {
    listeners.forEach((fn) => {
      try {
        fn(data)
      } catch (e) {}
    })
  }
}
