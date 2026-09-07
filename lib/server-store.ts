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
  is_group?: boolean
  group_name?: string
  group_avatar?: string
  group_members?: string[]
  is_archived?: boolean
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
  reply_to?: {
    id: string
    sender_name: string
    content: string
  }
  reactions?: Record<string, string[]> // emoji -> [userId1, userId2]
  is_starred?: boolean
  starred_by?: string[]
  is_deleted_for_everyone?: boolean
  deleted_for?: string[]
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

export interface ServerChannel {
  id: string
  name: string
  handle: string
  description: string
  avatar_url: string
  verified: boolean
  followers_count: number
  followers: string[]
  updates: {
    id: string
    text: string
    time: string
    media_url?: string
    reactions?: Record<string, number>
  }[]
}

export interface ServerCommunity {
  id: string
  name: string
  description: string
  avatar_url: string
  members_count: number
  announcement_group: string
  groups: { id: string; name: string; member_count: number }[]
}

interface StoreData {
  users: ServerUser[]
  conversations: ServerConversation[]
  messages: ServerMessage[]
  calls: ServerCall[]
  signaling: ServerSignaling[]
  stories: ServerStory[]
  channels?: ServerChannel[]
  communities?: ServerCommunity[]
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
    .filter(
      (c) =>
        c.participant_1_id === userId ||
        c.participant_2_id === userId ||
        (c.is_group && Array.isArray(c.group_members) && c.group_members.includes(userId))
    )
    .map((c) => ({
      ...c,
      participant_1: userMap.get(c.participant_1_id) || { id: c.participant_1_id, email: "user1@example.com", display_name: "User 1" },
      participant_2: userMap.get(c.participant_2_id) || { id: c.participant_2_id, email: "user2@example.com", display_name: "User 2" },
      members:
        c.is_group && Array.isArray(c.group_members)
          ? c.group_members.map((mId) => userMap.get(mId) || { id: mId, email: "", display_name: "Member" })
          : undefined,
    }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function addGroupMembers(groupId: string, newMemberIds: string[]): ServerConversation | null {
  const conv = store.conversations.find((c) => c.id === groupId && c.is_group)
  if (!conv) return null

  const existing = new Set(conv.group_members || [conv.participant_1_id])
  newMemberIds.forEach((id) => existing.add(id))
  conv.group_members = Array.from(existing)
  conv.updated_at = new Date().toISOString()
  saveStore()

  conv.group_members.forEach((mId) => {
    notifyUser(mId, { type: "conversation_updated", payload: conv })
  })

  return conv
}

export function removeGroupMember(groupId: string, memberIdToRemove: string): ServerConversation | null {
  const conv = store.conversations.find((c) => c.id === groupId && c.is_group)
  if (!conv) return null

  const notifyList = [...(conv.group_members || [])]
  conv.group_members = (conv.group_members || []).filter((id) => id !== memberIdToRemove)
  conv.updated_at = new Date().toISOString()
  saveStore()

  notifyList.forEach((mId) => {
    notifyUser(mId, { type: "conversation_updated", payload: conv })
  })

  return conv
}

export function updateGroupDetails(groupId: string, updates: { name?: string; avatar_url?: string }): ServerConversation | null {
  const conv = store.conversations.find((c) => c.id === groupId && c.is_group)
  if (!conv) return null

  if (updates.name) conv.group_name = updates.name.trim()
  if (updates.avatar_url !== undefined) conv.group_avatar = updates.avatar_url
  conv.updated_at = new Date().toISOString()
  saveStore()

  ;(conv.group_members || []).forEach((mId) => {
    notifyUser(mId, { type: "conversation_updated", payload: conv })
  })

  return conv
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

export function getServerMessages(conversationId: string, userId?: string): ServerMessage[] {
  return store.messages
    .filter((m) => {
      if (m.conversation_id !== conversationId) return false
      if (userId && Array.isArray(m.deleted_for) && m.deleted_for.includes(userId)) {
        return false
      }
      return true
    })
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
    reply_to: msg.reply_to,
    reactions: msg.reactions || {},
    is_starred: msg.is_starred || false,
    created_at: msg.created_at || new Date().toISOString(),
  }

  store.messages.push(newMsg)

  // Update conversation updated_at
  const conv = store.conversations.find((c) => c.id === msg.conversation_id)
  if (conv) {
    conv.updated_at = newMsg.created_at
    // Notify participants
    if (conv.is_group && conv.group_members) {
      conv.group_members.forEach((memberId) => {
        notifyUser(memberId, { type: "message_inserted", payload: newMsg })
      })
    } else {
      notifyUser(conv.participant_1_id, { type: "message_inserted", payload: newMsg })
      notifyUser(conv.participant_2_id, { type: "message_inserted", payload: newMsg })
    }
  }

  saveStore()
  return newMsg
}

export function toggleServerMessageReaction(messageId: string, emoji: string, userId: string): ServerMessage | null {
  const msg = store.messages.find((m) => m.id === messageId)
  if (!msg) return null

  if (!msg.reactions) msg.reactions = {}
  if (!msg.reactions[emoji]) msg.reactions[emoji] = []

  const userIdx = msg.reactions[emoji].indexOf(userId)
  if (userIdx > -1) {
    msg.reactions[emoji].splice(userIdx, 1)
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji]
    }
  } else {
    // Remove user from any other emoji in this message
    Object.keys(msg.reactions).forEach((k) => {
      msg.reactions![k] = msg.reactions![k].filter((id) => id !== userId)
      if (msg.reactions![k].length === 0) delete msg.reactions![k]
    })
    msg.reactions[emoji].push(userId)
  }

  saveStore()

  const conv = store.conversations.find((c) => c.id === msg.conversation_id)
  if (conv) {
    notifyUser(conv.participant_1_id, { type: "message_updated", payload: msg })
    notifyUser(conv.participant_2_id, { type: "message_updated", payload: msg })
  }

  return msg
}

export function toggleServerMessageStar(messageId: string, isStarred: boolean, userId?: string): ServerMessage | null {
  const msg = store.messages.find((m) => m.id === messageId)
  if (!msg) return null

  if (!Array.isArray(msg.starred_by)) {
    msg.starred_by = msg.is_starred ? [userId || msg.sender_id] : []
  }

  if (userId) {
    if (isStarred) {
      if (!msg.starred_by.includes(userId)) {
        msg.starred_by.push(userId)
      }
    } else {
      msg.starred_by = msg.starred_by.filter((id) => id !== userId)
    }
  }

  msg.is_starred = isStarred
  saveStore()

  const conv = store.conversations.find((c) => c.id === msg.conversation_id)
  if (conv) {
    notifyUser(conv.participant_1_id, { type: "message_updated", payload: msg })
    notifyUser(conv.participant_2_id, { type: "message_updated", payload: msg })
    if (conv.group_members) {
      conv.group_members.forEach((mId) => notifyUser(mId, { type: "message_updated", payload: msg }))
    }
  }

  return msg
}

export function getStarredMessages(userId: string, conversationId?: string | null): ServerMessage[] {
  // Get all messages from conversations involving this user that have is_starred: true or are in starred_by
  const userConvIds = new Set(
    store.conversations
      .filter((c) => c.participant_1_id === userId || c.participant_2_id === userId || c.group_members?.includes(userId))
      .map((c) => c.id)
  )

  return store.messages
    .filter((m) => {
      if (m.is_deleted_for_everyone) return false
      if (Array.isArray(m.deleted_for) && m.deleted_for.includes(userId)) return false
      if (conversationId && m.conversation_id !== conversationId) return false
      const isStarredForUser =
        (Array.isArray(m.starred_by) && m.starred_by.includes(userId)) ||
        (m.is_starred && (userConvIds.has(m.conversation_id) || m.sender_id === userId))
      return isStarredForUser
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function createGroupConversation(data: {
  creator_id: string
  name: string
  avatar_url?: string
  member_ids: string[]
}): ServerConversation {
  const allMembers = Array.from(new Set([data.creator_id, ...data.member_ids]))
  const groupConv: ServerConversation = {
    id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    participant_1_id: data.creator_id,
    participant_2_id: allMembers[1] || data.creator_id,
    is_group: true,
    group_name: data.name,
    group_avatar: data.avatar_url || "",
    group_members: allMembers,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  store.conversations.unshift(groupConv)
  saveStore()

  allMembers.forEach((memberId) => {
    notifyUser(memberId, { type: "conversation_created", payload: groupConv })
  })

  return groupConv
}

export function toggleArchiveConversation(conversationId: string, isArchived: boolean): boolean {
  const conv = store.conversations.find((c) => c.id === conversationId)
  if (!conv) return false

  conv.is_archived = isArchived
  saveStore()
  return true
}

export function deleteServerMessage(
  messageId: string,
  mode: "for_me" | "for_everyone" = "for_everyone",
  userId: string = ""
): { success: boolean; mode: string; message?: ServerMessage } {
  const msg = store.messages.find((m) => m.id === messageId)
  if (!msg) return { success: false, mode }

  const conv = store.conversations.find((c) => c.id === msg.conversation_id)
  const participants = conv
    ? conv.is_group && conv.group_members
      ? conv.group_members
      : [conv.participant_1_id, conv.participant_2_id]
    : []

  if (mode === "for_everyone") {
    // Delete for everyone: keep revoked placeholder, clear sensitive payload
    msg.is_deleted_for_everyone = true
    msg.content = "This message was deleted"
    msg.media_url = undefined
    msg.file_name = undefined
    msg.file_size = undefined
    msg.reactions = {}
    msg.is_starred = false
    msg.starred_by = []
    saveStore()

    // Real-time broadcast to all participants (direct or group)
    participants.forEach((pId) => {
      notifyUser(pId, { type: "message_updated", payload: msg })
    })

    return { success: true, mode: "for_everyone", message: msg }
  } else {
    // Delete for me: hide only for this specific user
    if (!Array.isArray(msg.deleted_for)) {
      msg.deleted_for = []
    }
    if (userId && !msg.deleted_for.includes(userId)) {
      msg.deleted_for.push(userId)
    }
    saveStore()

    if (userId) {
      notifyUser(userId, {
        type: "message_deleted",
        payload: { conversationId: msg.conversation_id, messageId, forMe: true },
      })
    }

    return { success: true, mode: "for_me", message: msg }
  }
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

export function deleteServerCall(callId: string): boolean {
  const initialLength = store.calls.length
  store.calls = store.calls.filter((c) => c.id !== callId)
  if (store.calls.length !== initialLength) {
    saveStore()
    return true
  }
  return false
}

export function clearServerCalls(userId: string): boolean {
  store.calls = store.calls.filter((c) => c.caller_id !== userId && c.receiver_id !== userId)
  saveStore()
  return true
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

// CHANNELS & COMMUNITIES
const DEFAULT_CHANNELS: ServerChannel[] = [
  {
    id: "chan_arixo",
    name: "Arixo",
    handle: "arixo",
    description: "The official Arixo channel. News, updates and product features.",
    avatar_url: "https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&auto=format&fit=crop&q=80",
    verified: true,
    followers_count: 148200000,
    followers: [],
    updates: [
      {
        id: "up_1",
        text: "Introducing Arixo Channels! A simple, reliable, and private way to receive important updates from people and organizations right inside Arixo.",
        time: "Today, 10:30 AM",
        reactions: { "💚": 124000, "🔥": 45000, "👏": 18000 },
      },
      {
        id: "up_2",
        text: "Now with end-to-end encrypted voice & video calls, disappearing messages, and rich photo editing across all your devices.",
        time: "Yesterday",
        reactions: { "❤️": 89000, "🎉": 34000 },
      },
    ],
  },
  {
    id: "chan_uefa",
    name: "UEFA Champions League",
    handle: "uefa_cl",
    description: "The home of the UEFA Champions League. Match updates, scores and behind the scenes.",
    avatar_url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80",
    verified: true,
    followers_count: 52400000,
    followers: [],
    updates: [
      {
        id: "up_uefa_1",
        text: "Matchday highlights and dramatic late winners! Watch all the goals and moments from this week's fixtures.",
        time: "2 hours ago",
        reactions: { "⚽": 67000, "🔥": 29000 },
      },
    ],
  },
  {
    id: "chan_tech",
    name: "Tech Radar & AI",
    handle: "techradar",
    description: "Daily insights into artificial intelligence, web development, and breaking tech news.",
    avatar_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80",
    verified: true,
    followers_count: 18900000,
    followers: [],
    updates: [
      {
        id: "up_tech_1",
        text: "Next.js 16 and real-time WebRTC are transforming browser communications with zero latency. Here is what you need to know.",
        time: "5 hours ago",
        reactions: { "🚀": 42000, "💡": 15000 },
      },
    ],
  },
]

const DEFAULT_COMMUNITIES: ServerCommunity[] = [
  {
    id: "comm_developers",
    name: "Global Software Engineers",
    description: "A community uniting 40,000+ engineers building modern real-time web and mobile applications.",
    avatar_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
    members_count: 42350,
    announcement_group: "Announcements & Keynotes",
    groups: [
      { id: "grp_react", name: "React & Next.js Ecosystem", member_count: 14200 },
      { id: "grp_webrtc", name: "WebRTC & Video Streaming", member_count: 8500 },
      { id: "grp_devops", name: "Cloud, CI/CD & Deployments", member_count: 6100 },
    ],
  },
  {
    id: "comm_neighborhood",
    name: "Greenwood Residency",
    description: "Official residential community forum for announcements, maintenance, and neighborhood events.",
    avatar_url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150&auto=format&fit=crop&q=80",
    members_count: 840,
    announcement_group: "Community Notice Board",
    groups: [
      { id: "grp_events", name: "Clubhouse & Social Events", member_count: 620 },
      { id: "grp_help", name: "Maintenance & Helpdesk", member_count: 510 },
    ],
  },
]

export function getServerChannels(userId?: string): ServerChannel[] {
  if (!store.channels || store.channels.length === 0) {
    store.channels = DEFAULT_CHANNELS
    saveStore()
  }
  return store.channels
}

export function toggleFollowChannel(channelId: string, userId: string): ServerChannel | null {
  const channels = getServerChannels()
  const chan = channels.find((c) => c.id === channelId)
  if (!chan) return null

  if (!chan.followers) chan.followers = []
  const idx = chan.followers.indexOf(userId)
  if (idx > -1) {
    chan.followers.splice(idx, 1)
    chan.followers_count = Math.max(0, chan.followers_count - 1)
  } else {
    chan.followers.push(userId)
    chan.followers_count += 1
  }

  saveStore()
  return chan
}

export function getServerCommunities(): ServerCommunity[] {
  if (!store.communities || store.communities.length === 0) {
    store.communities = DEFAULT_COMMUNITIES
    saveStore()
  }
  return store.communities
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
