import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsAPI } from '../../api/rooms'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { FiVideo, FiSearch, FiTrash2, FiEye, FiCalendar, FiUsers, FiX } from 'react-icons/fi'
import './AdminPages.css'
import { useConfirm, useNotify } from '../../components/NotificationProvider'

export default function ManageRooms() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, active, scheduled, instant

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['admin-rooms'],
    queryFn: roomsAPI.getAllRooms,
    enabled: user?.role === 'admin'
  })

  const notify = useNotify()
  const confirm = useConfirm()

  const deleteMutation = useMutation({
    mutationFn: roomsAPI.deleteRoom,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-rooms'])
      queryClient.invalidateQueries(['rooms'])
      notify('success', 'Room deleted successfully')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to delete room')
    }
  })

  const handleDelete = (roomId, roomName) => {
    ;(async () => {
      const ok = await confirm(`Are you sure you want to delete "${roomName}"? This action cannot be undone and all participants will be removed.`)
      if (ok) deleteMutation.mutate(roomId)
    })()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = 
      room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.room_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'active' && room.is_active) ||
      (filterType === 'scheduled' && room.meeting_type === 'scheduled') ||
      (filterType === 'instant' && room.meeting_type === 'instant')
    
    return matchesSearch && matchesFilter
  })

  if (user?.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="error-message">
            <FiX size={48} />
            <h2>Access Denied</h2>
            <p>You do not have permission to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-left">
            <h1>
              <FiVideo /> Manage Video Conferences
            </h1>
            <p>View and delete previous video conferences</p>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search rooms by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filterType === 'active' ? 'active' : ''}`}
              onClick={() => setFilterType('active')}
            >
              Active
            </button>
            <button
              className={`filter-btn ${filterType === 'scheduled' ? 'active' : ''}`}
              onClick={() => setFilterType('scheduled')}
            >
              Scheduled
            </button>
            <button
              className={`filter-btn ${filterType === 'instant' ? 'active' : ''}`}
              onClick={() => setFilterType('instant')}
            >
              Instant
            </button>
          </div>
        </div>

        {/* Rooms Table */}
        <div className="admin-table-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading rooms...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="empty-state">
              <FiVideo size={48} />
              <h3>No rooms found</h3>
              <p>{searchTerm || filterType !== 'all' ? 'Try adjusting your search or filters' : 'No video conferences have been created yet'}</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Code</th>
                  <th>Host</th>
                  <th>Participants</th>
                  <th>Created At</th>
                  <th>Scheduled At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <div className="room-name-cell">
                        <strong>{room.name || 'Unnamed Meeting'}</strong>
                        {room.description && (
                          <span className="room-description">{room.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${room.meeting_type === 'scheduled' ? 'badge-scheduled' : 'badge-instant'}`}>
                        {room.meeting_type === 'scheduled' ? (
                          <>
                            <FiCalendar /> Scheduled
                          </>
                        ) : (
                          'Instant'
                        )}
                      </span>
                    </td>
                    <td>
                      <code className="room-code">{room.room_code}</code>
                    </td>
                    <td>
                      {room.host?.first_name || room.host?.username || 'Unknown'}
                    </td>
                    <td>
                      <span className="participant-count">
                        <FiUsers /> {room.participant_count || 0}
                      </span>
                    </td>
                    <td>{formatDate(room.created_at)}</td>
                    <td>{room.scheduled_at ? formatDate(room.scheduled_at) : 'N/A'}</td>
                    <td>
                      <span className={`badge ${room.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {room.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          onClick={() => navigate(`/meeting/${room.id}`)}
                          title="View Room"
                        >
                          <FiEye />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(room.id, room.name)}
                          disabled={deleteMutation.isLoading}
                          title="Delete Room"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-label">Total Rooms</span>
            <span className="stat-value">{rooms.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active Rooms</span>
            <span className="stat-value">{rooms.filter(r => r.is_active).length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Scheduled</span>
            <span className="stat-value">{rooms.filter(r => r.meeting_type === 'scheduled').length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Filtered</span>
            <span className="stat-value">{filteredRooms.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

