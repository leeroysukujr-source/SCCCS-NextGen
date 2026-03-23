import client from './client'

export const groupsAPI = {
  createGroup: async (data) => {
    const response = await client.post('/groups', data)
    return response.data
  },

  getGroups: async () => {
    const response = await client.get('/groups')
    return response.data
  },

  getGroup: async (groupId) => {
    const response = await client.get(`/groups/${groupId}`)
    return response.data
  },

  updateGroup: async (groupId, data) => {
    const response = await client.put(`/groups/${groupId}`, data)
    return response.data
  },

  deleteGroup: async (groupId) => {
    const response = await client.delete(`/groups/${groupId}`)
    return response.data
  },

  joinGroup: async (groupId, data = {}) => {
    const response = await client.post(`/groups/${groupId}/join`, data)
    return response.data
  },

  getGroupRoomToken: async (groupId) => {
    const response = await client.post(`/groups/${groupId}/token`)
    return response.data
  },

  joinGroupByCode: async (joinCode) => {
    const response = await client.post(`/groups/join/${joinCode}`)
    return response.data
  },

  leaveGroup: async (groupId) => {
    const response = await client.post(`/groups/${groupId}/leave`)
    return response.data
  },

  getMembers: async (groupId) => {
    const response = await client.get(`/groups/${groupId}/members`)
    return response.data
  },

  getJoinRequests: async (groupId) => {
    const response = await client.get(`/groups/${groupId}/requests`)
    return response.data
  },

  approveJoinRequest: async (groupId, requestId) => {
    const response = await client.post(`/groups/${groupId}/requests/${requestId}/approve`)
    return response.data
  },

  rejectJoinRequest: async (groupId, requestId) => {
    const response = await client.post(`/groups/${groupId}/requests/${requestId}/reject`)
    return response.data
  },

  updateMemberRole: async (groupId, userId, role) => {
    const response = await client.put(`/groups/${groupId}/members/${userId}/role`, { role })
    return response.data
  },

  getMessages: async (groupId, page = 1) => {
    const response = await client.get(`/groups/${groupId}/messages?page=${page}`)
    return response.data
  },

  getMyAssignmentGroups: async () => {
    const response = await client.get('/assignments/my-groups')
    return response.data
  },

  getAssignmentGroupToken: async (groupId) => {
    const response = await client.post(`/assignments/groups/${groupId}/token`)
    return response.data
  },
  getAssignmentGroupMessages: async (groupId) => {
    const response = await client.get(`/assignments/groups/${groupId}/messages`)
    return response.data
  },

  sendAssignmentGroupMessage: async (groupId, content) => {
    const response = await client.post(`/assignments/groups/${groupId}/messages`, { content })
    return response.data
  },

  getAssignmentGroupTasks: async (groupId) => {
    const response = await client.get(`/assignments/groups/${groupId}/tasks`)
    return response.data
  },

  createAssignmentGroupTask: async (groupId, data) => {
    const response = await client.post(`/assignments/groups/${groupId}/tasks`, data)
    return response.data
  },

  updateAssignmentGroupTask: async (taskId, data) => {
    const response = await client.put(`/assignments/groups/tasks/${taskId}`, data)
    return response.data
  },

  deleteAssignmentGroupTask: async (taskId) => {
    const response = await client.delete(`/assignments/groups/tasks/${taskId}`)
    return response.data
  },

  getAssignmentGroupMembers: async (groupId) => {
    const response = await client.get(`/assignments/groups/${groupId}/members`)
    return response.data
  },

  addAssignmentGroupMembers: async (groupId, data) => {
    const response = await client.post(`/assignments/groups/${groupId}/members`, data)
    return response.data
  },

  removeAssignmentGroupMember: async (groupId, userId) => {
    const response = await client.delete(`/assignments/groups/${groupId}/members/${userId}`)
    return response.data
  },

  getAssignmentGroups: async (assignmentId) => {
    const response = await client.get(`/assignments/${assignmentId}/groups`)
    return response.data
  },

  getAssignmentGroup: async (groupId) => {
    const response = await client.get(`/assignments/groups/${groupId}`)
    return response.data
  },

  joinAssignmentGroup: async (groupId) => {
    const response = await client.post(`/assignments/groups/${groupId}/join`)
    return response.data
  },
}

