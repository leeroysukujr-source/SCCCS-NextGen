import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getApiUrl } from '../utils/api'
import { FiVideo, FiUser, FiArrowRight, FiLock } from 'react-icons/fi'
import './JoinMeeting.css'

export default function JoinMeeting() {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [guestName, setGuestName] = useState('')
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (roomCode) {
      fetchRoomInfo()
    }
  }, [roomCode])

  const fetchRoomInfo = async () => {
    try {
      setLoading(true)
      const apiURL = getApiUrl()
      const response = await fetch(`${apiURL}/rooms/join/${roomCode}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Room not found')
      }
      const roomData = await response.json()
      setRoom(roomData)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load room information')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!isAuthenticated && !guestName.trim()) {
      setError('Please enter your name to join as a guest')
      return
    }

    setJoining(true)
    setError('')

    try {
      if (isAuthenticated) {
        // Authenticated user - use normal join
        const token = localStorage.getItem('auth-storage') 
          ? JSON.parse(localStorage.getItem('auth-storage')).state.token 
          : ''
        
        const apiURL = getApiUrl()
        const response = await fetch(`${apiURL}/rooms/join/${roomCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to join meeting')
        }

        const roomData = await response.json()
        navigate(`/meeting/${roomData.id}`)
      } else {
        // Guest user - use public join
        const apiURL = getApiUrl()
        const response = await fetch(`${apiURL}/rooms/public/join/${roomCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ guest_name: guestName.trim() })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to join meeting')
        }

        const data = await response.json()
        // Store guest info in sessionStorage
        sessionStorage.setItem('guest_name', guestName.trim())
        sessionStorage.setItem('guest_room', roomCode)
        navigate(`/meeting/${data.room.id}?guest=true`)
      }
    } catch (err) {
      setError(err.message || 'Failed to join meeting')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="join-meeting-page">
        <div className="join-container">
          <div className="spinner"></div>
          <p>Loading meeting information...</p>
        </div>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="join-meeting-page">
        <div className="join-container error-state">
          <FiLock className="error-icon" />
          <h1>Meeting Not Found</h1>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="join-meeting-page">
      <div className="join-container">
        <div className="join-header">
          <FiVideo className="meeting-icon" />
          <h1>Join Meeting</h1>
          {room && (
            <div className="meeting-info">
              <h2>{room.name}</h2>
              {room.description && <p className="meeting-description">{room.description}</p>}
              <div className="meeting-details">
                <span className="meeting-code">Code: {room.room_code}</span>
                {room.host && (
                  <span className="meeting-host">Host: {room.host.first_name || room.host.username}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!isAuthenticated && (
          <div className="guest-form">
            <label htmlFor="guestName">
              <FiUser /> Your Name
            </label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name to join as a guest"
              className="input"
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            />
            <p className="guest-note">
              You're joining as a guest. Sign in for full features.
            </p>
          </div>
        )}

        {isAuthenticated && (
          <div className="user-info">
            <FiUser />
            <span>Joining as: {user?.first_name || user?.username}</span>
          </div>
        )}

        <button
          className="btn-join"
          onClick={handleJoin}
          disabled={joining || (!isAuthenticated && !guestName.trim())}
        >
          {joining ? (
            <>
              <div className="spinner-small"></div>
              Joining...
            </>
          ) : (
            <>
              <FiArrowRight /> Join Meeting
            </>
          )}
        </button>

        {!isAuthenticated && (
          <div className="auth-prompt">
            <p>Have an account?</p>
            <button className="btn-link" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

