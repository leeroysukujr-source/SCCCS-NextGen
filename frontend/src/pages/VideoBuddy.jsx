import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { FiHome, FiCalendar, FiVideo, FiUsers, FiLayout, FiSettings } from 'react-icons/fi'
import './VideoBuddyEnhanced.css'
import CreateMeetingModal from '../components/CreateMeetingModal'
import { roomsAPI } from '../api/rooms'
import { usePrompt, useNotify } from '../components/NotificationProvider'

function DockControlBar() {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/video-room') {
      return location.pathname === '/video-room' || location.pathname === '/video-room/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="vb-dock-container">
      <nav className="vb-dock">
        <Link to="/video-room" className={`vb-dock-item ${isActive('/video-room') ? 'active' : ''}`} title="Home">
          <FiHome />
        </Link>
        <Link to="/video-room/calendar" className={`vb-dock-item ${isActive('/video-room/calendar') ? 'active' : ''}`} title="Calendar">
          <FiCalendar />
        </Link>
        <Link to="/video-room/recording" className={`vb-dock-item ${isActive('/video-room/recording') ? 'active' : ''}`} title="Recordings">
          <FiVideo />
        </Link>
        <Link to="/video-room/contacts" className={`vb-dock-item ${isActive('/video-room/contacts') ? 'active' : ''}`} title="Contacts">
          <FiUsers />
        </Link>
        <Link to="/video-room/whiteboard" className={`vb-dock-item ${isActive('/video-room/whiteboard') ? 'active' : ''}`} title="Whiteboards">
          <FiLayout />
        </Link>

        <div className="vb-dock-separator"></div>

        <Link to="/settings" className="vb-dock-item" title="Settings">
          <FiSettings />
        </Link>
      </nav>
    </div>
  )
}

export default function VideoBuddy() {
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const notify = useNotify()

  const handleCreate = async (meetingData) => {
    try {
      const room = await roomsAPI.createRoom(meetingData)
      setCreateOpen(false)
      if (room && room.id) navigate(`/meeting/${room.id}`)
    } catch (err) {
      console.error('Failed to create room', err)
      setCreateOpen(false)
      notify('error', 'Failed to create meeting: ' + (err.message || 'Unknown error'))
    }
  }

  return (
    <div className="vb-root">
      <main className="vb-main">
        <Outlet context={{ setCreateOpen }} />
        <CreateMeetingModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      </main>
      <DockControlBar />
    </div>
  )
}
