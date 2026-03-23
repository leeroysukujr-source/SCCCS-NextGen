import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import { getFullImageUrl } from '../utils/api'
import { FiUser, FiMail, FiLock, FiKey, FiArrowRight, FiCheck, FiLoader, FiAlertCircle, FiBriefcase, FiHash, FiSearch, FiInfo, FiCheckCircle } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { auth, googleProvider } from '../utils/firebase'
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import './Login.css'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  // Steps: 1=Details, 2=Security, 3=Workspace
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Workspace Integration State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [workspaceCode, setWorkspaceCode] = useState('')
  const [workspaceSearchLoading, setWorkspaceSearchLoading] = useState(false)
  const [workspaceResults, setWorkspaceResults] = useState([])

  // Form State
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'student',
    reg_no: '',
    oauth_provider: '',
    oauth_id: '',
    avatar_url: ''
  })

  useEffect(() => {
    if (location.state && location.state.oauth_flow) {
      const { email, first_name, last_name, oauth_provider, oauth_id, avatar_url } = location.state
      setFormData(prev => ({
        ...prev,
        email: email || prev.email,
        first_name: first_name || prev.first_name,
        last_name: last_name || prev.last_name,
        username: email ? email.split('@')[0] : prev.username,
        oauth_provider: oauth_provider || '',
        oauth_id: oauth_id || '',
        avatar_url: avatar_url || ''
      }))
    }
  }, [location.state])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      const data = await authAPI.firebaseLogin(idToken)
      
      setAuth(data.user, data.access_token)
      navigate('/workspace-entry')
    } catch (err) {
      console.error('Firebase Google OAuth error:', err)
      setError('Failed to initiate Google login')
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Create Firebase User
      const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const idToken = await result.user.getIdToken()

      const payload = {
        ...formData,
        id_token: idToken
      }
      delete payload.password
      
      // 2. Register in Database
      const res = await authAPI.register(payload)
      setAuth(res.user, res.access_token)
      
      // 3. Join Workspace if selected
      if (selectedWorkspace && workspaceCode) {
        await authAPI.joinWorkspace({
          workspace_id: selectedWorkspace.id,
          code: workspaceCode,
          reg_no: formData.reg_no || undefined,
          role: formData.role
        });
      }

      navigate('/dashboard')
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.response?.data?.error || err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchWorkspace = async () => {
    if (!searchTerm) {
      setWorkspaceResults([]);
      return;
    }
    setWorkspaceSearchLoading(true);
    try {
      const { data } = await authAPI.searchWorkspaces(searchTerm);
      setWorkspaceResults(data);
    } catch (err) {
      console.error('Workspace search error:', err);
    } finally {
      setWorkspaceSearchLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (step === 3) handleSearchWorkspace();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, step]);

  const getPasswordStrength = (pass) => {
    let s = 0
    if (pass.length > 7) s++
    if (/[A-Z]/.test(pass)) s++
    if (/[0-9]/.test(pass)) s++
    if (/[^A-Za-z0-9]/.test(pass)) s++
    return s
  }
  const passStrength = getPasswordStrength(formData.password)

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="login-header">
              <h2 className="login-title">Create Account</h2>
              <p className="login-subtitle">Join the prestigious learning community</p>
            </div>

            <div className="input-group">
               <label className="input-label">Email Address</label>
               <input className="input-field" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" />
            </div>

            <div className="signup-row flex flex-wrap gap-4">
              <div className="input-group flex-1">
                <label className="input-label">First Name</label>
                <input className="input-field" name="first_name" value={formData.first_name} onChange={handleChange} placeholder="John" />
              </div>
              <div className="input-group flex-1">
                <label className="input-label">Last Name</label>
                <input className="input-field" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Doe" />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Username</label>
              <div className="input-wrapper">
                <FiUser className="field-icon-left" />
                <input className="input-field pl-10" name="username" value={formData.username} onChange={handleChange} placeholder="johndoe" />
              </div>
            </div>

            <button type="button" className="submit-btn w-full mt-4" onClick={() => setStep(2)}>
              Next <FiArrowRight className="ml-2" />
            </button>

            <div className="divider-group mt-6">
              <div className="divider-line"></div>
              <span className="divider-text">or sign up with</span>
              <div className="divider-line"></div>
            </div>

            <div className="social-auth">
              <button type="button" className="social-btn google-btn" onClick={handleGoogleLogin}>
                <svg viewBox="0 0 24 24" className="social-icon">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Google</span>
              </button>
            </div>
          </>
        )

      case 2:
        return (
          <>
            <div className="login-header">
              <h2 className="login-title">Secure Access</h2>
              <p className="login-subtitle">Choose a strong password</p>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <FiLock className="field-icon-left" />
                <input
                  className="input-field pl-10"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {formData.password && (
                <div className="strength-meter mt-2">
                  <div className={`bar h-1 rounded-full transition-all duration-500 strength-${passStrength}`} style={{ width: `${(passStrength + 1) * 20}%` }}></div>
                </div>
              )}
            </div>

            <div className="form-actions mt-8 flex justify-between gap-4">
              <button type="button" className="text-btn flex items-center gap-2" onClick={() => setStep(1)}>
                <FiArrowLeft /> Back
              </button>
              <button type="button" className="submit-btn px-10" onClick={() => setStep(3)} disabled={!formData.password || passStrength < 2}>
                Next <FiArrowRight />
              </button>
            </div>
          </>
        )

      case 3:
        return (
          <>
            <div className="login-header">
              <h2 className="login-title text-indigo-400">Institutional Link</h2>
              <p className="login-subtitle">Connect to your workspace</p>
            </div>

            {!selectedWorkspace ? (
              <div className="workspace-search-step animate-fadeIn">
                <div className="input-group">
                  <label className="input-label">Search Institution</label>
                  <div className="input-wrapper">
                    <FiSearch className="field-icon-left" />
                    <input 
                      className="input-field pl-10" 
                      placeholder="e.g. Unilak..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {workspaceSearchLoading && <FiLoader className="field-icon-right animate-spin text-indigo-500" />}
                  </div>
                </div>

                <div className="workspace-results mt-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                  {workspaceResults.map(ws => (
                    <button 
                      key={ws.id} 
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-indigo-600/20 rounded-xl border border-white/5 hover:border-indigo-500/50 transition-all group"
                      onClick={() => setSelectedWorkspace(ws)}
                    >
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center font-black text-indigo-400">
                           {ws.name[0]}
                         </div>
                         <div className="text-left">
                           <div className="text-sm font-bold text-white transition-colors">{ws.name}</div>
                           <div className="text-[10px] text-slate-500 uppercase tracking-tighter">@{ws.slug}</div>
                         </div>
                      </div>
                      <FiArrowRight className="text-white/20 group-hover:text-indigo-400 transition-all" />
                    </button>
                  ))}
                  {searchTerm && workspaceResults.length === 0 && !workspaceSearchLoading && (
                    <div className="text-center py-4 text-slate-500 italic text-xs">
                      No workspaces found. Try another name.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="workspace-verify-step animate-slideInRight">
                <div className="flex items-center gap-3 mb-6 p-3 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
                   <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                     {selectedWorkspace.name[0]}
                   </div>
                   <div className="flex-1">
                     <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Selected</p>
                     <p className="text-white font-bold">{selectedWorkspace.name}</p>
                   </div>
                   <button type="button" onClick={() => setSelectedWorkspace(null)} className="text-xs text-slate-500 hover:text-white underline">Change</button>
                </div>

                <div className="input-group">
                  <label className="input-label">Workspace Code</label>
                  <div className="input-wrapper">
                    <FiHash className="field-icon-left" />
                    <input 
                      className="input-field pl-10" 
                      placeholder="Input access code" 
                      value={workspaceCode}
                      onChange={(e) => setWorkspaceCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group mt-4">
                  <label className="input-label">Identification (Reg No / Email)</label>
                  <div className="input-wrapper">
                    <FiBriefcase className="field-icon-left" />
                    <input 
                      className="input-field pl-10" 
                      name="reg_no"
                      placeholder="e.g. 21/K/1234" 
                      value={formData.reg_no}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-tighter bg-black/20 p-2 rounded-lg">
                   <FiInfo /> Your ID will be verified by the admin
                </div>
              </div>
            )}

            <div className="form-actions mt-8 flex justify-between gap-4">
              <button type="button" className="text-btn flex items-center gap-2" onClick={() => { if(selectedWorkspace) setSelectedWorkspace(null); else setStep(2); }}>
                Back
              </button>
              <button type="submit" className="submit-btn px-10 flex items-center gap-2" disabled={loading || !selectedWorkspace || !workspaceCode}>
                {loading ? <span className="btn-spinner"></span> : <>Complete Onboarding <FiCheckCircle /></>}
              </button>
            </div>
          </>
        )
    }
  }

  return (
    <div className="login-page">
      {/* Animated Background - Shared with Login */}
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
      </div>

      {/* Left Side: Branding (Dynamic) */}
      <div className="login-left">
        <div className="brand-content">
          <div className="brand-logo-wrapper">
            <div className="brand-logo">
              {branding?.logo_url ? (
                <img src={getFullImageUrl(branding.logo_url)} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-4xl">🚀</span>
              )}
            </div>
          </div>
          <h1 className="brand-title">
            {branding ? branding.name : "Join the Future"}
          </h1>
          <p className="brand-tagline">
            {branding ? "Create your institutional account" : "Sign up to start learning"}
          </p>

          <div className="brand-features">
            <div className="feature-card">
              <div className="feature-icon-wrapper"><span>🎓</span></div>
              <div className="feature-content"><h3>Student Portal</h3><p>Access your courses and grades</p></div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><span>🤝</span></div>
              <div className="feature-content"><h3>Community</h3><p>Connect with peers and mentors</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="login-right">
        <div className="login-wrapper">
          <div className="login-card">

            {/* Progress Indicator */}
            <div className="step-indicator">
              <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
              <div className="step-line"></div>
              <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
              <div className="step-line"></div>
              <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
            </div>

            {error && (
              <div className="error-toast animate-shake">
                <FiAlertCircle className="error-icon" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="step-content"
                  >
                    {renderStepContent()}
                  </motion.div>
                ) : step === 2 ? (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="step-content"
                  >
                    {renderStepContent()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="step-content"
                  >
                    {renderStepContent()}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Footer Divider Removed (moved inside Step 1) */}

            <p className="signup-prompt">
              Already have an account? <Link to="/login" className="signup-link">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
