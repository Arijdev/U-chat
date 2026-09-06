"use client"

export interface DatasetProfile {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  status?: string
}

export interface DatasetConversation {
  id: string
  participant_1_id: string
  participant_2_id: string
  created_at: string
  updated_at: string
  participant_1?: DatasetProfile
  participant_2?: DatasetProfile
}

export interface DatasetMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  media_url?: string
  is_encrypted: boolean
  created_at: string
}

const STORAGE_KEY_PROFILES = "u_chat_dataset_profiles"
const STORAGE_KEY_CONVERSATIONS = "u_chat_dataset_conversations"
const STORAGE_KEY_MESSAGES_PREFIX = "u_chat_msgs_"
const SYNC_CHANNEL_NAME = "u_chat_dataset_sync"

export const DEFAULT_PROFILES: DatasetProfile[] = [
  {
    id: "profile-wowarij-default-id",
    email: "wowarij@gmail.com",
    display_name: "Wow Arij",
    avatar_url: "",
    status: "online",
  },
  {
    id: "profile-arij-chowdhuryr-default-id",
    email: "arij.chowdhuryr@gmail.com",
    display_name: "Arij Chowdhury",
    avatar_url: "",
    status: "online",
  },
]

export function getKnownProfiles(): DatasetProfile[] {
  if (typeof window === "undefined") return DEFAULT_PROFILES

  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROFILES)
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_PROFILES))
      return DEFAULT_PROFILES
    }
    const parsed: DatasetProfile[] = JSON.parse(stored)
    // Ensure default profiles exist in the map
    const map = new Map<string, DatasetProfile>()
    DEFAULT_PROFILES.forEach((p) => map.set(p.email.toLowerCase(), p))
    parsed.forEach((p) => map.set(p.email.toLowerCase(), p))
    return Array.from(map.values())
  } catch (e) {
    return DEFAULT_PROFILES
  }
}

export function registerProfile(profile: Partial<DatasetProfile> & { id: string; email: string }): DatasetProfile {
  const all = getKnownProfiles()
  const emailLower = profile.email.toLowerCase()
  const existingIdx = all.findIndex((p) => p.email.toLowerCase() === emailLower)

  const updated: DatasetProfile = {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name || profile.email.split("@")[0],
    avatar_url: profile.avatar_url || "",
    status: profile.status || "online",
  }

  if (existingIdx >= 0) {
    // Update existing
    all[existingIdx] = { ...all[existingIdx], ...updated }
  } else {
    all.push(updated)
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(all))
      broadcastSyncEvent("profile_updated", updated)
    } catch (e) {}
  }

  return updated
}

export function searchProfiles(query: string, excludeUserId?: string): DatasetProfile[] {
  const all = getKnownProfiles()
  const q = query.toLowerCase().trim()

  return all.filter((p) => {
    if (excludeUserId && p.id === excludeUserId) return false
    return (
      p.email.toLowerCase().includes(q) ||
      (p.display_name && p.display_name.toLowerCase().includes(q))
    )
  })
}

export function getProfileById(id: string): DatasetProfile | undefined {
  return getKnownProfiles().find((p) => p.id === id)
}

export function getProfileByEmail(email: string): DatasetProfile | undefined {
  return getKnownProfiles().find((p) => p.email.toLowerCase() === email.toLowerCase())
}

export function getLocalConversations(userId: string): DatasetConversation[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSATIONS)
    if (!raw) return []
    const all: DatasetConversation[] = JSON.parse(raw)
    const profiles = getKnownProfiles()
    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    return all
      .filter((c) => c.participant_1_id === userId || c.participant_2_id === userId)
      .map((c) => ({
        ...c,
        participant_1: c.participant_1 || profileMap.get(c.participant_1_id),
        participant_2: c.participant_2 || profileMap.get(c.participant_2_id),
      }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  } catch (e) {
    return []
  }
}

