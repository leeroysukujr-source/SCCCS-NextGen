/**
 * API functions for message search
 */
import { apiRequest } from './index'

export const messageSearchAPI = {
  searchInChannel: async (channelId, params) => {
    const queryParams = new URLSearchParams()
    
    if (params.q) queryParams.append('q', params.q)
    if (params.author_id) queryParams.append('author_id', params.author_id)
    if (params.type) queryParams.append('type', params.type)
    if (params.date_from) queryParams.append('date_from', params.date_from)
    if (params.date_to) queryParams.append('date_to', params.date_to)
    if (params.mentions_only) queryParams.append('mentions_only', params.mentions_only)
    if (params.has_files) queryParams.append('has_files', params.has_files)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)
    
    return apiRequest(`/search/channel/${channelId}?${queryParams.toString()}`)
  },

  searchGlobal: async (params) => {
    const queryParams = new URLSearchParams()
    
    if (params.q) queryParams.append('q', params.q)
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)
    
    return apiRequest(`/search/global?${queryParams.toString()}`)
  },
}

