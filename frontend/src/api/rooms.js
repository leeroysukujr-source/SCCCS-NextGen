import client from './client'
import { getApiUrl } from '../utils/api'

export const roomsAPI = {
  createRoom: async (data) => {
    const response = await client.post('/rooms', data)
    return response.data
  },
  
  createScheduledMeeting: async (data) => {
    const response = await client.post('/rooms', {
      ...data,
      meeting_type: 'scheduled'
    })
    return response.data
  },
  
  getRooms: async () => {
    const response = await client.get('/rooms')
    return response.data
  },
  
  getRoom: async (roomId) => {
    const response = await client.get(`/rooms/${roomId}`)
    return response.data
  },
  
  joinRoom: async (roomCode) => {
    const response = await client.post(`/rooms/join/${roomCode}`)
    return response.data
  },
  
  getRoomByCode: async (roomCode) => {
    // Public endpoint - no auth required
    const apiURL = getApiUrl()
    const response = await fetch(`${apiURL}/rooms/join/${roomCode}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Room not found')
    }
    return response.json()
  },
  
  getPublicRoom: async (roomId) => {
    // Public endpoint - no auth required
    const apiURL = getApiUrl()
    const response = await fetch(`${apiURL}/rooms/public/${roomId}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Room not found')
    }
    return response.json()
  },
  
  leaveRoom: async (roomId) => {
    const response = await client.post(`/rooms/${roomId}/leave`)
    return response.data
  },
  
  getParticipants: async (roomId) => {
    const response = await client.get(`/rooms/${roomId}/participants`)
    return response.data
  },
  
  getMeetingLink: async (roomId) => {
    const response = await client.get(`/rooms/${roomId}/link`)
    return response.data
  },
  
  createDirectRoom: async (userId, callType = 'video') => {
    // Create a direct meeting room between two users
    const response = await client.post('/rooms', {
      name: `Direct ${callType === 'video' ? 'Video' : 'Voice'} Call`,
      meeting_type: 'direct',
      participants: [userId],
      max_participants: 2
    })
    return response.data
  },
  
  getAllRooms: async () => {
    // Admin only - get all rooms
    const response = await client.get('/rooms/all')
    return response.data
  },
  
  deleteRoom: async (roomId) => {
    // Admin or host only - delete a room
    const response = await client.delete(`/rooms/${roomId}`)
    return response.data
  },
}

