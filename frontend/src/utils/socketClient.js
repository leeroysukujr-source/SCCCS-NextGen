import { io } from 'socket.io-client'

export function createSocket(socketUrl, token) {
  if (!socketUrl) throw new Error('socketUrl required')
  // Allow admin to force polling-only via localSystem settings (useful for proxy/debug)
  let transports = ['websocket', 'polling']
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
    timeout: 20000,
    upgrade: true,
    forceNew: false,
  })

  // Attach engine-level listeners when available to surface low-level issues
  try {
    const engine = socket.io && socket.io.engine
    if (engine && typeof engine.on === 'function') {
      engine.on('upgradeError', (err) => {
        console.warn('[SocketClient] engine upgradeError', err)
      })

      engine.on('packet', (pkt) => {
        // noop: available for debugging when needed
      })
    }
  } catch (e) {
    // ignore in environments where engine not exposed
  }

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
