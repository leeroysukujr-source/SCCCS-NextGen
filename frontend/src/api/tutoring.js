import client from './client'

export const tutoringAPI = {
    // Get all tutors (optional filters)
    getTutors: async (filters = {}) => {
        const params = new URLSearchParams(filters)
        const response = await client.get(`/tutoring/tutors?${params.toString()}`)
        return response.data
    },

    // Get specific tutor profile
    getTutorProfile: async (id) => {
        const response = await client.get(`/tutoring/tutors/${id}`)
        return response.data
    },

    // Register as tutor
    registerTutor: async (data) => {
        const response = await client.post('/tutoring/tutors', data)
        return response.data
    },

    // Book a session
    bookSession: async (tutorProfileId, data) => {
        // data: { subject, scheduled_at }
        const response = await client.post(`/tutoring/tutors/${tutorProfileId}/book`, data)
        return response.data
    },

    // Get my sessions
    getMySessions: async () => {
        const response = await client.get('/tutoring/sessions')
        return response.data
    },

    // Update session status
    updateSession: async (sessionId, status) => {
        const response = await client.put(`/tutoring/sessions/${sessionId}`, { status })
        return response.data
    }
}
