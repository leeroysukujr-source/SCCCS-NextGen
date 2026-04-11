import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import { workspaceAPI } from '../api/workspace'
import { getApiBaseUrl, getApiUrl, getFullImageUrl } from '../utils/api'
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiChevronLeft, FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi'
import { auth, googleProvider, githubProvider } from '../utils/firebase'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import './Login.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [otpRequired, setOtpRequired] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState({ username: false, password: false })
  const navigate = useNavigate()
  const { slug } = useParams()
  const location = useLocation()
  const { setAuth } = useAuthStore()

  const [branding, setBranding] = useState(null)
  const [brandingLoading, setBrandingLoading] = useState(false)

  // Fetch workspace branding if slug is present
  useEffect(() => {
    const fetchBranding = async () => {
      // Support both route param (/:slug/login) and query param (?w=slug)
      const workspaceSlug = slug || new URLSearchParams(location.search).get('w')
      if (!workspaceSlug) {
        setBranding(null)
        return
      }

      try {
        setBrandingLoading(true)
        const data = await workspaceAPI.getBranding(workspaceSlug)
        setBranding(data)
      } catch (err) {
        console.error('Failed to fetch branding:', err)
        setBranding(null)
      } finally {
        setBrandingLoading(false)
      }
    }
    fetchBranding()
  }, [slug, location.search])

  // Silently check connection in background
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const apiUrl = getApiUrl()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        await fetch(`${apiUrl}/auth/test`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
          signal: controller.signal
        })

        clearTimeout(timeoutId)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Backend connection check: Will show error on login if still disconnected')
        }
      }
    }
    checkConnection()
  }, [])

  const [availableWorkspaces, setAvailableWorkspaces] = useState([])
  const [requireSelection, setRequireSelection] = useState(false)
  const [selectionIdToken, setSelectionIdToken] = useState(null)

  const handleGoogleLogin = async (workspaceCode = null) => {
    try {
      setError('')
      setLoading(true)
      
      let idToken = selectionIdToken
      if (!idToken) {
        const result = await signInWithPopup(auth, googleProvider)
        idToken = await result.user.getIdToken()
        setSelectionIdToken(idToken)
      }
      
      const finalWorkspaceCode = workspaceCode || branding?.code || slug || new URLSearchParams(location.search).get('w')
      const data = await authAPI.firebaseLogin(idToken, finalWorkspaceCode)
      
      if (data.require_selection) {
        setAvailableWorkspaces(data.workspaces)
        setRequireSelection(true)
        setLoading(false)
        return
      }

      setAuth(data.user, data.access_token)
      if (data.redirect_url) {
        navigate(data.redirect_url)
      } else if (data.user?.platform_role === 'SUPER_ADMIN' || data.user?.role === 'super_admin') {
        navigate('/superadmin/control-center')
      } else {
        navigate('/workspace-entry')
      }
    } catch (err) {
      console.error('Firebase Google OAuth error:', err)
      let errorMsg = 'Failed to initiate Google login'
      
      if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Login popup was closed before completion.'
      } else if (err.code === 'auth/popup-blocked') {
        errorMsg = 'Login popup was blocked by your browser.'
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubLogin = async (workspaceCode = null) => {
    try {
      setError('')
      setLoading(true)
      
      let idToken = selectionIdToken
      if (!idToken) {
        const result = await signInWithPopup(auth, githubProvider)
        idToken = await result.user.getIdToken()
        setSelectionIdToken(idToken)
      }
      
      const finalWorkspaceCode = workspaceCode || branding?.code || slug || new URLSearchParams(location.search).get('w')
      const data = await authAPI.firebaseLogin(idToken, finalWorkspaceCode)
      
      if (data.require_selection) {
        setAvailableWorkspaces(data.workspaces)
        setRequireSelection(true)
        setLoading(false)
        return
      }

      setAuth(data.user, data.access_token)
      if (data.redirect_url) {
        navigate(data.redirect_url)
      } else if (data.user?.platform_role === 'SUPER_ADMIN' || data.user?.role === 'super_admin') {
        navigate('/superadmin/control-center')
      } else {
        navigate('/workspace-entry')
      }
    } catch (err) {
      console.error('Firebase GitHub OAuth error:', err)
      let errorMsg = 'Failed to initiate GitHub login'

      if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Login popup was closed before completion.'
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error
      } else if (err.message) {
        errorMsg = err.message
      }

      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e, workspaceCode = null) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Call the backend /api/auth/login directly — no Firebase needed for email/password
      const finalWorkspaceCode = workspaceCode || branding?.code || slug || new URLSearchParams(location.search).get('w')
      const otp = otpRequired ? otpCode : null

      // authAPI.login(username, password, workspaceCode, otp)
      const data = await authAPI.login(username, password, finalWorkspaceCode, otp)

      setAuth(data.user, data.access_token)

      if (data.redirect_url) {
        navigate(data.redirect_url)
      } else if (data.user?.platform_role === 'SUPER_ADMIN' || data.user?.role === 'super_admin') {
        navigate('/superadmin/control-center')
      } else {
        navigate('/workspace-entry')
      }
    } catch (err) {
      if (err.response?.data?.otp_required) {
        setOtpRequired(true)
        setError(err.response.data.message || 'Two-factor code required')
        setLoading(false)
        return
      }

      let errorMessage = 'Invalid email or password'
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please try again.'
      } else if (err.response?.data?.errors?.length) {
        errorMessage = err.response.data.errors.join(', ')
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-background">
        {brandingLoading && <div className="branding-loader"><FiLoader className="animate-spin" size={24} /></div>}
        <div className="gradient-mesh"></div>
        <div className="floating-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}></div>
          ))}
        </div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Left Side - Branding */}
      <div className="login-left">
        <div className="brand-content">
          <div className="brand-logo-wrapper">
            <div className="brand-logo">
              <div className="logo-glow"></div>
              {branding?.logo_url ? (
                <img
                  src={getFullImageUrl(branding.logo_url)}
                  alt={branding.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              )}
            </div>
          </div>
          <h1 className="brand-title">
            {branding ? (
              <span className="title-line title-accent">{branding.name}</span>
            ) : (
              <>
                <span className="title-line">SCCCS</span>
                <span className="title-line title-accent">NextGen</span>
              </>
            )}
          </h1>
          <p className="brand-tagline">
            {branding ? `Official portal for ${branding.name}` : 'Experience the future of collaborative learning'}
          </p>
          <div className="brand-features">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">🎥</span>
              </div>
              <div className="feature-content">
                <h3>HD Video Conferencing</h3>
                <p>Crystal clear video meetings</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">💬</span>
              </div>
              <div className="feature-content">
                <h3>Real-time Collaboration</h3>
                <p>Instant messaging & chat rooms</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">📚</span>
              </div>
              <div className="feature-content">
                <h3>Course Management</h3>
                <p>Organized learning experience</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form and Workspace Selection */}
      <div className="login-right">
        <div className="login-wrapper">
          <div className="login-card">
            {requireSelection ? (
              <div className="workspace-selection">
                <div className="login-header">
                  <h2 className="login-title">Select Workspace</h2>
                  <p className="login-subtitle">Choose which institution you want to access</p>
                </div>
                
                <div className="workspace-list">
                  {availableWorkspaces.map(ws => (
                    <button 
                      key={ws.id} 
                      className="workspace-item"
                      onClick={() => {
                        // Resubmit with the chosen workspace ID as the "code"
                        if (selectionIdToken) {
                          handleSubmit(null, ws.id.toString())
                        }
                      }}
                    >
                      <div className="ws-icon-wrapper">
                        {ws.logo_url ? (
                          <img src={getFullImageUrl(ws.logo_url)} alt={ws.name} className="ws-logo" />
                        ) : (
                          <div className="ws-initial">{ws.name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="ws-info">
                        <span className="ws-name">{ws.name}</span>
                        <span className="ws-role">{ws.role.charAt(0).toUpperCase() + ws.role.slice(1)}</span>
                      </div>
                      <FiArrowRight className="ws-arrow" />
                    </button>
                  ))}
                </div>

                <button 
                  className="back-to-login" 
                  onClick={() => {
                    setRequireSelection(false)
                    setSelectionIdToken(null)
                  }}
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <div className="login-header">
                  <h2 className="login-title">Welcome Back</h2>
                  <p className="login-subtitle">Sign in to access your dashboard</p>
                </div>

                {error && (
                  <div className="error-toast" role="alert">
                    <FiAlertCircle className="error-icon" />
                    <div className="error-content">
                      {error.split('\n').map((line, i) => (
                        <span key={i}>{line}</span>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={(e) => handleSubmit(e)} className="login-form" noValidate>
                  <div className="input-group">
                    <label htmlFor="username" className={`input-label ${focused.username ? 'focused' : ''} ${username ? 'has-value' : ''}`}>
                      <FiUser className="label-icon" />
                      <span>Email Address</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setFocused({ ...focused, username: true })}
                        onBlur={() => setFocused({ ...focused, username: false })}
                        className="input-field"
                        placeholder="Enter your email"
                        required
                        disabled={loading}
                        autoComplete="username"
                      />
                      {username && <FiCheck className="input-success" />}
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="password" className={`input-label ${focused.password ? 'focused' : ''} ${password ? 'has-value' : ''}`}>
                      <FiLock className="label-icon" />
                      <span>Password</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocused({ ...focused, password: true })}
                        onBlur={() => setFocused({ ...focused, password: false })}
                        className="input-field"
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  {otpRequired && (
                    <div className="input-group">
                      <label htmlFor="otp" className={`input-label ${'' /* no focus handling for OTP here */}`}>
                        <FiLock className="label-icon" />
                        <span>Two-factor code</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          id="otp"
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="input-field"
                          placeholder="Enter 6-digit code"
                          disabled={loading}
                          autoComplete="one-time-code"
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-actions">
                    <label className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="checkbox-input"
                        disabled={loading}
                      />
                      <span className="checkbox-label">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
                  </div>

                  <button
                    type="submit"
                    className={`submit-btn ${loading ? 'loading' : ''}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="btn-spinner"></div>
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <FiArrowRight className="btn-arrow" />
                      </>
                    )}
                  </button>
                </form>

                <div className="divider-group">
                  <div className="divider-line"></div>
                  <span className="divider-text">Or continue with</span>
                  <div className="divider-line"></div>
                </div>

                <div className="social-auth">
                  <button
                    type="button"
                    className="social-btn google-btn"
                    onClick={() => handleGoogleLogin()}
                    disabled={loading}
                  >
                    <svg viewBox="0 0 24 24" className="social-icon">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    className="social-btn github-btn"
                    onClick={() => handleGitHubLogin()}
                    disabled={loading}
                  >
                    <svg viewBox="0 0 24 24" className="social-icon" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span>GitHub</span>
                  </button>
                </div>

                <p className="signup-prompt">
                  Don't have an account? <Link to="/signup" className="signup-link">Create account</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
