import client from './client'

export const workspaceAPI = {
    getBranding: async (slug) => {
        const response = await client.get(`/branding/workspace/${slug}`)
        return response.data
    },

    get: async (wsId) => {
        const response = await client.get(`/superadmin/workspaces/${wsId}`)
        return response.data
    },

    list: async () => {
        const response = await client.get('/superadmin/workspaces')
        return response.data
    },

    update: async (wsId, data) => {
        const response = await client.put(`/superadmin/workspaces/${wsId}`, data)
        return response.data
    },

    updateBranding: async (wsId, data) => {
        const response = await client.patch(`/superadmin/workspaces/${wsId}/settings`, data)
        return response.data
    },

    updateConfig: async (wsId, key, value) => {
        const response = await client.patch(`/superadmin/workspaces/${wsId}/config`, { key, value })
        return response.data
    },

    uploadLogo: async (wsId, file) => {
        const formData = new FormData()
        formData.append('file', file)
        
        // Instruction: Ensure the axios call is sending the file as multipart/form-data 
        // and that the Authorization header is correctly attached (handled by client interceptor).
        // Update URL to match workspaces_logo_bp registered at /api/workspaces
        const response = await client.post(`/workspaces/${wsId}/logo`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'bypass-tunnel-reminder': 'true' // Architect Requirement: satisfy local browser checks
            }
        })
        return response.data
    },

    uploadSystemLogo: async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const response = await client.post('/settings/system/logo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'bypass-tunnel-reminder': 'true' // Architect Requirement: satisfy local browser checks
            }
        })
        return response.data
    },

    // --- Current Workspace Methods (Regular Admin) ---
    getIdentity: async () => {
        const response = await client.get('/settings/identity')
        return response.data
    },

    updateIdentity: async (data) => {
        const response = await client.put('/settings/identity', data)
        return response.data
    },

    getStats: async (wsId) => {
        const response = await client.get(`/superadmin/workspaces/${wsId}/stats`)
        return response.data
    }
}
