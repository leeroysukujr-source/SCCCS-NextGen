import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import './Login.css'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const hasProcessed = useRef(false)

  useEffect(() => {
    // Prevent multiple calls in React strict mode
    if (hasProcessed.current) {
      return
    }

    const handleCallback = async () => {
      try {
        hasProcessed.current = true

        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        // Determine provider from URL path
        let provider = null
        if (window.location.pathname.includes('google')) {
          provider = 'google'
        } else if (window.location.pathname.includes('github')) {
          provider = 'github'
        } else {
          // Try to detect from referrer or other means
          provider = 'google' // Default fallback
        }

        if (error) {
          setError(`OAuth error: ${error}`)
          setLoading(false)
          return
        }

        if (!code) {
          setError('Missing authorization code')
          setLoading(false)
          return
        }

        if (!provider) {
          setError('Unable to determine OAuth provider')
          setLoading(false)
          return
        }

        console.log('OAuth callback - Provider:', provider, 'Code:', code ? 'present' : 'missing')

        // Get the current origin to send to backend for redirect_uri matching
        const currentOrigin = window.location.origin
        const redirectUri = `${currentOrigin}/auth/callback`
        console.log('OAuth callback - Using redirect_uri:', redirectUri)

        const data = await authAPI.oauthCallback(provider, code, redirectUri)

        console.log('OAuth callback - Success:', data)

        // Handle Action Directives (e.g. Workspace Required, Complete Profile)
        if (data.action === 'workspace_required' || data.action === 'complete_profile') {
          console.log('OAuth Action Required:', data.action)
          navigate('/signup', { state: { ...data, oauth_flow: true } })
          return
        }

        // Set auth and navigate
        if (data.access_token) {
          setAuth(data.user, data.access_token)
          navigate(data.redirect_url || '/workspace-entry')
        } else {
          throw new Error('No access token received')
        }
      } catch (err) {
        console.error('OAuth callback error:', err)

        // Log full error details
        const errorDetails = {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText,
          code: err.code,
          config: {
            url: err.config?.url,
            baseURL: err.config?.baseURL,
            method: err.config?.method
          }
        }
        console.error('OAuth callback error details:', JSON.stringify(errorDetails, null, 2))
        console.error('Full error object:', err)

        let errorMsg = 'OAuth authentication failed'

        // Check if we got a response from the backend (HTTP error)
        if (err.response) {
          // Backend responded but with an error
          if (err.response.data?.error) {
            errorMsg = err.response.data.error
            console.error('Backend error message:', errorMsg)
          } else if (err.response.status) {
            errorMsg = `Server error (${err.response.status}): ${err.response.statusText || 'Unknown error'}`
          }
        }
        // Check if it's a network/connection error
        else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('timeout')) {
          const apiUrl = err.config?.baseURL || 'http://localhost:5000/api'
          errorMsg = `Cannot connect to the backend server at ${apiUrl}. Please make sure the backend is running on port 5000.`
        }
        // Other errors
        else if (err.message) {
          errorMsg = err.message
        }

        setError(errorMsg)
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, navigate, setAuth])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="logo-container">
                <div className="logo-icon">⏳</div>
              </div>
              <h1 className="auth-title">Completing Sign In</h1>
              <p className="auth-subtitle">Please wait while we authenticate you...</p>
              <div style={{ marginTop: '2rem' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="logo-container" style={{ background: 'var(--gradient-warm)' }}>
                <div className="logo-icon">❌</div>
              </div>
              <h1 className="auth-title">Authentication Failed</h1>
              <p className="auth-subtitle">{error}</p>
            </div>
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button
                className="btn-primary"
                onClick={() => navigate('/login')}
                style={{ width: '100%' }}
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

