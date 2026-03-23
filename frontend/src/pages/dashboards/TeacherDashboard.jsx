import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { getFullImageUrl } from '../../utils/api'
import { roomsAPI } from '../../api/rooms'
import { channelsAPI } from '../../api/channels'
import { classesAPI } from '../../api/classes'
import { useNotify } from '../../components/NotificationProvider'
import {
  FiVideo, FiPlus, FiCalendar, FiMonitor, FiSearch, FiUsers,
  FiMessageSquare, FiBook, FiTrendingUp, FiActivity, FiClock,
  FiArrowRight, FiFileText, FiAward, FiUpload, FiEdit, FiBarChart,
  FiSettings, FiFile, FiDownload, FiCheckCircle, FiCode, FiLayers,
  FiCpu, FiGlobe, FiZap, FiTarget, FiPieChart, FiShield, FiUser
} from 'react-icons/fi'
import CreateMeetingModal from '../../components/CreateMeetingModal'
import '../Dashboard.css'
import QuickAccess from '../../components/QuickAccess'
import StatsGrid from '../../components/StatsGrid'

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [roomCode, setRoomCode] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showInstantMeetingModal, setShowInstantMeetingModal] = useState(false)
  const notify = useNotify()

  const { data: rooms = [], error: roomsError } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsAPI.getRooms,
    retry: 1,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    onError: (error) => {
      console.error('Error fetching rooms:', error)
    }
  })

  const { data: channels = [], error: channelsError } = useQuery({
    queryKey: ['channels'],
    queryFn: channelsAPI.getChannels,
    retry: 1,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    onError: (error) => {
      console.error('Error fetching channels:', error)
    }
  })

  const { data: classes = [], error: classesError } = useQuery({
    queryKey: ['classes'],
    queryFn: classesAPI.getClasses,
    retry: 1,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    onError: (error) => {
      console.error('Error fetching classes:', error)
    }
  })

  // Filter classes where user is teacher
  const myClasses = classes.filter(c => c.teacher?.id === user?.id)

  const stats = {
    myClasses: myClasses.length,
    totalStudents: myClasses.reduce((sum, c) => sum + (c.member_count || 0), 0),
    totalLessons: myClasses.reduce((sum, c) => sum + (c.lesson_count || 0), 0),
    upcomingMeetings: rooms.filter(r =>
      r.meeting_type === 'scheduled' &&
      r.scheduled_at &&
      new Date(r.scheduled_at) > new Date()
    ).length,
    activeMeetings: rooms.filter(r => r.is_active).length,
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

  const handleCreateInstantMeeting = async (meetingData) => {
    try {
      const room = await roomsAPI.createRoom({
        name: meetingData.name || `Class Meeting - ${new Date().toLocaleDateString()}`,
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Get icon for class based on index for variety
  const getClassIcon = (index) => {
    const icons = [FiBook, FiCode, FiLayers, FiCpu, FiGlobe, FiZap, FiTarget, FiPieChart, FiShield]
    return icons[index % icons.length]
  }

  return (
    <div className="dashboard-modern teacher-dashboard">
      {/* Top Header Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-left">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search classes, students, lessons..."
              className="search-input"
            />
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-nav">
            <button className="nav-tab active">Home</button>
            <button className="nav-tab" onClick={() => navigate('/chat')}>Team Chat</button>
            <button className="nav-tab" onClick={() => navigate('/classes')}>My Classes</button>
            <button className="nav-tab" onClick={() => navigate('/profile')}>Profile</button>
          </div>
        </div>
      </div>

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
                    <FiUser size={14} /> Lecturer/Staff
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Section */}
          <div className="welcome-section teacher-welcome">
            <div>
              <h1 className="welcome-title">
                {getGreeting()}, {(user?.first_name && user.first_name !== 'Admin') ? user.first_name : (user?.role === 'teacher' ? 'Lecturer' : user?.username)} 👨‍🏫
              </h1>
              <p className="welcome-subtitle">Manage your classes and engage with students</p>
            </div>
            <div className="teacher-badge">
              <FiAward /> Lecturer
            </div>
          </div>

          {/* Quick Actions Grid (QuickAccess) */}
          <QuickAccess
            actions={[
              { title: 'Start Class', subtitle: 'Begin instant class session', icon: <FiVideo size={18} />, onClick: () => setShowInstantMeetingModal(true) },
              { title: 'Create Class', subtitle: 'Add new course', icon: <FiPlus size={18} />, onClick: () => navigate('/classes') },
              { title: 'Schedule', subtitle: 'Plan class meeting', icon: <FiCalendar size={18} />, onClick: () => setShowScheduleModal(true) },
              { title: 'Upload Materials', subtitle: 'Add course notes', icon: <FiUpload size={18} />, onClick: () => navigate('/classes') }
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
              { value: stats.myClasses, label: 'My Classes', icon: <FiBook />, trend: 'Active' },
              { value: stats.totalStudents, label: 'Total Students', icon: <FiUsers />, trend: 'Enrolled' },
              { value: stats.totalLessons, label: 'Lessons Created', icon: <FiFileText />, trend: 'Published' },
              { value: stats.upcomingMeetings, label: 'Upcoming', icon: <FiVideo />, trend: 'Scheduled' }
            ]}
          />

          {/* My Classes - Teacher View */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                <FiBook /> My Classes
              </h2>
              <div className="section-actions">
                <button className="section-action" onClick={() => navigate('/classes')}>
                  <FiPlus /> Create Class
                </button>
                <button className="section-action" onClick={() => navigate('/classes')}>
                  View All <FiArrowRight />
                </button>
              </div>
            </div>
            <div className="classes-grid">
              {myClasses.slice(0, 8).map((classItem, index) => {
                const IconComponent = getClassIcon(index)
                return (
                  <div
                    key={classItem.id}
                    className="class-card teacher-class-card"
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
                        <span><FiFileText /> {classItem.lesson_count || 0}</span>
                      </div>
                      <FiArrowRight />
                    </div>
                  </div>
                )
              })}
              {myClasses.length === 0 && (
                <div className="empty-state">
                  <FiBook className="empty-icon" />
                  <p>You haven't created any classes yet</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/classes')}
                  >
                    <FiPlus /> Create Your First Class
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
                  <p>No meetings yet. Start your first class meeting!</p>
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

          {/* Quick Actions - Teacher Specific */}
          <div className="sidebar-widget">
            <div className="widget-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="quick-actions-sidebar">
              <button
                className="quick-action-btn"
                onClick={() => navigate('/classes')}
              >
                <FiPlus /> Create Class
              </button>
              <button
                className="quick-action-btn"
                onClick={() => navigate('/classes')}
              >
                <FiUpload /> Upload Materials
              </button>
              <button
                className="quick-action-btn"
                onClick={() => setShowInstantMeetingModal(true)}
              >
                <FiVideo /> Start Meeting
              </button>
              <button
                className="quick-action-btn"
                onClick={() => navigate('/chat')}
              >
                <FiMessageSquare /> New Channel
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
    </div>
  )
}
