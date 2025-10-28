import { createClient as createSupabaseClient } from "@/lib/supabase/client"

type SignalingMessage = {
  type: string
  from?: string
  to?: string
  conversationId?: string
  payload?: any
  [key: string]: any
}

/**
 * Supabase-backed signaling client.
 * Uses a Postgres table `webrtc_signaling` to insert messages and subscribes to INSERTs
 * filtered by recipient. This allows running the app entirely on Vercel + Supabase.
 */
export function createSignaling(userId: string) {
  const supabase = createSupabaseClient()

  const listeners: Array<(msg: SignalingMessage) => void> = []

  const addListener = (fn: (msg: SignalingMessage) => void) => {
    listeners.push(fn)
    return () => {
      const idx = listeners.indexOf(fn)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }

  const send = async (msg: SignalingMessage) => {
    try {
      await supabase.from('webrtc_signaling').insert({
        conversation_id: msg.conversationId || null,
        from_id: msg.from || null,
        to_id: msg.to || null,
        type: msg.type,
        payload: msg.payload || null,
      })
    } catch (err) {
      console.warn('[v0] Signaling insert failed', err)
    }
  }

  // subscribe to new signaling rows intended for this user
  const channel = supabase
    .channel(`webrtc_signaling:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signaling',
        filter: `to_id=eq.${userId}`,
      },
      (payload) => {
        try {
          const newRow = payload.new
          const msg: SignalingMessage = {
            type: newRow.type,
            from: newRow.from_id,
            to: newRow.to_id,
            conversationId: newRow.conversation_id,
            payload: newRow.payload,
          }
          listeners.forEach((l) => {
            try {
              l(msg)
            } catch (err) {
              console.warn('[v0] signaling listener error', err)
            }
          })
        } catch (err) {
          console.warn('[v0] signaling payload error', err)
        }
      },
    )
    .subscribe((status) => {
      console.log('[v0] signaling subscription status:', status)
    })

  const close = async () => {
    try {
      await channel.unsubscribe()
    } catch (err) {
      // ignore
    }
  }

  return { send, addListener, close }
}
