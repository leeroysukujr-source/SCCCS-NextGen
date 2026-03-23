import client from './client'

export const feedbackAPI = {
  createFeedback: async (data) => {
    const response = await client.post('/feedback', data)
    return response.data
  },

  getFeedbacks: async () => {
    const response = await client.get('/feedback')
    return response.data
  },

  getFeedback: async (feedbackId) => {
    const response = await client.get(`/feedback/${feedbackId}`)
    return response.data
  },

  respondToFeedback: async (feedbackId, response) => {
    const responseData = await client.put(`/feedback/${feedbackId}/response`, { response })
    return responseData.data
  },

  updateFeedbackStatus: async (feedbackId, status) => {
    const response = await client.put(`/feedback/${feedbackId}/status`, { status })
    return response.data
  },

  deleteFeedback: async (feedbackId) => {
    const response = await client.delete(`/feedback/${feedbackId}`)
    return response.data
  },

  getStats: async () => {
    const response = await client.get('/feedback/stats')
    return response.data
  },

  broadcastFeedback: async (data) => {
    const response = await client.post('/feedback/broadcast', data)
    return response.data
  }
}

