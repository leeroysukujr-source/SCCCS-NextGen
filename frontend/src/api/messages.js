import client from './client'

export const messagesAPI = {
  createMessage: async (channelId, data) => {
    const response = await client.post(`/messages/channel/${channelId}`, data)
    return response.data
  },
  
  getMessages: async (channelId) => {
    const response = await client.get(`/messages/channel/${channelId}`)
    return response.data
  },
  
  updateMessage: async (messageId, data) => {
    const response = await client.put(`/messages/${messageId}`, data)
    return response.data
  },
  
  deleteMessage: async (messageId) => {
    const response = await client.delete(`/messages/${messageId}`)
    return response.data
  },
  
  getThreadMessages: async (messageId) => {
    const response = await client.get(`/messages/${messageId}/thread`)
    return response.data
  },
  
  // Schedule a message to be sent later
  scheduleMessage: async (channelId, data) => {
    const response = await client.post(`/messages/channel/${channelId}/schedule`, data)
    return response.data
  },

  getScheduledMessages: async (channelId) => {
    const response = await client.get(`/messages/channel/${channelId}/scheduled`)
    return response.data
  },

  cancelScheduledMessage: async (scheduledId) => {
    const response = await client.post(`/messages/scheduled/${scheduledId}/cancel`)
    return response.data
  },
}

