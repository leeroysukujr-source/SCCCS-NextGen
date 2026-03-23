import client from './client'
import { getApiUrl } from '../utils/api'
import { useAuthStore } from '../store/authStore'

export const filesAPI = {
  uploadFile: async (file, channelId = null, messageId = null, lessonId = null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (channelId) formData.append('channel_id', channelId)
    if (messageId) formData.append('message_id', messageId)
    if (lessonId) formData.append('lesson_id', lessonId)

    const response = await client.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getFile: async (fileId) => {
    const response = await client.get(`/files/${fileId}`, {
      responseType: 'blob',
    })
    return response.data
  },

  getFileInfo: async (fileId) => {
    const response = await client.get(`/files/info/${fileId}`)
    return response.data
  },

  deleteFile: async (fileId) => {
    const response = await client.delete(`/files/${fileId}`)
    return response.data
  },

  getFileUrl: (fileId, download = false) => {
    const baseURL = getApiUrl()
    const token = useAuthStore.getState().token
    let url = `${baseURL}/files/${fileId}`
    if (token) {
      url += `?token=${token}`
    }
    return download ? `${url}${token ? '&' : '?'}download=true` : url
  },

  downloadFile: async (fileId, filename) => {
    try {
      // Get token from auth store (same way as client.js does)
      const token = useAuthStore.getState().token

      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      // Use axios client which handles authentication and URL correctly
      const response = await client.get(`/files/${fileId}?download=true`, {
        responseType: 'blob', // Important for binary data - axios will return Blob directly
      })

      // response.data is already a Blob when responseType is 'blob'
      const blob = response.data

      // Create a blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename || 'download'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 100)

      return true
    } catch (error) {
      console.error('Error downloading file:', error)

      // Provide more helpful error messages
      let errorMessage = 'Failed to download file'
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.'
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to download this file.'
        } else if (error.response.status === 404) {
          errorMessage = 'File not found.'
        } else {
          errorMessage = `Failed to download file: ${error.response.statusText}`
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection.'
      } else {
        // Something else happened
        errorMessage = error.message || 'Failed to download file'
      }

      console.error(errorMessage)
      throw error
    }
  },

  getLessonMaterials: async (lessonId) => {
    const response = await client.get(`/lessons/${lessonId}/materials`)
    return response.data
  },
}

