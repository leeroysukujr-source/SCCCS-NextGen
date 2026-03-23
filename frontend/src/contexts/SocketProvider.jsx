import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { getSocketUrl } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { initSocket } from '../api/socket'

const SocketContext = createContext({ socket: null, status: 'disconnected', reconnect: () => { }, disconnect: () => { } })

export function SocketProvider({ children }) {
  const { token } = useAuthStore()
  const [socket, setSocket] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) {
      // ensure socket cleaned up when no token
      if (socketRef.current) {
        try { socketRef.current.close() } catch (e) { }
        socketRef.current = null
        setSocket(null)
        setStatus('disconnected')
      }
      return
    }

    const socketUrl = getSocketUrl()
    let s
    try {
      s = initSocket(token)
    } catch (e) {
      console.error('[SocketProvider] Failed to create socket', e)
      return
    }

    socketRef.current = s
    setSocket(s)

    // Ensure it is attempting to connect
    if (s.disconnected) {
      try { s.connect() } catch (e) { console.warn(e) }
    }

    setStatus(s.connected ? 'connected' : 'connecting')

    const onConnect = () => setStatus('connected')
    const onDisconnect = (reason) => setStatus('disconnected')
    const onConnectError = (err) => {
      console.warn('[SocketProvider] connect_error', err)
      setStatus('error')
    }

    const onBrandingUpdate = (data) => {
      console.log('[SocketProvider] Workspace branding updated:', data)
      const { refreshUser } = useAuthStore.getState()
      refreshUser()
    }

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('connect_error', onConnectError)
    s.on('workspace_branding_updated', onBrandingUpdate)

    return () => {
      try {
        s.off('connect', onConnect)
        s.off('disconnect', onDisconnect)
        s.off('connect_error', onConnectError)
        s.off('workspace_branding_updated', onBrandingUpdate)
      } catch (e) { }
      try { s.close() } catch (e) { }
      socketRef.current = null
      setSocket(null)
      setStatus('disconnected')
    }
  }, [token])

  const reconnect = () => {
    if (socketRef.current && typeof socketRef.current.connect === 'function') {
      try { socketRef.current.connect() } catch (e) { console.warn(e) }
    }
  }

  const disconnect = () => {
    if (socketRef.current && typeof socketRef.current.close === 'function') {
      try { socketRef.current.close() } catch (e) { console.warn(e) }
    }
  }

  return (
    <SocketContext.Provider value={{ socket, status, reconnect, disconnect }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}

export default SocketProvider
