import client from './client'

export const aiAPI = {
  analyze: async (text, mode = 'hybrid') => {
    const response = await client.post('/ai/analyze', { text, mode })
    return response.data
  },
  
  summarize: async (text) => {
    const response = await client.post('/ai/summarize', { text })
    return response.data
  },
  
  suggest: async (text, context = '') => {
    const response = await client.post('/ai/suggest', { text, context })
    return response.data
  },
  
  getStatus: async () => {
    const response = await client.get('/ai/status')
    return response.data
  },
}

