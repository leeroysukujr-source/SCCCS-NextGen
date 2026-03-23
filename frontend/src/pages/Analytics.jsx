import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { FiTrendingUp, FiUsers, FiMessageSquare, FiFile, FiActivity } from 'react-icons/fi'
import './Analytics.css'

const analyticsAPI = {
  getUserEngagement: async () => {
    const response = await fetch('/api/analytics/user/engagement', {
      headers: {
        'Authorization': `Bearer ${useAuthStore.getState().token}`
      }
    })
    if (!response.ok) throw new Error('Failed to fetch analytics')
    return response.json()
  },
  getSystemOverview: async () => {
    const response = await fetch('/api/analytics/system/overview', {
      headers: {
        'Authorization': `Bearer ${useAuthStore.getState().token}`
      }
    })
    if (!response.ok) throw new Error('Failed to fetch system overview')
    return response.json()
  }
}

export default function Analytics() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  
  const { data: userEngagement } = useQuery({
    queryKey: ['user-engagement'],
    queryFn: analyticsAPI.getUserEngagement,
    enabled: !isAdmin
  })
  
  const { data: systemOverview } = useQuery({
    queryKey: ['system-overview'],
    queryFn: analyticsAPI.getSystemOverview,
    enabled: isAdmin
  })
  
  if (isAdmin) {
    return <AdminAnalytics data={systemOverview} />
  }
  
  return <UserAnalytics data={userEngagement} />
}

function UserAnalytics({ data }) {
  if (!data) return <div>Loading...</div>
  
  return (
    <div className="analytics-container">
      <h1>Your Activity Analytics</h1>
      <div className="analytics-grid">
        <div className="analytics-card">
          <FiMessageSquare className="card-icon" />
          <div className="card-content">
            <h3>{data.stats?.messages_sent || 0}</h3>
            <p>Messages Sent</p>
          </div>
        </div>
        <div className="analytics-card">
          <FiFile className="card-icon" />
          <div className="card-content">
            <h3>{data.stats?.files_uploaded || 0}</h3>
            <p>Files Uploaded</p>
          </div>
        </div>
        <div className="analytics-card">
          <FiUsers className="card-icon" />
          <div className="card-content">
            <h3>{data.stats?.classes_joined || 0}</h3>
            <p>Classes Joined</p>
          </div>
        </div>
        <div className="analytics-card">
          <FiActivity className="card-icon" />
          <div className="card-content">
            <h3>{data.stats?.total_activities || 0}</h3>
            <p>Total Activities</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminAnalytics({ data }) {
  if (!data) return <div>Loading...</div>
  
  return (
    <div className="analytics-container">
      <h1>System Analytics</h1>
      <div className="analytics-grid">
        <div className="analytics-card">
          <FiUsers className="card-icon" />
          <div className="card-content">
            <h3>{data.overview?.total_users || 0}</h3>
            <p>Total Users</p>
            <span className="sub-text">{data.overview?.active_users || 0} active</span>
          </div>
        </div>
        <div className="analytics-card">
          <FiMessageSquare className="card-icon" />
          <div className="card-content">
            <h3>{data.overview?.total_messages || 0}</h3>
            <p>Total Messages</p>
          </div>
        </div>
        <div className="analytics-card">
          <FiFile className="card-icon" />
          <div className="card-content">
            <h3>{data.overview?.total_files || 0}</h3>
            <p>Total Files</p>
          </div>
        </div>
        <div className="analytics-card">
          <FiActivity className="card-icon" />
          <div className="card-content">
            <h3>{data.overview?.recent_activities_24h || 0}</h3>
            <p>Activities (24h)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

