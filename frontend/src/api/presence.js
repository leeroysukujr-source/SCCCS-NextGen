import client from './client'

export const presenceAPI = {
    updatePresence: async (data) => {
        // Use the global 60s timeout to handle Render cold starts/latency
        const response = await client.post('presence/update', data)
        return response.data
    },

    getOnlineUsers: async () => {
        const response = await client.get('presence/online')
        return response.data
    },

    getUserPresence: async (userId) => {
        const response = await client.get(`presence/${userId}`)
        return response.data
    }
}

export default presenceAPI
