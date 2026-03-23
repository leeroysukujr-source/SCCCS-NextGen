/**
 * API functions for channel administration
 */
import { apiRequest } from './index'

export const channelAdminAPI = {
  updateMemberRole: async (channelId, userId, role) => {
    return apiRequest(`/channels/${channelId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
  },

  kickMember: async (channelId, userId) => {
    return apiRequest(`/channels/${channelId}/members/${userId}/kick`, {
      method: 'POST',
    })
  },

  muteMember: async (channelId, userId, durationHours) => {
    return apiRequest(`/channels/${channelId}/members/${userId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ duration_hours: durationHours }),
    })
  },

  unmuteMember: async (channelId, userId) => {
    return apiRequest(`/channels/${channelId}/members/${userId}/unmute`, {
      method: 'POST',
    })
  },

  getPinnedMessages: async (channelId) => {
    return apiRequest(`/channels/${channelId}/pinned`)
  },

  updateChannelSettings: async (channelId, settings) => {
    return apiRequest(`/channels/${channelId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
}

