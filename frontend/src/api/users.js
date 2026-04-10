import client from './client'

export const usersAPI = {
  getUsers: async () => {
    const response = await client.get('users')
    return response.data
  },

  getUser: async (userId) => {
    const response = await client.get(`users/${userId}`)
    return response.data
  },

  searchUsers: async (query, isGlobal = false) => {
    const response = await client.get(`users/search?q=${encodeURIComponent(query)}${isGlobal ? '&global=true' : ''}`)
    return response.data
  },

  updateUserRole: async (userId, role) => {
    const response = await client.put(`users/${userId}/role`, { role })
    return response.data
  },

  updateUserPrivileges: async (userId, privileges) => {
    const response = await client.put(`users/${userId}/privileges`, { privileges })
    return response.data
  },

  getAvailablePrivileges: async () => {
    const response = await client.get('users/privileges/list')
    return response.data
  },

  getPublicTeachers: async () => {
    const response = await client.get('users/list-teachers')
    return response.data
  },

  getPublicAdmins: async () => {
    const response = await client.get('users/list-admins')
    return response.data
  },

  deleteUser: async (userId) => {
    const response = await client.delete(`users/${userId}`)
    return response.data
  },

  createUser: async (userData) => {
    // We reuse the admin/bulk-users-admin endpoint by sending a list with one item
    const response = await client.post('users/bulk', { users: [userData] })
    return response.data
  },

  bulkCreateUsers: async (users, workspaceId) => {
    const response = await client.post('users/bulk', { users, workspace_id: workspaceId })
    return response.data
  },
}

export default usersAPI
