import client from './client'

export const gpaAPI = {
  getGpa: async () => {
    const response = await client.get('/gpa')
    return response.data
  },

  saveGpa: async (payload) => {
    const response = await client.put('/gpa', payload)
    return response.data
  }
}

export default gpaAPI
