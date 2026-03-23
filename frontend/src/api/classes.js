import client from './client'

export const classesAPI = {
  createClass: async (data) => {
    try {
      const response = await client.post('/classes', data)
      return response.data
    } catch (error) {
      console.error('[classesAPI.createClass] Error:', error)
      console.error('[classesAPI.createClass] Response:', error.response)
      throw error
    }
  },
  
  getClasses: async () => {
    const response = await client.get('/classes')
    return response.data
  },
  
  getClass: async (classId) => {
    const response = await client.get(`/classes/${classId}`)
    return response.data
  },
  
  joinClass: async (classCode) => {
    const response = await client.post(`/classes/join/${classCode}`)
    return response.data
  },
  
  getMembers: async (classId) => {
    const response = await client.get(`/classes/${classId}/members`)
    return response.data
  },
  
  getAllClasses: async () => {
    // Admin only - get all classes
    const response = await client.get('/classes/all')
    return response.data
  },
  
  deleteClass: async (classId) => {
    // Admin or teacher only - delete a class
    const response = await client.delete(`/classes/${classId}`)
    return response.data
  },
}

