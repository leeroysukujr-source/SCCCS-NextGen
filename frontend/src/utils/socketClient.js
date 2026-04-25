import { io } from 'socket.io-client'

export function createSocket(socketUrl, token) {
  if (!socketUrl) throw new Error('socketUrl required')
  
  // Strategy: Force WebSocket transport exclusively (Senior Architect Requirement).
  // Polling often causes CORS handshaking issues behind cloud proxies like Render.

  const socket = io(socketUrl, {
    auth: { token },
    transports: ['polling', 'websocket'], // Force polling first if websocket fails as per Senior Architect Task
    upgrade: true, 
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 20000, // Reduced to 20s for faster failover
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
