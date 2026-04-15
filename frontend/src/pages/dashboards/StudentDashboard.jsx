import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { getFullImageUrl } from '../../utils/api'
import { useNotify } from '../../components/NotificationProvider'
import { roomsAPI } from '../../api/rooms'
import { channelsAPI } from '../../api/channels'
import { classesAPI } from '../../api/classes'
import {
  FiVideo, FiPlus, FiBook, FiClock,
  FiArrowRight, FiAward, FiCheckCircle,
  FiCode, FiLayers, FiCpu, FiGlobe, FiZap, FiTarget, FiPieChart, FiShield,
  FiUser, FiUsers, FiMessageSquare
} from 'react-icons/fi'
import '../Dashboard.css'
import QuickAccess from '../../components/QuickAccess'
import StatsGrid from '../../components/StatsGrid'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [roomCode, setRoomCode] = useState('')
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

  // Get classes user is enrolled in
  const myClasses = classes // Students see all classes they can join

  const stats = {
    enrolledClasses: myClasses.length,
    upcomingMeetings: rooms.filter(r =>
      r.meeting_type === 'scheduled' &&
      r.scheduled_at &&
      new Date(r.scheduled_at) > new Date()
    ).length,
    activeMeetings: rooms.filter(r => r.is_active).length,
    recentActivity: 12,
  }

  const upcomingMeetings = rooms
    .filter(r => r.meeting_type === 'scheduled' && r.scheduled_at)
    .map(r => ({
      ...r,
      scheduledDate: new Date(r.scheduled_at)
    }))
    .filter(r => r.scheduledDate > new Date())
    .sort((a, b) => a.scheduledDate - b.scheduledDate)
    .slice(0, 5)

  const handleJoinRoom = async () => {
    if (!roomCode) return
    try {
      const room = await roomsAPI.joinRoom(roomCode)
      navigate(`/meeting/${room.id}`)
    } catch (error) {
      notify('error', error.response?.data?.error || 'Failed to join room')
    }
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

  return (
    <div className="dashboard-modern">
      <div className="dashboard-content-wrapper">

        {/* Main Content Area */}
        <div className="dashboard-main">
          {/* Workspace Identity Section */}
          {user?.workspace_id && (
            <div
              className="workspace-identity-header"
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer' }}
              title="Go to Profile Settings"
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
                    <FiUser size={14} /> Student
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Section */}
          <div className="welcome-section">
            <h1 className="welcome-title">
              {getGreeting()}, {(user?.first_name && user.first_name !== 'Admin') ? user.first_name : (user?.role === 'student' ? 'Student' : user?.username)} 👋
            </h1>
            <p className="welcome-subtitle">Ready to learn today?</p>
          </div>

          {/* Quick Actions Grid (QuickAccess) */}
          <QuickAccess
            actions={[
              { title: 'Join Meeting', subtitle: 'Join with code or link', icon: <FiPlus size={18} />, onClick: () => document.getElementById('join-input')?.focus() },
              { title: 'My Classes', subtitle: 'View your classes', icon: <FiBook size={18} />, onClick: () => navigate('/classes') },
              { title: 'Team Chat', subtitle: 'Connect with peers', icon: <FiMessageSquare size={18} />, onClick: () => navigate('/chat') },
              { title: 'My Progress', subtitle: 'View achievements', icon: <FiAward size={18} />, onClick: () => navigate('/profile') },
              { title: 'GPA Calculator', subtitle: 'Track grades and progress', icon: <FiPieChart size={18} />, onClick: () => navigate('/gpa') }
            ]}
          />

          {/* Join Meeting Input */}
          <div className="join-section">
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

          {/* Statistics Cards (StatsGrid) */}
          <StatsGrid
            stats={[
              { value: stats.enrolledClasses, label: 'Enrolled Classes', icon: <FiBook />, trend: 'Active' },
              { value: stats.upcomingMeetings, label: 'Upcoming', icon: <FiVideo />, trend: 'Scheduled' },
              { value: stats.recentActivity, label: 'This Week', icon: <FiCheckCircle />, trend: '+3' },
              { value: stats.activeMeetings, label: 'Active Now', icon: <FiUsers />, trend: 'Live' }
            ]}
          />

          {/* My Classes */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                <FiBook /> My Classes
              </h2>
              <button className="section-action" onClick={() => navigate('/classes')}>
                View All <FiArrowRight />
              </button>
            </div>
            <div className="classes-grid">
              {myClasses.slice(0, 8).map((classItem, index) => {
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
              {myClasses.length === 0 && (
                <div className="empty-state">
                  <FiBook className="empty-icon" />
                  <p>You're not enrolled in any classes yet</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/classes')}
                  >
                    Browse Classes
                  </button>
                </div>
              )}
            </div>
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
                  <p>No meetings yet. Join your first meeting!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="dashboard-sidebar">
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
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="sidebar-widget">
            <div className="widget-header">
              <h3>Quick Links</h3>
            </div>
            <div className="quick-actions-sidebar">
              <button
                className="quick-action-btn"
                onClick={() => navigate('/classes')}
              >
                <FiBook /> Browse Classes
              </button>
              <button
                className="quick-action-btn"
                onClick={() => navigate('/chat')}
              >
                <FiMessageSquare /> Join Chat
              </button>
              <button
                className="quick-action-btn"
                onClick={() => navigate('/profile')}
              >
                <FiAward /> View Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

