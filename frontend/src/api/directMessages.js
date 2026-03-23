import client from './client'

export const directMessagesAPI = {
  sendMessage: async (recipientId, data) => {
    const response = await client.post(`/direct-messages/conversation/${recipientId}`, data)
    return response.data
  },

  getConversation: async (otherUserId) => {
    const response = await client.get(`/direct-messages/conversation/${otherUserId}`)
    return response.data
  },

  getConversations: async () => {
    const response = await client.get('/direct-messages/conversations')
    return response.data
  },

  markAsRead: async (messageId) => {
    const response = await client.put(`/direct-messages/${messageId}/read`)
    return response.data
  },

  deleteMessage: async (messageId) => {
    const response = await client.delete(`/direct-messages/${messageId}`)
    return response.data
  },

  updateMessage: async (messageId, data) => {
    const response = await client.put(`/direct-messages/${messageId}`, data)
    return response.data
  },

  scheduleMessage: async (recipientId, data) => {
    const response = await client.post(`/direct-messages/conversation/${recipientId}/schedule`, data)
    return response.data
  }
}

