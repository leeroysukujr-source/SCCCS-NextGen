import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { roomsAPI } from '../api/rooms'
import { channelsAPI } from '../api/channels'
import { classesAPI } from '../api/classes'
import { usersAPI } from '../api/users'
import { authAPI } from '../api/auth'
import { getSocketUrl } from '../utils/api'
import { useSocket } from '../contexts/SocketProvider'
import AdminDashboard from './dashboards/AdminDashboard'
import SuperAdminDashboard from './dashboards/SuperAdminDashboard'
import TeacherDashboard from './dashboards/TeacherDashboard'
import StudentDashboard from './dashboards/StudentDashboard'
import './Dashboard.css'

export default function Dashboard() {
  const { user, token, hasHydrated, updateUser, updateUserRole, updateUserPrivileges, refreshUser } = useAuthStore()
  const navigate = useNavigate()
  const [loadError, setLoadError] = useState(null)

  // Proactively fetch the latest user profile when a token exists
  const {
    data: fetchedUser,
    isLoading: loadingUser,
    isError: userFetchError
  } = useQuery({
    queryKey: ['current-user', token],
    queryFn: async () => {
      if (!token) return null
      // Log for audit
      console.log('[Dashboard] Refreshing user profile to ensure session integrity...')
      const data = await authAPI.getCurrentUser()
      return data
    },
    // Only fetch if we don't have a user or if the user data is extremely old
    enabled: !!token && hasHydrated && !user, 
    staleTime: 5 * 60 * 1000, // 5 minutes of cache validity
    refetchOnWindowFocus: false,
    retry: 1,
    onSuccess: (data) => {
      if (data) {
        updateUser(data)
        setLoadError(null)
      }
    },
    onError: (error) => {
      console.error('[Dashboard] Failed to load current user via query:', error)
      const message = error?.response?.data?.error || error?.message || 'Unable to load user profile.'
      setLoadError(message)
    }
  })

  const effectiveUser = user || fetchedUser

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!hasHydrated) return
    if (!token) {
      navigate('/login')
    }
  }, [token, hasHydrated, navigate])

  // Set up Socket.IO listener for real-time role/privilege updates
  // IMPORTANT: This hook must be called before any early returns
  const { socket: sharedSocket } = useSocket()

  useEffect(() => {
    if (!sharedSocket || !token || !effectiveUser) return

    const socket = sharedSocket
    socket.off('connect').on('connect', () => {
      console.log('[Dashboard] Socket connected for role updates')
    })

    socket.off('connect_error').on('connect_error', (error) => {
      console.warn('[Dashboard] Socket connection error:', error?.message || error)
    })

    socket.off('user_role_updated').on('user_role_updated', async (data) => {
      console.log('[Dashboard] Role updated:', data)
      if (data.user_id === effectiveUser.id) {
        const notification = document.createElement('div')
        notification.className = 'role-update-notification'
        notification.innerHTML = `
          <div class="notification-content">
            <strong>Role Updated!</strong>
            <p>Your role has been changed to <strong>${data.new_role}</strong>. Refreshing dashboard...</p>
          </div>
        `
        document.body.appendChild(notification)
        try {
          const freshUserData = await refreshUser()
          if (freshUserData) {
            updateUserRole(data.new_role)
            setTimeout(() => { window.location.reload() }, 1500)
          } else {
            setTimeout(() => { window.location.reload() }, 1500)
          }
        } catch (error) {
          console.error('[Dashboard] Error refreshing user after role update:', error)
          setTimeout(() => { window.location.reload() }, 1500)
        }
      }
    })

    socket.off('user_privileges_updated').on('user_privileges_updated', (data) => {
      console.log('[Dashboard] Privileges updated:', data)
      if (data.user_id === user.id) {
        updateUserPrivileges(data.new_privileges)
        const notification = document.createElement('div')
        notification.className = 'role-update-notification'
        notification.innerHTML = `
          <div class="notification-content">
            <strong>Privileges Updated!</strong>
            <p>Your privileges have been updated. Changes are now active.</p>
          </div>
        `
        document.body.appendChild(notification)
      }
    })

    return () => {
      try {
        socket.off('connect')
        socket.off('connect_error')
        socket.off('user_role_updated')
        socket.off('user_privileges_updated')
      } catch (e) { }
    }
  }, [sharedSocket, token, effectiveUser])

  // Handle user loading and error states
  if (!hasHydrated || (!effectiveUser && loadingUser)) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner"></div>
        <p className="text-secondary font-medium">Loading dashboard...</p>
      </div>
    )
  }

  if (!effectiveUser && (userFetchError || loadError)) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', padding: '2rem' }}>
        <div className="glass-panel p-8 rounded-2xl text-center max-w-md">
          <h2 className="text-xl font-bold text-danger mb-4">Unable to load your dashboard</h2>
          <p className="text-secondary mb-6">{loadError || 'Please log in again.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!effectiveUser) {
    return null
  }

  const role = (effectiveUser?.role || 'student').toLowerCase()

  console.log('[Dashboard] Rendering for role:', role, 'User:', user)

  // Route to appropriate dashboard based on role
  if (role === 'super_admin') {
    return <SuperAdminDashboard />
  } else if (role === 'admin') {
    return <AdminDashboard />
  } else if (role === 'teacher') {
    return <TeacherDashboard />
  } else {
    return <StudentDashboard />
  }
}
