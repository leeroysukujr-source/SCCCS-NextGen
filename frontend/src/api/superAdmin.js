import api from './client';

export const superAdminAPI = {
    // Admins CRUD
    getAdmins: () => api.get('/superadmin/admins'),
    createAdmin: (data) => api.post('/superadmin/admins', data),
    updateAdmin: (id, data) => api.put(`/superadmin/admins/${id}`, data),
    deleteAdmin: (id) => api.delete(`/superadmin/admins/${id}`),

    // Roles
    getRoles: () => api.get('/superadmin/roles'),
    assignRoles: (adminId, roleIds) => api.put(`/superadmin/admins/${adminId}/roles`, { role_ids: roleIds }),

    // Stats & Logistics
    getStats: () => api.get('/superadmin/stats'),
    getWorkspaceAnalytics: (wsId) => api.get(`/superadmin/workspaces/${wsId}/analytics`),
    getLogs: (params) => api.get('/superadmin/logs', { params }),

    // Workspace Management
    getWorkspaces: () => api.get('/superadmin/workspaces'),
    createWorkspace: (data) => api.post('/superadmin/workspaces', data),
    updateWorkspace: (id, data) => api.put(`/superadmin/workspaces/${id}`, data),
    suspendWorkspace: (wsId, suspend = true) => api.patch(`/superadmin/workspaces/${wsId}/suspend`, { suspend }),
    deleteWorkspace: (wsId) => api.delete(`/superadmin/workspaces/${wsId}`),

    // Admin Management  
    suspendAdmin: (adminId, suspend = true) => api.patch(`/superadmin/admins/${adminId}/suspend`, { suspend }),

    // User Management
    getUsers: (params) => api.get('/superadmin/users', { params }), // ?role=teacher&workspace_id=null&search=john
    assignUsersToWorkspace: (userIds, workspaceId) => api.post('/superadmin/users/assign-workspace', {
        user_ids: userIds,
        workspace_id: workspaceId
    }),
};
