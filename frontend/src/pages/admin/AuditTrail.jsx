import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiActivity, FiUser, FiGlobe, FiShield, FiClock, FiSearch, FiFilter, FiDownload } from 'react-icons/fi'
import axios from 'axios'
import { getApiBaseUrl } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import './AdminPages.css'

export default function AuditTrail() {
  const { token } = useAuthStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', filter],
    queryFn: async () => {
      const response = await axios.get(`${getApiBaseUrl()}/api/security/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { action: filter === 'all' ? undefined : filter }
      })
      return response.data
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  })

  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.resource_type?.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.username?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (action) => {
    if (!action) return '#6366f1'
    if (action.includes('DELETE') || action.includes('REMOVE')) return '#f43f5e'
    if (action.includes('UPDATE') || action.includes('GRADE')) return '#f59e0b'
    if (action.includes('CREATE')) return '#10b981'
    return '#6366f1'
  }

  return (
    <div className="admin-page-container">
      <div className="admin-header">
        <div className="header-info">
          <h1>Security Audit Engine</h1>
          <p>Real-time institutional traceability and jurisdictional logging.</p>
        </div>
        <div className="header-actions">
          <button className="btn-export">
            <FiDownload /> Export CSV
          </button>
        </div>
      </div>

      <div className="audit-controls">
        <div className="search-bar">
          <FiSearch />
          <input 
            type="text" 
            placeholder="Search action, user, or resource..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="GRADE_CHANGE">Grades</option>
            <option value="ASSIGNMENT_CREATE">Assignments</option>
            <option value="USER_DELETE">Deletions</option>
            <option value="WORKSPACE_BREACH">Security</option>
          </select>
        </div>
      </div>

      <div className="audit-table-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Synchronizing Audit Trail...</p>
          </div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>Resource</th>
                <th>Jurisdiction (IP)</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>
                    <div className="td-time">
                      <FiClock />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <span 
                      className="action-badge"
                      style={{ background: `${getStatusColor(log.action)}20`, color: getStatusColor(log.action), borderColor: getStatusColor(log.action) }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div className="td-user">
                      <FiUser />
                      {log.user?.username || `ID: ${log.user_id}`}
                    </div>
                  </td>
                  <td>
                    <div className="td-resource">
                      <FiShield />
                      {log.resource_type} (#{log.resource_id})
                    </div>
                  </td>
                  <td>
                    <div className="td-ip">
                      <FiGlobe />
                      {log.ip_address}
                    </div>
                  </td>
                  <td>
                    <button className="btn-view-details" onClick={() => alert(JSON.stringify(JSON.parse(log.details_data), null, 2))}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
