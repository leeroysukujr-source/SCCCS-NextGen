import createSocket from '../utils/socketClient'
import { getSocketUrl } from '../utils/api'

// Centralized socket helper
let socketInstance = null
const eventQueue = []

export const initSocket = (token) => {
    if (socketInstance) {
        if (socketInstance.disconnected) {
            socketInstance.connect()
        }
        return socketInstance
    }

    const socketUrl = getSocketUrl()
    socketInstance = createSocket(socketUrl, token)

    // Process queued listeners
    while (eventQueue.length > 0) {
        const { event, callback } = eventQueue.shift()
        socketInstance.on(event, callback)
    }

    return socketInstance
}

export const getSocket = () => socketInstance

// Proxy to allow importing 'socket' and calling .on() even before init
export const socket = {
    on: (event, callback) => {
        if (socketInstance) {
            socketInstance.on(event, callback)
        } else {
            eventQueue.push({ event, callback })
        }
    },
    off: (event, callback) => {
        if (socketInstance) {
            socketInstance.off(event, callback)
        } else {
            const index = eventQueue.findIndex(q => q.event === event && q.callback === callback)
            if (index > -1) eventQueue.splice(index, 1)
        }
    },
    emit: (event, data) => {
        if (socketInstance) {
            socketInstance.emit(event, data)
        } else {
            console.warn('[Socket] Attempted to emit before initialization:', event)
        }
    }
}