export function saveLocalConversation(conv: Partial<DatasetConversation> & { participant_1_id: string; participant_2_id: string }): DatasetConversation {
  if (typeof window === "undefined") {
    return conv as DatasetConversation
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSATIONS)
    const all: DatasetConversation[] = raw ? JSON.parse(raw) : []

    // Check if conversation already exists between these 2 users
    const existing = all.find(
      (c) =>
        (c.participant_1_id === conv.participant_1_id && c.participant_2_id === conv.participant_2_id) ||
        (c.participant_1_id === conv.participant_2_id && c.participant_2_id === conv.participant_1_id)
    )

    if (existing) {
      return existing
    }

    const newConv: DatasetConversation = {
      id: conv.id || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      participant_1_id: conv.participant_1_id,
      participant_2_id: conv.participant_2_id,
      created_at: conv.created_at || new Date().toISOString(),
      updated_at: conv.updated_at || new Date().toISOString(),
    }

    all.unshift(newConv)
    localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(all))
    broadcastSyncEvent("conversation_created", newConv)
    return newConv
  } catch (e) {
    return conv as DatasetConversation
  }
}

export function getLocalMessages(conversationId: string): DatasetMessage[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_MESSAGES_PREFIX}${conversationId}`)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

export function saveLocalMessage(conversationId: string, message: DatasetMessage): void {
  if (typeof window === "undefined") return

  try {
    const key = `${STORAGE_KEY_MESSAGES_PREFIX}${conversationId}`
    const raw = localStorage.getItem(key)
    const all: DatasetMessage[] = raw ? JSON.parse(raw) : []

    if (!all.some((m) => m.id === message.id)) {
      all.push(message)
      localStorage.setItem(key, JSON.stringify(all))
    }

    // Update conversation updated_at
    const rawConvs = localStorage.getItem(STORAGE_KEY_CONVERSATIONS)
    if (rawConvs) {
      const convs: DatasetConversation[] = JSON.parse(rawConvs)
      const target = convs.find((c) => c.id === conversationId)
      if (target) {
        target.updated_at = message.created_at || new Date().toISOString()
        localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(convs))
      }
    }

    broadcastSyncEvent("message_inserted", { conversationId, message })
  } catch (e) {}
}

export function deleteLocalMessage(conversationId: string, messageId: string): void {
  if (typeof window === "undefined") return

  try {
    const key = `${STORAGE_KEY_MESSAGES_PREFIX}${conversationId}`
    const raw = localStorage.getItem(key)
    if (!raw) return
    const all: DatasetMessage[] = JSON.parse(raw)
    const filtered = all.filter((m) => m.id !== messageId)
    localStorage.setItem(key, JSON.stringify(filtered))
    broadcastSyncEvent("message_deleted", { conversationId, messageId })
  } catch (e) {}
}

let syncBroadcastChannel: BroadcastChannel | null = null

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null
  if (!syncBroadcastChannel) {
    syncBroadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME)
  }
  return syncBroadcastChannel
}

export function broadcastSyncEvent(type: string, payload: any): void {
  try {
    const channel = getBroadcastChannel()
    channel?.postMessage({ type, payload })
    // Also trigger custom window event for same-tab updates
    window.dispatchEvent(new CustomEvent("u_chat_local_sync", { detail: { type, payload } }))
  } catch (e) {}
}

export function listenToSyncEvents(callback: (type: string, payload: any) => void): () => void {
  if (typeof window === "undefined") return () => {}

  const handleChannelMsg = (event: MessageEvent) => {
    if (event.data && event.data.type) {
      callback(event.data.type, event.data.payload)
    }
  }

  const handleWindowMsg = (event: Event) => {
    const custom = event as CustomEvent
    if (custom.detail && custom.detail.type) {
      callback(custom.detail.type, custom.detail.payload)
    }
  }

  const channel = getBroadcastChannel()
  channel?.addEventListener("message", handleChannelMsg)
  window.addEventListener("u_chat_local_sync", handleWindowMsg)

  return () => {
    channel?.removeEventListener("message", handleChannelMsg)
    window.removeEventListener("u_chat_local_sync", handleWindowMsg)
  }
}
