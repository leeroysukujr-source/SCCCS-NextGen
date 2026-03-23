/**
 * API functions for polls
 */
import { apiRequest } from './index'

export const pollsAPI = {
  createPoll: async (channelId, pollData) => {
    return apiRequest(`/polls/channel/${channelId}`, {
      method: 'POST',
      body: JSON.stringify(pollData),
    })
  },

  voteOnPoll: async (pollId, optionIndices) => {
    return apiRequest(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ option_indices: optionIndices }),
    })
  },

  getPollResults: async (pollId) => {
    return apiRequest(`/polls/${pollId}/results`)
  },

  closePoll: async (pollId) => {
    return apiRequest(`/polls/${pollId}/close`, {
      method: 'POST',
    })
  },
}

