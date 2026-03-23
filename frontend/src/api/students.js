import client from './client'

export const studentsAPI = {
  getStudents: async () => {
    const response = await client.get('/users/students')
    return response.data
  },
  
  addStudent: async (studentData) => {
    const response = await client.post('/users/students', studentData)
    return response.data
  },
  
  removeStudent: async (studentId) => {
    const response = await client.delete(`/users/students/${studentId}`)
    return response.data
  },
  
  updateStudent: async (studentId, studentData) => {
    const response = await client.put(`/users/students/${studentId}`, studentData)
    return response.data
  },
}

