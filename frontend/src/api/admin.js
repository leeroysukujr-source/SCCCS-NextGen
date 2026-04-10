import client from './client'

export const adminAPI = {
  broadcastEmail: async (data) => {
    const response = await client.post('admin/broadcast-email', data)
    return response.data
  },
  
  getEmailConfig: async () => {
    const response = await client.get('admin/email-config')
    return response.data
  },
  listTwoFactorAudits: async (page = 1, per_page = 25) => {
    const response = await client.get(`admin/twofactor/audits?page=${page}&per_page=${per_page}`)
    return response.data
  },
}

