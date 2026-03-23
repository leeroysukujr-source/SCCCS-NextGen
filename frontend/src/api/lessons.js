import client from './client'

export const lessonsAPI = {
  createLesson: async (classId, data) => {
    const response = await client.post(`/lessons/class/${classId}`, data)
    return response.data
  },
  
  getLessons: async (classId) => {
    const response = await client.get(`/lessons/class/${classId}`)
    return response.data
  },
  
  getLesson: async (lessonId) => {
    const response = await client.get(`/lessons/${lessonId}`)
    return response.data
  },
  
  updateLesson: async (lessonId, data) => {
    const response = await client.put(`/lessons/${lessonId}`, data)
    return response.data
  },
  
  deleteLesson: async (lessonId) => {
    const response = await client.delete(`/lessons/${lessonId}`)
    return response.data
  },
  
  getLessonMaterials: async (lessonId) => {
    const response = await client.get(`/lessons/${lessonId}/materials`)
    return response.data
  },
}

