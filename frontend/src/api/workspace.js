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
        const { uploadToSupabase } = await import('../utils/supabase');
        const publicUrl = await uploadToSupabase(file, 'workspace-logo', wsId);
        
        const response = await client.post(`/workspaces/${wsId}/logo`, {
            logo_url: publicUrl
        });
        return response.data
    },

    uploadSystemLogo: async (file) => {
        const { uploadToSupabase } = await import('../utils/supabase');
        const publicUrl = await uploadToSupabase(file, 'system-logo');
        
        // Match the endpoint registered in backend/app/__init__.py under /api/settings
        const response = await client.post('/settings/system/logo', {
            logo_url: publicUrl
        });
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
