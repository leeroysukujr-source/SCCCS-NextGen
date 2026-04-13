import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { FiUser, FiBell, FiShield, FiKey, FiGlobe, FiSave, FiCheck } from 'react-icons/fi'
import './Settings.css'
import { useNavigate } from 'react-router-dom'
import { useNotify } from '../components/NotificationProvider'

const settingsAPI = {
  getSettings: async () => {
    const response = await fetch('/api/settings/user', {
      headers: {
        'Authorization': `Bearer ${useAuthStore.getState().token}`
      }
    })
    if (!response.ok) throw new Error('Failed to fetch settings')
    return response.json()
  },
  updateSettings: async (data) => {
    const response = await fetch('/api/settings/user', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${useAuthStore.getState().token}`
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update settings')
    return response.json()
  }
}

export default function Settings() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsAPI.getSettings
  })
  
  const updateMutation = useMutation({
    mutationFn: settingsAPI.updateSettings,
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  })
  
  const [formData, setFormData] = useState({
    profile: {},
    notifications: {},
    preferences: {}
  })
  
  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])
  
  const handleSave = () => {
    updateMutation.mutate(formData)
  }
  
  if (isLoading) {
    return <div className="settings-loading">Loading settings...</div>
  }
  
  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <button 
          className="save-button"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {saved ? <FiCheck /> : <FiSave />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
      
      <div className="settings-content">
        <div className="settings-sidebar">
          <button 
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
          >
            <FiUser /> Profile
          </button>
          <button 
            className={activeTab === 'notifications' ? 'active' : ''}
            onClick={() => setActiveTab('notifications')}
          >
            <FiBell /> Notifications
          </button>
          <button 
            className={activeTab === 'security' ? 'active' : ''}
            onClick={() => setActiveTab('security')}
          >
            <FiShield /> Security
          </button>
          <button 
            className={activeTab === 'preferences' ? 'active' : ''}
            onClick={() => setActiveTab('preferences')}
          >
            <FiGlobe /> Preferences
          </button>
        </div>
        
        <div className="settings-main">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Settings</h2>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.profile?.first_name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    profile: { ...formData.profile, first_name: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.profile?.last_name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    profile: { ...formData.profile, last_name: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.profile?.email || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    profile: { ...formData.profile, email: e.target.value }
                  })}
                />
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.notifications?.email_enabled ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, email_enabled: e.target.checked }
                    })}
                  />
                  Email Notifications
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.notifications?.push_enabled ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, push_enabled: e.target.checked }
                    })}
                  />
                  Push Notifications
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.notifications?.in_app_enabled ?? true}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, in_app_enabled: e.target.checked }
                    })}
                  />
                  In-App Notifications
                </label>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Security Settings</h2>
              <SecuritySettings />
            </div>
          )}
          
          {activeTab === 'preferences' && (
            <div className="settings-section">
              <h2>Preferences</h2>
              <div className="preferences-item">
                <div className="pref-info">
                  <h3>System Cache</h3>
                  <p>If you are experiencing decryption errors or see [Encrypted Message] placeholders, clearing your local cache can resolve synchronization issues.</p>
                </div>
                <button 
                  className="clear-cache-button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear the local cache? You will be logged out.")) {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.href = '/login';
                    }
                  }}
                >
                  Clear Local Cache
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SecuritySettings() {
  const { user } = useAuthStore()
  const notify = useNotify()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const navigate = useNavigate()
  
  useEffect(() => {
    // Check 2FA status
    fetch('/api/security/2fa/status', {
      headers: {
        'Authorization': `Bearer ${useAuthStore.getState().token}`
      }
    })
    .then(res => res.json())
    .then(data => setTwoFactorEnabled(data.is_enabled))
  }, [])
  
  const handle2FASetup = async () => {
    const res = await fetch('/api/security/2fa/setup', {
      headers: {
        'Authorization': `Bearer ${useAuthStore.getState().token}`
      }
    })
    const data = await res.json()
    setQrCode(data.qr_code)
    setShow2FASetup(true)
  }
  
  const handle2FAVerify = async () => {
    const res = await fetch('/api/security/2fa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${useAuthStore.getState().token}`
      },
      body: JSON.stringify({ code: verificationCode })
    })
    
    if (res.ok) {
      setTwoFactorEnabled(true)
      setShow2FASetup(false)
      notify('success', '2FA enabled successfully!')
    } else {
      notify('error', 'Invalid code. Please try again.')
    }
  }
  
  return (
    <div>
      <div className="security-item">
        <div>
          <h3>Two-Factor Authentication</h3>
          <p>Add an extra layer of security to your account</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {twoFactorEnabled ? (
            <span className="status-badge enabled">Enabled</span>
          ) : (
            <button onClick={handle2FASetup}>Enable 2FA</button>
          )}
          <button onClick={() => navigate('/settings/2fa')} className="btn">Manage 2FA</button>
          <button onClick={() => navigate('/settings/sessions')} className="btn">Active Sessions</button>
        </div>
      </div>
      
      {show2FASetup && (
        <div className="2fa-setup">
          <p>Scan this QR code with your authenticator app:</p>
          <img src={qrCode} alt="2FA QR Code" />
          <input
            type="text"
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <button onClick={handle2FAVerify}>Verify & Enable</button>
        </div>
      )}
      
      <SessionsList />
    </div>
  )
}

function SessionsList() {
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await fetch('/api/security/sessions', {
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        }
      })
      return res.json()
    }
  })
  
  const revokeSession = async (sessionId) => {
    await fetch(`/api/security/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${useAuthStore.getState().token}`
      }
    })
    // Refetch sessions
  }
  
  return (
    <div className="sessions-list">
      <h3>Active Sessions</h3>
      {sessions?.map(session => (
        <div key={session.id} className="session-item">
          <div>
            <strong>{session.ip_address}</strong>
            <p>Last active: {new Date(session.last_activity).toLocaleString()}</p>
          </div>
          <button onClick={() => revokeSession(session.id)}>Revoke</button>
        </div>
      ))}
    </div>
  )
}

