import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../api/auth'
import { FiMail, FiArrowLeft, FiShield, FiCheckCircle, FiAlertCircle, FiCpu } from 'react-icons/fi'
import './Login.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setResetToken('')
    setError('')

    try {
      // Use Backend API for reset request
      const response = await authAPI.requestPasswordReset(email)
      setMessage(response?.message || 'If an account exists for this email, password reset instructions have been sent.')
      
      // Capture dev token if provided (non-production)
      if (response?.reset_token) {
        setResetToken(response.reset_token)
      }
    } catch (err) {
      console.error('Password reset error:', err)
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unable to process your request at the moment.'
      setError(msg)
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
              <FiCpu size={32} className="text-blue-400" />
            </div>
          </div>
          <h1 className="brand-title">
            <span className="title-line">Security</span>
            <span className="title-line title-accent">Recovery</span>
          </h1>
          <p className="brand-tagline">
            Initiating password reset protocols. Provide your registered identity to receive the decryption link.
          </p>
          <div className="security-badges mt-8 flex gap-4">
             <div className="badge-item">
                <FiShield className="text-green-400" />
                <span>End-to-End Encrypted</span>
             </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-wrapper">
          <div className="login-card nexus-card-effect">
            <div className="login-header">
              <h2 className="login-title">Reset Access</h2>
              <p className="login-subtitle">System authentication recovery module</p>
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

            {resetToken && (
              <div className="dev-note nexus-alert-info mt-4">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <FiCpu />
                  <span className="font-bold text-xs uppercase tracking-widest">Developer Uplink</span>
                </div>
                <p className="text-[10px] opacity-70 mb-2">Internal reset token detected (Non-Production Only):</p>
                <code className="block bg-black/40 p-2 rounded border border-blue-500/30 text-blue-300 break-all text-[11px]">
                  {resetToken}
                </code>
                <div className="mt-3">
                  <Link to={`/reset-password?token=${resetToken}`} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-bold">
                    <span>Initialize Reset Link</span>
                    <FiArrowLeft className="rotate-180" />
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form mt-6" noValidate>
              <div className="input-group">
                <label htmlFor="email" className={`input-label ${email ? 'has-value focused' : ''}`}>
                  <span>Registered Email Address</span>
                </label>
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="e.g. pilot@nexus.academy"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`submit-btn nexus-btn-glow ${loading ? 'loading' : ''}`}
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <span>Send Recovery Link</span>
                )}
              </button>
            </form>

            <div className="auth-links">
              <Link to="/login" className="flex items-center gap-2 hover:text-white transition-colors">
                <FiArrowLeft />
                <span>Return to Command Center</span>
              </Link>
            </div>
          </div>
          
          <div className="system-footer">
            <span>SCCCS v4.0 • Quantum Encryption Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}


