import { useEffect, useState } from 'react'
import { authAPI } from '../api/auth'
import { 
  FiMonitor, 
  FiGlobe, 
  FiClock, 
  FiShield, 
  FiXCircle, 
  FiLoader,
  FiActivity,
  FiMapPin,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi'
import './SecurityNexus.css'

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const load = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const data = await authAPI.getSessions()
      setSessions(data)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to retrieve active session data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const revoke = async (id) => {
    if (!window.confirm('Are you sure you want to terminate this session? You will be logged out on that device.')) return
    
    try {
      await authAPI.revokeSession(id)
      setMessage({ type: 'success', text: 'Session terminated successfully' })
      load()
    } catch {
      setMessage({ type: 'error', text: 'Failed to revoke session' })
    }
  }

  return (
    <div className="security-container">
      <div className="security-header animate-fade-in">
        <h1 className="security-title">Access Nodes</h1>
        <p className="security-subtitle">
          Monitor and manage your active connections. Terminate unauthorized or old sessions 
          to maintain your identity's integrity.
        </p>
      </div>

      {message.text && (
        <div className={`status-msg ${message.type} animate-fade-in`}>
          {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="security-card main-shield animate-fade-in">
        <div className="card-title justify-between">
          <div className="flex items-center gap-3">
            <FiActivity className="text-emerald-400" />
            <span>Active Connections</span>
          </div>
          <button onClick={load} className="btn-icon" title="Refresh">
            <FiLoader className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && !sessions.length ? (
          <div className="flex flex-col items-center py-20 opacity-50">
            <FiLoader size={40} className="animate-spin mb-4" />
            <p className="animate-pulse">Scanning network nodes...</p>
          </div>
        ) : (
          <div className="session-table-wrapper">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Device & Platform</th>
                  <th>IP Address</th>
                  <th>Timeline</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className={s.revoked ? 'opacity-50' : ''}>
                    <td>
                      <div className="device-info">
                        <div className="device-icon">
                          <FiMonitor />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{s.device_info || 'Unknown Device'}</p>
                          <p className="text-[10px] uppercase tracking-widest opacity-60">System Core</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-sm">
                        <FiGlobe className="opacity-40" />
                        <span className="ip-address">{s.ip_address}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs">
                          <FiClock className="opacity-40" />
                          <span>Started: {new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                           <FiActivity className="opacity-40" />
                           <span>Active: {new Date(s.last_seen).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${s.revoked ? 'revoked' : 'active'}`}>
                        {s.revoked ? 'Terminated' : 'Active Channel'}
                      </span>
                    </td>
                    <td>
                      {!s.revoked && (
                        <button 
                          onClick={() => revoke(s.id)} 
                          className="btn-icon text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                          title="Revoke Access"
                        >
                          <FiXCircle />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && sessions.length === 0 && (
           <div className="py-20 text-center opacity-50">
              <FiShield size={40} className="mx-auto mb-4" />
              <p>No active sessions detected.</p>
           </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
         <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
            <FiShield />
         </div>
         <div>
            <h4 className="text-sm font-bold text-white mb-1">Security Recommendation</h4>
            <p className="text-xs text-tertiary leading-relaxed">
               If you notice a device or IP address you don't recognize, terminate the session immediately and update your password. 
               We recommend using <strong>Multi-Factor Authentication</strong> for maximum node security.
            </p>
         </div>
      </div>
    </div>
  )
}
