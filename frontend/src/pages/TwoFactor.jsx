import { useState, useEffect } from 'react'
import { authAPI } from '../api/auth'
import { 
  FiShield, 
  FiSmartphone, 
  FiLock, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiCopy, 
  FiCpu, 
  FiRefreshCw, 
  FiXCircle 
} from 'react-icons/fi'
import './SecurityNexus.css'

export default function TwoFactor() {
  const [secret, setSecret] = useState(null)
  const [qr, setQr] = useState(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Info, 2: Setup, 3: Verify

  useEffect(() => {
    // Initial check would go here if backend had is_2fa_enabled endpoint
  }, [])

  const handleSetup = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const data = await authAPI.twofaSetup()
      setSecret(data.secret)
      setQr(data.qr_png_base64)
      setStep(2)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to generate security protocols' })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length < 6) return
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await authAPI.twofaVerify(secret, code)
      setEnabled(true)
      setStep(1)
      setSecret(null)
      setQr(null)
      setCode('')
      setMessage({ type: 'success', text: 'Quantum Multi-Factor Authentication Active' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Verification Failed' })
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    const password = window.prompt('Confirm administrative password to deactivate 2FA:')
    if (!password) return
    
    setLoading(true)
    try {
      await authAPI.twofaDisable({ password, code: '' })
      setEnabled(false)
      setMessage({ type: 'success', text: 'Security protocols downgraded to single-factor' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Deactivation Failed' })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    // Could add a small toast here
  }

  return (
    <div className="security-container">
      <div className="security-header animate-fade-in">
        <h1 className="security-title">Identity Shield</h1>
        <p className="security-subtitle">
          Enhance your account's defense with Multi-Factor Authentication. 
          Protect your data with time-based encryption protocols.
        </p>
      </div>

      {message.text && (
        <div className={`status-msg ${message.type} animate-fade-in`}>
          {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="nexus-security-grid">
        <div className="security-card main-shield animate-fade-in">
          <div className="card-title">
            <FiShield className="text-blue-400" />
            <span>Multi-Factor Protocol</span>
          </div>
          
          <div className="card-description">
            {enabled ? (
              "Your identity is currently multi-shielded. Any login attempt will require a biometrically-linked temporary token."
            ) : (
              "Secure your account by adding an additional layer of verification. Use an authenticator app to generate time-sensitive access codes."
            )}
          </div>

          {!enabled && step === 1 && (
            <button onClick={handleSetup} className="btn btn-primary" disabled={loading}>
              {loading ? <FiRefreshCw className="animate-spin" /> : <FiCpu />}
              <span>Initialize Security Setup</span>
            </button>
          )}

          {enabled && (
             <button onClick={handleDisable} className="btn btn-secondary border-red-500/20 text-red-400 hover:bg-red-500/10" disabled={loading}>
                <FiXCircle />
                <span>Deactivate Shield</span>
             </button>
          )}

          {!enabled && step === 2 && (
            <div className="setup-flow mt-6 animate-scale-in">
              <div className="flex flex-col items-center">
                <div className="qr-container">
                  {qr ? (
                    <img src={`data:image/png;base64,${qr}`} alt="TOTP QR" />
                  ) : (
                    <div className="qr-placeholder">Generating...</div>
                  )}
                </div>
                
                <p className="text-sm text-tertiary mb-4">Or enter this secret key manually:</p>
                
                <div className="secret-key-display">
                  <span>{secret}</span>
                  <button onClick={() => copyToClipboard(secret)} className="btn-icon">
                    <FiCopy />
                  </button>
                </div>

                <div className="w-full">
                  <p className="text-sm font-bold mb-2 uppercase tracking-widest text-blue-400">Step 2: Verification</p>
                  <div className="verification-input-group">
                    <input 
                      className="verification-input"
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                      placeholder="000000"
                      maxLength={6}
                    />
                    <button 
                      onClick={handleVerify} 
                      className="btn btn-primary px-8"
                      disabled={loading || code.length < 6}
                    >
                      {loading ? <FiRefreshCw className="animate-spin" /> : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="security-card sidebar-info animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-title text-lg">
            <FiSmartphone className="text-purple-400" />
            <span>Compatible Apps</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
               <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <FiCpu />
               </div>
               <div>
                  <p className="font-bold text-sm">Google Authenticator</p>
                  <p className="text-xs opacity-60">Standard Protocol</p>
               </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
               <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FiSmartphone />
               </div>
               <div>
                  <p className="font-bold text-sm">Authy / Microsoft</p>
                  <p className="text-xs opacity-60">Advanced Syncing</p>
               </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5">
             <div className="card-title text-sm uppercase tracking-widest opacity-60">
                <FiLock className="text-xs" />
                <span>Identity Integrity</span>
             </div>
             <p className="text-xs text-tertiary leading-relaxed">
                2FA tokens are generated locally on your device. Never share your secret key or reset codes with anyone, including SCCCS administrators.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
