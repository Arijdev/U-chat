type SignalingMessage = {
  type: string
  from?: string
  to?: string
  conversationId?: string
  payload?: any
  sdp?: any
  candidate?: any
  callType?: string
  fromName?: string
  [key: string]: any
}

const signalingListeners = new Map<string, Set<(msg: SignalingMessage) => void>>()

// Global dispatcher to notify listeners for a given user
export function dispatchSignalingMessage(userId: string, msg: SignalingMessage) {
  const listeners = signalingListeners.get(userId)
  if (listeners) {
    listeners.forEach((fn) => {
      try {
        fn(msg)
      } catch (err) {
        console.warn("[signaling] listener error", err)
      }
    })
  }
}

/**
 * Universal signaling client.
 * Dispatches via BroadcastChannel for same-origin tabs and /api/chat/signaling for cross-client/device delivery.
 */
export function createSignaling(userId: string) {
  if (!signalingListeners.has(userId)) {
    signalingListeners.set(userId, new Set())
  }

  let broadcastChannel: BroadcastChannel | null = null
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      broadcastChannel = new BroadcastChannel(`uchat_signaling_${userId}`)
      broadcastChannel.onmessage = (event) => {
        if (event.data) {
          dispatchSignalingMessage(userId, event.data)
        }
      }
    } catch (e) {}
  }

  const addListener = (fn: (msg: SignalingMessage) => void) => {
    signalingListeners.get(userId)?.add(fn)
    return () => {
      signalingListeners.get(userId)?.delete(fn)
    }
  }

  const send = async (msg: SignalingMessage) => {
    // 1. Post to BroadcastChannel if recipient is on same device
    if (msg.to && typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const targetBc = new BroadcastChannel(`uchat_signaling_${msg.to}`)
        targetBc.postMessage(msg)
        targetBc.close()
      } catch (e) {}
    }

    // 2. Post to server endpoint for SSE delivery
    try {
      await fetch("/api/chat/signaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      })
    } catch (err) {
      console.warn("[signaling] send error", err)
    }
  }

  const close = async () => {
    try {
      broadcastChannel?.close()
    } catch (err) {}
  }

  return { send, addListener, close }
}
