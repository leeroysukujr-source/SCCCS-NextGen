import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { roomsAPI } from '../../api/rooms'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { usePrompt, useNotify } from '../../components/NotificationProvider'
import { useAuthStore } from '../../store/authStore'
import { FiVideo, FiPlusSquare, FiCalendar, FiClock, FiUsers, FiTrendingUp, FiArrowRight, FiCheckCircle } from 'react-icons/fi'

export default function VideoBuddyHome() {
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', 'home'],
    queryFn: roomsAPI.getRooms,
  })

  const navigate = useNavigate()
  const prompt = usePrompt()
  const notify = useNotify()
  const { user } = useAuthStore()

  // Access the context provided by VideoBuddy layout if any, 
  // though we can also just use local navigation
  const { setCreateOpen } = useOutletContext() || {}

  const handleStart = async () => {
    try {
      const durationInput = await prompt('Enter meeting duration in minutes (default: 60)')
      const duration = durationInput ? parseInt(durationInput, 10) : 60

      if (isNaN(duration) || duration <= 0) {
        notify('error', 'Please enter a valid duration')
        return
      }

      const room = await roomsAPI.createRoom({
        name: `${user?.username || 'My'}'s Quick Meeting`,
        duration_minutes: duration
      })
      if (room && room.id) navigate(`/meeting/${room.id}`)
    } catch (err) {
      console.error('Failed to start quick room', err)
      notify('error', 'Failed to start room')
    }
  }

  const handleJoin = async () => {
    const code = await prompt('Enter meeting code or ID')
    if (!code) return
    try {
      // Direct nav usually works if ID is known
      navigate(`/meeting/${code}`)
    } catch (e) {
      notify('error', 'Invalid meeting code')
    }
  }

  const handleSchedule = () => {
    if (setCreateOpen) setCreateOpen(true)
    else navigate('/video-room/calendar')
  }

  // Process data
  const upcoming = (rooms || [])
    .filter(r => r.start_time && new Date(r.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5)

  const invitations = (rooms || []).filter(r => r.invitation && !r.accepted).slice(0, 3)
  const hostedCount = (rooms || []).filter(r => r.is_host).length

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="vb-home-container">

      {/* Header */}
      <header className="vb-header">
        <h1 className="vb-greeting">{getGreeting()}, {(user?.first_name && user.first_name !== 'Admin') ? user.first_name : (user?.role === 'student' ? 'Student' : (user?.role === 'teacher' ? 'Lecturer' : (user?.username || 'Guest')))}.</h1>
        <p className="vb-subtitle">Ready to connect? Here's what's happening today.</p>
      </header>

      {/* Hero Actions */}
      <section className="vb-actions-grid">
        <div className="vb-action-card vb-action-new" onClick={handleStart}>
          <div className="vb-action-icon-box">
            <FiVideo />
          </div>
          <div>
            <h3>New Meeting</h3>
            <p>Start an instant meeting</p>
          </div>
          <div className="absolute top-4 right-4 text-white/20">
            <FiArrowRight size={20} />
          </div>
        </div>

        <div className="vb-action-card vb-action-join" onClick={handleJoin}>
          <div className="vb-action-icon-box">
            <FiPlusSquare />
          </div>
          <div>
            <h3>Join Meeting</h3>
            <p>Enter via code or link</p>
          </div>
        </div>

        <div className="vb-action-card vb-action-cal" onClick={handleSchedule}>
          <div className="vb-action-icon-box">
            <FiCalendar />
          </div>
          <div>
            <h3>Schedule</h3>
            <p>Plan for later</p>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="vb-info-grid">

        {/* Left Column: Agenda */}
        <div className="vb-glass-card">
          <div className="vb-section-title">
            <FiClock className="text-blue-400" /> Upcoming Meetings
          </div>

          <div className="vb-agenda-content">
            {isLoading ? (
              <div className="vb-no-active">Loading schedule...</div>
            ) : upcoming.length > 0 ? (
              <div className="flex flex-col gap-2">
                {upcoming.map(meeting => (
                  <div key={meeting.id} className="vb-list-item cursor-pointer" onClick={() => navigate(`/meeting/${meeting.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-10 rounded-full bg-blue-500"></div>
                      <div>
                        <div className="font-bold text-lg text-slate-200">{meeting.name || 'Untitled Meeting'}</div>
                        <div className="text-sm text-slate-400">ID: {meeting.id}</div>
                      </div>
                    </div>
                    <div className="vb-list-time">
                      {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="vb-no-active">
                <FiCheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p>You have no upcoming meetings.</p>
                <p className="text-sm">Enjoy your free time!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & Invites */}
        <div className="flex flex-col gap-6">

          {/* Insights Card */}
          <div className="vb-glass-card !bg-gradient-to-br from-emerald-900/10 to-teal-900/10">
            <div className="vb-stat-card">
              <div>
                <div className="vb-section-title !mb-2">
                  <FiTrendingUp className="text-emerald-400" /> Weekly Insights
                </div>
                <div className="vb-stat-num">{hostedCount}</div>
              </div>
              <div className="vb-stat-label">
                Meetings hosted this week
              </div>
            </div>
          </div>

          {/* Invitations Card */}
          <div className="vb-glass-card flex-1">
            <div className="vb-section-title">
              <FiUsers className="text-purple-400" /> Invitations
            </div>
            {invitations.length > 0 ? (
              <div className="flex flex-col gap-2">
                {invitations.map(inv => (
                  <div key={inv.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="font-bold text-sm text-slate-200 mb-1">{inv.name}</div>
                    <div className="text-xs text-slate-400 mb-3">Invited by {inv.inviter_name || 'Someone'}</div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 bg-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500">Accept</button>
                      <button className="flex-1 py-1.5 bg-white/10 rounded-lg text-xs font-bold hover:bg-white/20">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="vb-no-active">No pending invitations</div>
            )}
          </div>
        </div>

      </section>

    </div>
  )
}
