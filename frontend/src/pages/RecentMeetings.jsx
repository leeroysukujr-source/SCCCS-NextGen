import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsAPI } from '../api/rooms'
import { useAuthStore } from '../store/authStore'
import { 
  FiVideo, FiTrash2, FiClock, FiUsers, FiCalendar, 
  FiArrowRight, FiArrowLeft, FiSearch, FiFilter, FiMoreVertical,
  FiCopy, FiCheck, FiShare2, FiPlay
} from 'react-icons/fi'
import { useConfirm, useNotify } from '../components/NotificationProvider'
import './RecentMeetings.css'

export default function RecentMeetings() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // all, instant, scheduled, active
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showMenu, setShowMenu] = useState(null)
  const [linkCopied, setLinkCopied] = useState(null)
  const notify = useNotify()
  const confirm = useConfirm()

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsAPI.getRooms,
    refetchInterval: 30000,
  })

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId) => roomsAPI.deleteRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms'])
      setShowMenu(null)
      notify('success', 'Meeting deleted successfully')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to delete meeting')
    }
  })

  const handleDelete = async (roomId, roomName) => {
    const ok = await confirm(`Are you sure you want to delete "${roomName}"? This action cannot be undone.`)
    if (!ok) return
    deleteRoomMutation.mutate(roomId)
  }

  const handleCopyLink = async (roomId) => {
    try {
      const linkData = await roomsAPI.getMeetingLink(roomId)
      const baseUrl = window.location.origin
      const shareLink = linkData.share_link?.startsWith('http') 
        ? linkData.share_link 
        : `${baseUrl}${linkData.share_link || `/join/${linkData.room_code}`}`
      
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(roomId)
      setTimeout(() => setLinkCopied(null), 2000)
    } catch (error) {
      notify('error', 'Failed to copy link')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return 'Today'
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Filter and sort rooms
  const filteredRooms = rooms
    .filter(room => {
      // Search filter
      const matchesSearch = room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           room.room_code?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Type filter
      let matchesType = true
      if (filterType === 'instant') {
        matchesType = room.meeting_type === 'instant'
      } else if (filterType === 'scheduled') {
        matchesType = room.meeting_type === 'scheduled'
      } else if (filterType === 'active') {
        matchesType = room.is_active === true
      }
      
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      // Sort by created_at descending (newest first)
      const dateA = new Date(a.created_at || 0)
      const dateB = new Date(b.created_at || 0)
      return dateB - dateA
    })

  const isHost = (room) => room.host_id === user?.id
  const canDelete = (room) => isHost(room) || user?.role === 'admin'

  return (
    <div className="recent-meetings">
      <div className="meetings-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <h1>Recent Meetings</h1>
        <p>View and manage your meeting history</p>
      </div>

      <div className="meetings-toolbar">
        <div className="search-filter-group">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <button
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filterType === 'instant' ? 'active' : ''}`}
              onClick={() => setFilterType('instant')}
            >
              Instant
            </button>
            <button
              className={`filter-btn ${filterType === 'scheduled' ? 'active' : ''}`}
              onClick={() => setFilterType('scheduled')}
            >
              Scheduled
            </button>
            <button
              className={`filter-btn ${filterType === 'active' ? 'active' : ''}`}
              onClick={() => setFilterType('active')}
            >
              Active
            </button>
          </div>
        </div>
      </div>

      <div className="meetings-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading meetings...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="empty-state">
            <FiVideo className="empty-icon" />
            <h3>No meetings found</h3>
            <p>
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'You haven\'t created or joined any meetings yet'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Create Your First Meeting
              </button>
            )}
          </div>
        ) : (
          <div className="meetings-grid">
            {filteredRooms.map((room) => (
              <div key={room.id} className="meeting-card">
                <div className="meeting-card-header">
                  <div className="meeting-icon-wrapper">
                    <FiVideo className="meeting-icon" />
                    {room.is_active && (
                      <span className="active-badge">Live</span>
                    )}
                  </div>
                  <div className="meeting-card-actions">
                    <button
                      className="action-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(showMenu === room.id ? null : room.id)
                      }}
                    >
                      <FiMoreVertical />
                    </button>
                    {showMenu === room.id && (
                      <div className="meeting-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="menu-item"
                          onClick={() => {
                            handleCopyLink(room.id)
                            setShowMenu(null)
                          }}
                        >
                          <FiShare2 /> Copy Link
                        </button>
                        {canDelete(room) && (
                          <button
                            className="menu-item danger"
                            onClick={() => {
                              handleDelete(room.id, room.name)
                              setShowMenu(null)
                            }}
                          >
                            <FiTrash2 /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  className="meeting-card-body"
                  onClick={() => navigate(`/meeting/${room.id}`)}
                >
                  <h3 className="meeting-title">{room.name}</h3>
                  <div className="meeting-meta-info">
                    <div className="meta-item">
                      <FiClock />
                      <span>{formatDate(room.created_at)}</span>
                    </div>
                    {room.meeting_type === 'scheduled' && room.scheduled_at && (
                      <div className="meta-item">
                        <FiCalendar />
                        <span>{formatTime(room.scheduled_at)}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <FiUsers />
                      <span>{room.participant_count || 0} participants</span>
                    </div>
                  </div>
                  <div className="meeting-code-display">
                    <span className="code-label">Room Code:</span>
                    <span className="code-value">{room.room_code}</span>
                    <button
                      className="copy-code-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(room.room_code)
                        setLinkCopied(`code-${room.id}`)
                        setTimeout(() => setLinkCopied(null), 2000)
                      }}
                    >
                      {linkCopied === `code-${room.id}` ? <FiCheck /> : <FiCopy />}
                    </button>
                  </div>
                </div>

                <div className="meeting-card-footer">
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/meeting/${room.id}`)}
                  >
                    <FiPlay /> Join Meeting
                  </button>
                  {canDelete(room) && (
                    <button
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(room.id, room.name)
                      }}
                    >
                      <FiTrash2 /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

