import { io } from 'socket.io-client'

export function createSocket(socketUrl, token) {
  if (!socketUrl) throw new Error('socketUrl required')
  
  // Strategy: Force WebSocket transport exclusively (Senior Architect Requirement).
  // Polling often causes CORS handshaking issues behind cloud proxies like Render.
  let transports = ['websocket']

  const socket = io(socketUrl, {
    auth: { token },
    transports,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 45000, // Handle cold starts/latency
    upgrade: true, 
    forceNew: false,
  })

  // Attach engine-level listeners
  try {
    const engine = socket.io && socket.io.engine
    if (engine && typeof engine.on === 'function') {
      engine.on('upgradeError', (err) => {
        console.warn('[SocketClient] engine upgradeError', err)
      })
    }
  } catch (e) { /* ignore */ }

  // Better error logging
  socket.on('connect_error', (err) => {
    console.warn('[SocketClient] connect_error', err && err.message ? err.message : err)
  })

  socket.on('error', (err) => {
    console.warn('[SocketClient] error', err)
  })

  return socket
}

export default createSocket
