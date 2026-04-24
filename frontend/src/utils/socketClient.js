import { io } from 'socket.io-client'

export function createSocket(socketUrl, token) {
  if (!socketUrl) throw new Error('socketUrl required')
  
  // Strategy: In production, we prefer 'websocket' only to avoid session-affinity (sticky session)
  // issues on Render's load balancer. In development, we use both for maximum compatibility.
  const isProd = import.meta.env.PROD
  let transports = isProd ? ['websocket'] : ['polling', 'websocket']
  
  try {
    const sys = JSON.parse(localStorage.getItem('system_settings') || '{}')
    if (sys && sys.wsPollingOnly) transports = ['polling']
  } catch (e) { /* ignore */ }

  const socket = io(socketUrl, {
    auth: { token },
    transports,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 45000, // Handle cold starts/latency
    upgrade: !isProd, // In prod, we jump straight to WS
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
