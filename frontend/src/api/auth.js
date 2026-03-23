import client from './client'

export const authAPI = {
  login: async (username, password, workspaceCode = null, otp = null) => {
    const payload = { username, password }
    if (workspaceCode) payload.workspace_code = workspaceCode
    if (otp) payload.otp = otp
    const response = await client.post('/auth/login', payload)
    // Backend wraps payload under a `data` field: { success, message, data: { user, access_token } }
    // Normalize to return the inner data object when present for easier consumption by the frontend.
    return response.data && response.data.data ? response.data.data : response.data
  },

  firebaseLogin: async (idToken, workspaceCode = null) => {
    const payload = { id_token: idToken }
    if (workspaceCode) payload.workspace_code = workspaceCode
    const response = await client.post('/auth/firebase-login', payload)
    return response.data && response.data.data ? response.data.data : response.data
  },

  register: async (userData) => {
    const response = await client.post('/auth/register', userData)
    return response.data && response.data.data ? response.data.data : response.data
  },

  resolveWorkspace: async (data) => {
    // data: { email?, workspace_code?, invite_token? }
    const response = await client.post('/auth/resolve-workspace', data)
    return response.data
  },

  getCurrentUser: async () => {
    const response = await client.get('/auth/me')
    return response.data
  },

  updateProfile: async (userData) => {
    const response = await client.put('/users/me', userData)
    return response.data
  },

  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await client.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getOAuthUrl: async (provider) => {
    const response = await client.get(`/auth/oauth/${provider}/authorize`)
    return response.data
  },

  oauthCallback: async (provider, code, redirectUri) => {
    const response = await client.post(`/auth/oauth/${provider}/callback`, {
      code,
      redirect_uri: redirectUri
    })
    return response.data
  },

  // Two-factor and session management
  twofaSetup: async () => {
    const response = await client.post('/auth/2fa/setup')
    return response.data
  },

  twofaVerify: async (secret, code) => {
    const response = await client.post('/auth/2fa/verify', { secret, code })
    return response.data
  },

  twofaDisable: async ({ password, code }) => {
    const response = await client.post('/auth/2fa/disable', { password, code })
    return response.data
  },

  getSessions: async () => {
    const response = await client.get('/auth/sessions')
    return response.data
  },

  revokeSession: async (sessionId) => {
    const response = await client.post('/auth/sessions/revoke', { session_id: sessionId })
    return response.data
  },

  requestPasswordReset: async (email) => {
    const response = await client.post('/auth/password/forgot', { email })
    return response.data
  },

  resetPassword: async ({ token, password, confirm_password }) => {
    const response = await client.post('/auth/password/reset', {
      token,
      password,
      confirm_password,
    })
    return response.data
  },

  verifyPasswordResetToken: async (token) => {
    const response = await client.post('/auth/password/verify-token', { token })
    return response.data
  },

  searchWorkspaces: async (query) => {
    const response = await client.get(`/workspace/search?q=${query}`)
    return response.data
  },

  joinWorkspace: async (data) => {
    // data: { workspace_id, code, reg_no?, role }
    const response = await client.post('/workspace/join', data)
    return response.data
  },
}

