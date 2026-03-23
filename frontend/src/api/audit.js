import { apiClient } from './client'

export const auditAPI = {
    getLogs: async (params = {}) => {
        const response = await apiClient.get('/analytics/audit/logs', { params })
        return response.data
    }
}
