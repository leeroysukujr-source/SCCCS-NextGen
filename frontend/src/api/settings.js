import client from './client'

export const settingsAPI = {
  getPlatformSettings: async () => {
    const response = await client.get('/settings/platform')
    return response.data
  },

  updatePlatformSetting: async (data) => {
    const response = await client.put('/settings/platform', data)
    return response.data
  },

  getInstitutionalSettings: async (workspaceId) => {
    const response = await client.get(`/settings/institutional/${workspaceId}`)
    return response.data
  },

  updateInstitutionalSetting: async (workspaceId, data) => {
    const response = await client.put(`/settings/institutional/${workspaceId}`, data)
    return response.data
  }
}
