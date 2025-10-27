const WebSocket = require('ws')

const port = process.env.SIGNALING_PORT || 8080
const wss = new WebSocket.Server({ port })

// Map of userId -> ws
const clients = new Map()

console.log(` Signaling server starting on ws://0.0.0.0:${port}`)

wss.on('connection', (ws) => {
  let registeredUserId = null

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === 'register' && msg.userId) {
        registeredUserId = msg.userId
        clients.set(registeredUserId, ws)
        console.log(` Registered user ${registeredUserId}`)
        return
      }

      // Forward messages to target if possible
      if (msg.to) {
        const targetWs = clients.get(msg.to)
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify(msg))
          return
        }
      }

      // If no recipient or not registered, optionally broadcast (fallback)
      // For now, ignore
    } catch (err) {
      console.error(' Invalid message', err)
    }
  })

  ws.on('close', () => {
    if (registeredUserId) {
      clients.delete(registeredUserId)
      console.log(` Unregistered user ${registeredUserId}`)
    }
  })
})

process.on('SIGINT', () => process.exit())
