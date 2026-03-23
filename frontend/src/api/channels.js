import client from './client'

export const channelsAPI = {
  createChannel: async (data) => {
    const response = await client.post('/channels', data)
    return response.data
  },

  getChannels: async () => {
    const response = await client.get('/channels')
    return response.data
  },

  getChannel: async (channelId) => {
    const response = await client.get(`/channels/${channelId}`)
    return response.data
  },

  joinChannel: async (channelId) => {
    const response = await client.post(`/channels/${channelId}/join`)
    return response.data
  },

  leaveChannel: async (channelId) => {
    const response = await client.post(`/channels/${channelId}/leave`)
    return response.data
  },

  getMembers: async (channelId) => {
    const response = await client.get(`/channels/${channelId}/members`)
    return response.data
  },

  deleteChannel: async (channelId) => {
    const response = await client.delete(`/channels/${channelId}`)
    return response.data
  },

  updateMemberRole: async (channelId, userId, role) => {
    const response = await client.put(`/channels/${channelId}/members/${userId}/role`, { role })
    return response.data
  },

  updateChannel: async (channelId, data) => {
    const response = await client.put(`/channels/${channelId}`, data)
    return response.data
  },

  getShareLink: async (channelId) => {
    const response = await client.get(`/channels/${channelId}/share-link`)
    return response.data
  },

  generateShareLink: async (channelId, { qr = false, regen = false } = {}) => {
    const params = []
    if (qr) params.push('qr=1')
    if (regen) params.push('regen=1')
    const qs = params.length ? `?${params.join('&')}` : ''
    const response = await client.get(`/channels/${channelId}/share-link${qs}`)
    return response.data
  },

  addMember: async (channelId, { user_id, email }) => {
    const response = await client.post(`/channels/${channelId}/members/add`, { user_id, email })
    return response.data
  },

  createInvite: async (channelId, data) => {
    const response = await client.post(`/channels/${channelId}/invites`, data)
    return response.data
  },

  listInvites: async (channelId) => {
    const response = await client.get(`/channels/${channelId}/invites`)
    return response.data
  },

  revokeInvite: async (channelId, token) => {
    const response = await client.delete(`/channels/${channelId}/invites/${token}`)
    return response.data
  },

  joinViaInvite: async (token) => {
    const response = await client.post(`/join-invite/${token}`)
    return response.data
  },

  uploadAvatar: async (channelId, file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await client.post(`/channels/${channelId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  joinViaShareCode: async (shareCode) => {
    const response = await client.post(`/channels/join/${shareCode}`)
    return response.data
  },

  getAvailable: async () => {
    const response = await client.get('/channels/available')
    return response.data
  },
}

