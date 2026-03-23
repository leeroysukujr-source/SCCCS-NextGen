/**
 * API functions for advanced message actions (reactions, read receipts, pinning, forwarding)
 */
import { apiRequest } from './index'

export const messageActionsAPI = {
  // Reactions
  addReaction: async (messageId, emoji) => {
    return apiRequest(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    })
  },

  // Read receipts
  markAsRead: async (messageId) => {
    return apiRequest(`/messages/${messageId}/read`, {
      method: 'POST',
    })
  },

  // Pinning
  pinMessage: async (messageId, note) => {
    return apiRequest(`/messages/${messageId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    })
  },

  unpinMessage: async (messageId) => {
    return apiRequest(`/messages/${messageId}/unpin`, {
      method: 'POST',
    })
  },

  // Forwarding
  forwardMessage: async (messageId, channelId) => {
    return apiRequest(`/messages/${messageId}/forward`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId }),
    })
  },

  // Edit history
  getEditHistory: async (messageId) => {
    return apiRequest(`/messages/${messageId}/edit-history`)
  },
}

