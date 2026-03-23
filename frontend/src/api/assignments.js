import client from './client'

export const assignmentsAPI = {
    getAssignments: async (channelId = null) => {
        const url = channelId ? `/assignments/?channel_id=${channelId}` : '/assignments/'
        const response = await client.get(url)
        return response.data
    },

    getAssignment: async (id) => {
        const response = await client.get(`/assignments/${id}`)
        return response.data
    },

    createAssignment: async (data) => {
        const response = await client.post('/assignments/', data)
        return response.data
    },

    updateAssignment: async (id, data) => {
        const response = await client.put(`/assignments/${id}`, data)
        return response.data
    },

    createGroups: async (assignmentId, data) => {
        const response = await client.post(`/assignments/${assignmentId}/groups`, data)
        return response.data
    },

    getAssignmentGroups: async (assignmentId) => {
        const response = await client.get(`/assignments/${assignmentId}/groups`)
        return response.data
    },

    joinGroup: async (groupId) => {
        const response = await client.post(`/assignments/groups/${groupId}/join`)
        return response.data
    },

    generateReport: async (assignmentId) => {
        const response = await client.post(`/assignments/${assignmentId}/generate_report`)
        return response.data
    },

    autoAllocate: async (assignmentId) => {
        const response = await client.post(`/assignments/${assignmentId}/auto-allocate`)
        return response.data
    }
}
