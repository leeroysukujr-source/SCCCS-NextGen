import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../api/auth'
import { FiLock, FiKey, FiShield, FiCheckCircle, FiAlertCircle, FiCpu, FiLoader, FiUser } from 'react-icons/fi'
import './Login.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromQuery = searchParams.get('token') || ''

  const [token, setToken] = useState(tokenFromQuery)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [tokenValid, setTokenValid] = useState(null) // null, true, false
  const [foundUser, setFoundUser] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token && token.length > 20) {
      verifyToken(token)
    }
  }, [tokenFromQuery])

  const verifyToken = async (tokenToVerify) => {
    setVerifying(true)
    setTokenValid(null)
    setError('')
    try {
      const res = await authAPI.verifyPasswordResetToken(tokenToVerify)
      if (res?.data?.valid) {
        setTokenValid(true)
        setFoundUser(res.data)
      } else {
        setTokenValid(false)
      }
    } catch (err) {
      setTokenValid(false)
      setError(err.response?.data?.message || 'Token verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleTokenChange = (e) => {
    const val = e.target.value.trim()
    setToken(val)
    if (val.length > 20) {
      verifyToken(val)
    } else {
      setTokenValid(null)
      setFoundUser(null)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!tokenValid) {
        setError('Please provide a valid token before proceeding.')
        return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await authAPI.resetPassword({
        token,
        password,
        confirm_password: confirmPassword,
      })
      setMessage(response?.message || 'Password has been reset successfully.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Unable to reset password.'
      const validationErrors = err.response?.data?.errors
      if (validationErrors?.length) {
        setError(validationErrors.join(' '))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-background">
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
        <div className="nexus-grid-overlay"></div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="login-left">
        <div className="brand-content animate-slideUp">
          <div className="brand-logo-wrapper">
            <div className="brand-logo nexus-glow">
              <FiKey size={32} className="text-blue-400" />
            </div>
          </div>
          <h1 className="brand-title">
            <span className="title-line">Credential</span>
            <span className="title-line title-accent">Update</span>
          </h1>
          <p className="brand-tagline">
            Decryption key verified. You may now re-establish your secure access credentials.
          </p>
          <div className="security-badges mt-8 flex flex-col gap-3">
             <div className="badge-item">
                <FiLock className="text-amber-400" />
                <span>Minimum 8 Characters Required</span>
             </div>
             <div className="badge-item">
                <FiShield className="text-green-400" />
                <span>SHA-512 Hashing Applied</span>
             </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-wrapper">
          <div className="login-card nexus-card-effect">
            <div className="login-header">
              <h2 className="login-title">Reset Password</h2>
              <p className="login-subtitle">Securely overwrite your biometric hash</p>
            </div>

            {error && (
              <div className="error-toast animate-shake" role="alert">
                <FiAlertCircle className="flex-shrink-0" />
                <div className="error-content">{error}</div>
              </div>
            )}

            {message && (
              <div className="success-toast animate-fadeIn" role="status">
                <FiCheckCircle className="flex-shrink-0" />
                <div className="success-content">{message}</div>
              </div>
            )}

            {foundUser && (
              <div className="user-identification animate-fadeIn mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <FiUser />
                 </div>
                 <div>
                    <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Identity Confirmed</p>
                    <p className="text-sm font-bold text-white">{foundUser.username} <span className="opacity-50 font-normal">({foundUser.email})</span></p>
                 </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form mt-6" noValidate>
              <div className="input-group">
                <label htmlFor="token" className={`input-label ${token ? 'has-value focused' : ''}`}>
                  <span>Reset Token / Security Key</span>
                </label>
                <div className="input-wrapper">
                  <FiKey className="input-icon" />
                  <input
                    id="token"
                    type="text"
                    value={token}
                    onChange={handleTokenChange}
                    className={`input-field ${tokenValid === true ? 'border-green-500/50' : tokenValid === false ? 'border-red-500/50' : ''}`}
                    placeholder="Paste your unique token here"
                    required
                    disabled={loading || verifying}
                  />
                  {verifying && <FiLoader className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />}
                  {tokenValid === true && <FiCheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400" />}
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password" className={`input-label ${password ? 'has-value focused' : ''}`}>
                  <span>New Secure Password</span>
                </label>
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="Enter new credentials"
                    required
                    disabled={loading || !tokenValid}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="confirm-password" className={`input-label ${confirmPassword ? 'has-value focused' : ''}`}>
                  <span>Confirm New Credentials</span>
                </label>
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Verify new credentials"
                    required
                    disabled={loading || !tokenValid}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`submit-btn nexus-btn-glow ${loading ? 'loading' : ''}`}
                disabled={loading || !token || !password || !confirmPassword || !tokenValid}
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Overwrite Credentials</span>
                )}
              </button>
            </form>

            <div className="auth-links">
              <Link to="/login" className="hover:text-white transition-colors">Return to Security Checkpoint</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


