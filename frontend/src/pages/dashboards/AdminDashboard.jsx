import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { roomsAPI } from '../../api/rooms'
import { channelsAPI } from '../../api/channels'
import { classesAPI } from '../../api/classes'
import { usersAPI } from '../../api/users'
import { studentsAPI } from '../../api/students'
import { directMessagesAPI } from '../../api/directMessages'
import { getFullImageUrl } from '../../utils/api'
import { feedbackAPI } from '../../api/feedback'
import {
  FiVideo, FiPlus, FiCalendar, FiSearch, FiUsers,
  FiMessageCircle, FiBook, FiSettings,
  FiClock, FiArrowRight, FiMail, FiCode, FiLayers,
  FiCpu, FiGlobe, FiZap, FiTarget, FiPieChart, FiShield, FiUser, FiAlertCircle
} from 'react-icons/fi'
import CreateMeetingModal from '../../components/CreateMeetingModal'
import BroadcastEmailModal from '../../components/BroadcastEmailModal'
import { useNotify } from '../../components/NotificationProvider'
import QuickAccess from '../../components/QuickAccess'
import StatsGrid from '../../components/StatsGrid'
import ActiveRooms from '../../components/ActiveRooms'
import InstitutionalStats from '../../components/InstitutionalStats'
import LiveActivityFeed from '../../components/LiveActivityFeed'
import '../Dashboard.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [roomCode, setRoomCode] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showInstantMeetingModal, setShowInstantMeetingModal] = useState(false)
  const [showBroadcastEmailModal, setShowBroadcastEmailModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const notify = useNotify()

  const { data: rooms = [], error: roomsError } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsAPI.getRooms,
    retry: 1,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    refetchIntervalInBackground: true,
    onError: (error) => {
      console.error('Error fetching rooms:', error)
    }
  })

  const { data: channels = [], error: channelsError } = useQuery({
    queryKey: ['channels'],
    queryFn: channelsAPI.getChannels,
    retry: 1,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    onError: (error) => {
      console.error('Error fetching channels:', error)
    }
  })

  const { data: classes = [], error: classesError } = useQuery({
    queryKey: ['classes'],
    queryFn: classesAPI.getClasses,
    retry: 1,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    onError: (error) => {
      console.error('Error fetching classes:', error)
    }
  })

  const { data: allUsers = [], error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getUsers,
    enabled: user?.role === 'admin' || user?.role === 'super_admin',
    retry: 1,
    refetchInterval: 60000, // Refetch every 60 seconds for users
    refetchIntervalInBackground: true,
    onError: (error) => {
      console.error('Error fetching users:', error)
    }
  })

  const { data: students = [], error: studentsError } = useQuery({
    queryKey: ['students'],
    queryFn: studentsAPI.getStudents,
    enabled: user?.role === 'admin' || user?.role === 'super_admin',
    retry: 1,
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
    onError: (error) => {
      console.error('Error fetching students:', error)
    }
  })

  // Get all direct messages conversations (admins see all)
  const { data: conversations = [] } = useQuery({
    queryKey: ['directMessages', 'conversations'],
    queryFn: directMessagesAPI.getConversations,
    enabled: user?.role === 'admin' || user?.role === 'super_admin',
    retry: 1,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  })

  // Get all feedbacks (admins see all)
  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: feedbackAPI.getFeedbacks,
    enabled: user?.role === 'admin' || user?.role === 'super_admin',
    retry: 1,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  })

  // Calculate statistics
  const stats = {
    totalUsers: allUsers.length,
    totalStudents: students.length,
    totalTeachers: allUsers.filter(u => u.role === 'teacher').length,
    totalMeetings: rooms.length,
    activeMeetings: rooms.filter(r => r.is_active).length,
    totalClasses: classes.length,
    totalChannels: channels.length,
    totalConversations: conversations.length,
    totalFeedbacks: feedbacks.length,
    pendingFeedbacks: feedbacks.filter(fb => fb.status === 'pending').length,
    unreadConversations: conversations.filter(c => c.unread_count > 0).length,
  }

  // Get upcoming scheduled meetings
  const upcomingMeetings = rooms
    .filter(r => r.meeting_type === 'scheduled' && r.scheduled_at)
    .map(r => ({
      ...r,
      scheduledDate: new Date(r.scheduled_at)
    }))
    .filter(r => r.scheduledDate > new Date())
    .sort((a, b) => a.scheduledDate - b.scheduledDate)
    .slice(0, 5)

  const handleCreateInstantMeeting = async (meetingData) => {
    try {
      const room = await roomsAPI.createRoom({
        name: meetingData.name || `Meeting with ${user?.first_name || user?.username}`,
        description: meetingData.description,
        meeting_type: 'instant',
        max_participants: meetingData.max_participants || 100
      })
      setShowInstantMeetingModal(false)
      navigate(`/meeting/${room.id}`)
    } catch (error) {
      console.error('Failed to create room:', error)
      notify('error', error.response?.data?.error || 'Failed to create meeting')
    }
  }

  const handleScheduleMeeting = async (meetingData) => {
    try {
      const room = await roomsAPI.createScheduledMeeting({
        name: meetingData.name,
        scheduled_at: meetingData.scheduled_at,
        description: meetingData.description,
        max_participants: meetingData.max_participants || 100
      })

      setShowScheduleModal(false)
      queryClient.invalidateQueries(['rooms'])
      notify('success', 'Meeting scheduled successfully!')
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      notify('error', error.response?.data?.error || 'Failed to schedule meeting')
    }
  }

  const handleJoinRoom = async () => {
    if (!roomCode) return
    try {
      const room = await roomsAPI.joinRoom(roomCode)
      navigate(`/meeting/${room.id}`)
    } catch (error) {
      notify('error', error.response?.data?.error || 'Failed to join room')
    }
  }

  const handleShareScreen = () => {
    notify('info', 'Screen sharing will start a new meeting. Feature coming soon!')
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Get icon for class based on index for variety
  const getClassIcon = (index) => {
    const icons = [FiBook, FiCode, FiLayers, FiCpu, FiGlobe, FiZap, FiTarget, FiPieChart, FiShield]
    return icons[index % icons.length]
  }

  console.log('[AdminDashboard] Rendering, user:', user, 'rooms:', rooms?.length, 'channels:', channels?.length)

  return (
    <div className="dashboard-modern">
      <div className="dashboard-content-wrapper">
        {/* Main Content Area */}
        <div className="dashboard-main">
          {/* Workspace Identity Section */}
          {user?.workspace_id && (
            <div
              className="workspace-identity-header"
              onClick={() => navigate('/admin/settings')}
              style={{ cursor: 'pointer' }}
              title="Go to System Settings"
            >
              <div className="workspace-logo-container">
                {user.workspace_logo ? (
                  <img src={getFullImageUrl(user.workspace_logo)} alt={user.workspace_name} className="workspace-logo-img" />
                ) : (
                  <div className="workspace-logo-placeholder">
                    <FiGlobe size={24} />
                  </div>
                )}
              </div>
              <div className="workspace-details">
                <div className="workspace-name-row">
                  <h1 className="workspace-name">{user.workspace_name}</h1>
                  <span className={`workspace-status-badge ${user.workspace_status || 'active'}`}>
                    {(user.workspace_status || 'active').toUpperCase()}
                  </span>
                </div>
                <div className="workspace-meta">
                  <span className="workspace-code-chip">
                    <FiCode size={14} /> {user.workspace_code || 'W-001'}
                  </span>
                  <span className="workspace-role-chip">
                    <FiShield size={14} /> {user.role === 'admin' ? 'Workspace Admin' : user.role === 'super_admin' ? 'Platform Super Admin' : user.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {(user?.role === 'admin' || user?.role === 'super_admin') && <InstitutionalStats workspaceId={user.workspace_id} />}

          {/* Top Agenda + Actions Layout */}
          <div className="agenda-layout">
            <div className="agenda-card">
              <h3 className="agenda-title">Your agenda today</h3>
              {upcomingMeetings.length > 0 ? (
                <div className="agenda-list">
                  {upcomingMeetings.map((m) => (
                    <div key={m.id} className="agenda-item">
                      <div className="agenda-item-left">
                        <div className="agenda-item-title">{m.name}</div>
                        <div className="agenda-item-sub">{formatTime(m.scheduled_at)}</div>
                      </div>
                      <div className="agenda-item-right">
                        <button className="btn-sm" onClick={() => navigate(`/meeting/${m.id}`)}>Join</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="agenda-empty">No meetings today</div>
              )}
            </div>

            <div className="agenda-actions">
              <button className="action-large" onClick={() => setShowInstantMeetingModal(true)} title="Start an instant meeting">
                <div className="action-icon">
                  <FiVideo size={18} />
                </div>
                <span>Start a meeting</span>
              </button>
              <button className="action-large" onClick={() => document.getElementById('join-input')?.focus()} title="Join with code or link">
                <div className="action-icon">
                  <FiPlus size={18} />
                </div>
                <span>Join a meeting</span>
              </button>
              <button className="action-large" onClick={() => setShowScheduleModal(true)} title="Schedule for later">
                <div className="action-icon">
                  <FiCalendar size={18} />
                </div>
                <span>Schedule a meeting</span>
              </button>
            </div>
          </div>

          {/* Join Meeting Input (compact) */}
          <div className="join-section compact-join">
            <div className="join-input-group">
              <input
                id="join-input"
                type="text"
                placeholder="Enter meeting code or link"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="join-input"
              />
              <button className="join-btn" onClick={handleJoinRoom}>
                Join
              </button>
            </div>
          </div>


          {/* Statistics Cards (using StatsGrid component) */}
          <StatsGrid
            stats={[
              { value: stats.totalUsers, label: 'Total Users', icon: <FiUsers /> },
              { value: stats.totalStudents, label: 'Students', icon: <FiUsers /> },
              { value: stats.activeMeetings, label: 'Active Meetings', icon: <FiVideo />, trend: 'Live' },
              { value: stats.totalClasses, label: 'Classes', icon: <FiBook /> },
              { value: stats.totalConversations, label: 'Conversations', icon: <FiMessageCircle />, trend: stats.unreadConversations > 0 ? `${stats.unreadConversations} unread` : '' },
              { value: stats.totalFeedbacks, label: 'Feedbacks', icon: <FiAlertCircle />, trend: stats.pendingFeedbacks > 0 ? `${stats.pendingFeedbacks} pending` : '' }
            ]}
          />

          {/* Live Activity Feed */}
          <div className="section-card" style={{ padding: 0, overflow: 'hidden', height: '400px', marginBottom: '1.5rem', background: '#0f172a', border: 'none' }}>
            <LiveActivityFeed workspaceId={user?.workspace_id} />
          </div>

          {/* Recent Meetings Link */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                <FiVideo /> Recent Meetings
              </h2>
              <button
                className="section-action"
                onClick={() => navigate('/meetings')}
              >
                View All <FiArrowRight />
              </button>
            </div>
            <div className="meetings-preview">
              {rooms.length > 0 ? (
                <div className="meetings-summary">
                  <p className="summary-text">
                    You have <strong>{rooms.length}</strong> meeting{rooms.length !== 1 ? 's' : ''} in your history.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/meetings')}
                  >
                    View All Meetings <FiArrowRight />
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <FiVideo className="empty-icon" />
                  <p>No meetings yet. Start your first meeting!</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages & Feedback Overview */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                <FiMessageCircle /> Messages & Feedback
              </h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="section-action" onClick={() => navigate('/direct-messages')}>
                  Messages <FiArrowRight />
                </button>
                <button className="section-action" onClick={() => navigate('/feedback')}>
                  Feedback <FiArrowRight />
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div
                className="admin-quick-card"
                onClick={() => navigate('/direct-messages')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    padding: '1rem',
                    color: 'white'
                  }}>
                    <FiMessageCircle size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                      {stats.totalConversations}
                    </div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                      Total Conversations
                    </div>
                    {stats.unreadConversations > 0 && (
                      <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {stats.unreadConversations} unread
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="admin-quick-card"
                onClick={() => navigate('/feedback')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '12px',
                    padding: '1rem',
                    color: 'white'
                  }}>
                    <FiAlertCircle size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                      {stats.totalFeedbacks}
                    </div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                      Total Feedbacks
                    </div>
                    {stats.pendingFeedbacks > 0 && (
                      <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {stats.pendingFeedbacks} pending
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Classes */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                <FiBook /> Classes
              </h2>
              <button className="section-action" onClick={() => navigate('/classes')}>
                View All <FiArrowRight />
              </button>
            </div>
            <div className="classes-grid">
              {classes.slice(0, 8).map((classItem, index) => {
                const IconComponent = getClassIcon(index)
                return (
                  <div
                    key={classItem.id}
                    className="class-card"
                    onClick={() => navigate(`/classes/${classItem.id}`)}
                  >
                    <div className="class-header">
                      <div className="class-icon">
                        <IconComponent />
                      </div>
                      <div className="class-info">
                        <h3>{classItem.name}</h3>
                        <p className="lecturer-name">
                          <FiUser size={10} />
                          <span>{classItem.teacher?.full_name || classItem.teacher?.first_name || classItem.teacher?.username || 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="class-footer">
                      <div className="class-meta">
                        <span><FiUsers /> {classItem.member_count || 0}</span>
                      </div>
                      <FiArrowRight />
                    </div>
                  </div>
                )
              })}
              {classes.length === 0 && (
                <div className="empty-state">
                  <FiBook className="empty-icon" />
                  <p>No classes yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="dashboard-sidebar">
          {/* Active Rooms widget (shows currently active video rooms) */}
          <div className="sidebar-widget">
            <ActiveRooms />
          </div>
          {/* Time Widget */}
          <div className="sidebar-widget time-widget">
            <div className="time-display">
              <div className="time">{new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}</div>
              <div className="date">{new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="sidebar-widget">
            <div className="widget-header">
              <h3>Upcoming Meetings</h3>
              <button className="widget-action" onClick={() => setShowScheduleModal(true)}>
                <FiPlus />
              </button>
            </div>
            <div className="upcoming-list">
              {upcomingMeetings.length > 0 ? (
                upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="upcoming-item">
                    <div className="upcoming-time">
                      <FiClock />
                      {formatTime(meeting.scheduled_at)}
                    </div>
                    <div className="upcoming-name">{meeting.name}</div>
                    <button
                      className="upcoming-join"
                      onClick={() => navigate(`/meeting/${meeting.id}`)}
                    >
                      Join <FiArrowRight />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state-small">
                  <p>No upcoming meetings</p>
                  <button
                    className="btn-link"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    Schedule one
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="sidebar-widget">
            <div className="widget-header">
              <h3>Quick Stats</h3>
            </div>
            <div className="quick-stats">
              <div className="quick-stat-item">
                <span className="stat-label">Teachers</span>
                <span className="stat-value">{stats.totalTeachers}</span>
              </div>
              <div className="quick-stat-item">
                <span className="stat-label">Channels</span>
                <span className="stat-value">{stats.totalChannels}</span>
              </div>
              <div className="quick-stat-item">
                <span className="stat-label">Total Meetings</span>
                <span className="stat-value">{stats.totalMeetings}</span>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="sidebar-widget">
            <div className="widget-header">
              <h3>Admin Actions</h3>
            </div>
            <div className="admin-actions">
              <button
                className="admin-action-btn"
                onClick={() => setShowBroadcastEmailModal(true)}
              >
                <FiMail /> Broadcast Email
              </button>
              <button
                className="admin-action-btn"
                onClick={() => navigate('/admin/students')}
              >
                <FiUsers /> Manage Students
              </button>
              <button
                className="admin-action-btn"
                onClick={() => navigate('/admin/users')}
              >
                <FiUsers /> Manage Users
              </button>
              <button
                className="admin-action-btn"
                onClick={() => navigate('/admin/rooms')}
              >
                <FiVideo /> Manage Video Conferences
              </button>
              <button
                className="admin-action-btn"
                onClick={() => navigate('/admin/classes')}
              >
                <FiBook /> Manage Courses
              </button>
              <button
                className="admin-action-btn"
                onClick={() => navigate('/admin/groups')}
              >
                <FiUsers /> Manage Groups
              </button>
              <button
                className="admin-action-btn"
                onClick={() => navigate('/admin/settings')}
              >
                <FiSettings /> System Settings
              </button>
              <button
                className="admin-action-btn"
                onClick={() => navigate('/direct-messages')}
              >
                <FiMessageCircle /> Direct Messages
              </button>
              <button
                className="admin-action-btn"
                onClick={() => navigate('/feedback')}
              >
                <FiAlertCircle /> Feedback & Grievances
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Instant Meeting Modal */}
      <CreateMeetingModal
        isOpen={showInstantMeetingModal}
        onClose={() => setShowInstantMeetingModal(false)}
        onCreate={handleCreateInstantMeeting}
        isScheduled={false}
      />

      {/* Schedule Meeting Modal */}
      <CreateMeetingModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onCreate={handleScheduleMeeting}
        isScheduled={true}
      />

      {/* Broadcast Email Modal */}
      <BroadcastEmailModal
        isOpen={showBroadcastEmailModal}
        onClose={() => setShowBroadcastEmailModal(false)}
      />
    </div>
  )
}

