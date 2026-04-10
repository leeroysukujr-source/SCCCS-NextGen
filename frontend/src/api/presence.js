import client from './client'

export const presenceAPI = {
    updatePresence: async (data) => {
        // Use a short 5s timeout so a slow DB never blocks the main thread
        // Errors are swallowed upstream with .catch()
        const response = await client.post('presence/update', data, { timeout: 5000 })
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
