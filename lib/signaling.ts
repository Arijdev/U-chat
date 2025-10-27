type SignalingMessage = {
  type: string
  from?: string
  to?: string
  [key: string]: any
}

export function createSignaling(userId: string) {
  const url = (process.env.NEXT_PUBLIC_SIGNALING_URL as string) || `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8080`
  const ws = new WebSocket(url)

  const listeners: Array<(msg: SignalingMessage) => void> = []

  const addListener = (fn: (msg: SignalingMessage) => void) => {
    listeners.push(fn)
    return () => {
      const idx = listeners.indexOf(fn)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }

  const send = (msg: SignalingMessage) => {
    try {
      ws.send(JSON.stringify(msg))
    } catch (err) {
      console.warn(' Signaling send failed', err)
    }
  }

  ws.addEventListener('open', () => {
    // register this connection with the server
    send({ type: 'register', userId })
    console.log(' Signaling connected to', url)
  })

  ws.addEventListener('message', (ev) => {
    try {
      const msg: SignalingMessage = JSON.parse(ev.data as string)
      listeners.forEach((l) => {
        try {
          l(msg)
        } catch (err) {
          console.warn(' signaling listener error', err)
        }
      })
    } catch (err) {
      console.warn(' Invalid signaling message', err)
    }
  })

  const close = () => {
    try {
      ws.close()
    } catch (err) {}
  }

  return { ws, send, close, addListener }
}
