import client from './client'

export const aiStudyAPI = {
  // Chat with AI study assistant
  chat: async (data) => {
    const response = await client.post('/ai-study/chat', data)
    return response.data
  },

  // Extract text from file
  extractText: async (fileId) => {
    const response = await client.get(`/ai-study/extract-text/${fileId}`)
    return response.data
  },

  // Generate study notes
  generateNotes: async (data) => {
    const response = await client.post('/ai-study/generate-notes', data)
    return response.data
  },

  // Generate quiz
  generateQuiz: async (data) => {
    const response = await client.post('/ai-study/generate-quiz', data)
    return response.data
  },

  // Summarize document
  summarizeDocument: async (data) => {
    const response = await client.post('/ai-study/summarize-document', data)
    return response.data
  },

  // Explain concept
  explainConcept: async (data) => {
    const response = await client.post('/ai-study/explain-concept', data)
    return response.data
  },

  // Upload file for AI processing
  uploadFile: async (formData) => {
    const response = await client.post('/ai-study/upload-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // Get AI status
  getStatus: async () => {
    const response = await client.get('/ai-study/status')
    return response.data
  }
}

