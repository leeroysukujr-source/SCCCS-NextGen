import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usersAPI } from '../api/users'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/auth'
import { getApiBaseUrl } from '../utils/api'
import { FiUpload, FiX, FiUser } from 'react-icons/fi'
import './Profile.css'
import { useConfirm, useNotify } from '../components/NotificationProvider'

export default function Profile() {
  const { user: currentUser, updateUser } = useAuthStore()
  const confirm = useConfirm()
  const notify = useNotify()
  const { userId } = useParams()
  const navigate = useNavigate()
  const viewingOther = !!userId && userId !== String(currentUser?.id)
  const [viewUser, setViewUser] = useState(null)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    first_name: currentUser?.first_name || '',
    last_name: currentUser?.last_name || '',
  })
  const [previewUrl, setPreviewUrl] = useState(currentUser?.avatar_url || null)
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  // Update preview when user changes
  useEffect(() => {
    if (viewingOther) {
      // fetch the other user's public profile
      usersAPI.getUser(userId).then(u => {
        setViewUser(u)
        setPreviewUrl(u.avatar_url || null)
      }).catch(err => {
        console.error('Failed to load user profile', err)
        notify('error', 'Failed to load profile')
        navigate('/chat')
      })
    } else {
      if (currentUser?.avatar_url) setPreviewUrl(currentUser.avatar_url)
    }
  }, [currentUser?.avatar_url, viewingOther, userId])

  const updateMutation = useMutation({
    mutationFn: authAPI.updateProfile,
    onSuccess: (data) => {
      updateUser(data)
      queryClient.invalidateQueries(['user'])
      notify('success', 'Profile updated successfully!')
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: authAPI.uploadAvatar,
    onSuccess: (data) => {
      console.log('Avatar upload success:', data)
      // If uploading for current user, update store
      if (!viewingOther) {
        updateUser(data.user)
      }
      // Use the avatar_url from the response, not the data URL
      setPreviewUrl(data.avatar_url || data.user?.avatar_url)
      setUploading(false)
      notify('success', 'Profile picture updated successfully!')
    },
    onError: (error) => {
      console.error('Avatar upload error:', error)
      setUploading(false)
      notify('error', error.response?.data?.error || 'Failed to upload profile picture')
    }
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (viewingOther) return
    updateMutation.mutate(formData)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      notify('error', 'Please select a valid image file (PNG, JPG, GIF, WEBP, or SVG)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify('error', 'File size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(file)

    // Upload file
    setUploading(true)
    uploadAvatarMutation.mutate(file)
  }

  const handleRemoveAvatar = () => {
    confirm('Are you sure you want to remove your profile picture?').then(ok => {
      if (!ok) return
      setPreviewUrl(null)
      updateMutation.mutate({ ...formData, avatar_url: '' })
    })
  }

  const getAvatarUrl = () => {
    if (previewUrl) {
      // If it's a data URL (preview) or starts with http, use it directly
      if (previewUrl.startsWith('data:') || previewUrl.startsWith('http')) {
        return previewUrl
      }
      // Otherwise, construct the full URL
      // The avatar URL from backend is like: /api/files/avatar/filename.jpg
      const baseURL = getApiBaseUrl()
      // If URL already starts with /api, use it as is, otherwise add /api
      if (previewUrl.startsWith('/api')) {
        return `${baseURL}${previewUrl}`
      } else {
        return `${baseURL}/api${previewUrl}`
      }
    }
    return null
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profile Settings</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="avatar-upload-container">
            <div className="profile-avatar-large">
              {getAvatarUrl() ? (
                <img 
                  src={getAvatarUrl()} 
                  alt="Profile" 
                  className="avatar-image"
                  onError={(e) => {
                    console.error('Failed to load avatar:', getAvatarUrl())
                    // Fallback to initial if image fails to load
                    e.target.style.display = 'none'
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex'
                    }
                  }}
                  onLoad={() => {
                    console.log('Avatar loaded successfully:', getAvatarUrl())
                  }}
                />
              ) : null}
              <div className="avatar-initial" style={{ display: getAvatarUrl() ? 'none' : 'flex' }}>
                {(viewingOther ? viewUser?.first_name?.[0] : currentUser?.first_name?.[0]) || (viewingOther ? viewUser?.username?.[0] : currentUser?.username?.[0]) || 'U'}
              </div>
              {uploading && (
                <div className="avatar-upload-overlay">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
            <div className="avatar-upload-actions">
              <button
                type="button"
                className="btn-upload-avatar"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <FiUpload /> {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              {getAvatarUrl() && (
                <button
                  type="button"
                  className="btn-remove-avatar"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                >
                  <FiX /> Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
          <h2>{(viewingOther ? viewUser?.first_name : currentUser?.first_name) || (viewingOther ? viewUser?.username : currentUser?.username)}</h2>
          <p className="user-email">{viewingOther ? viewUser?.email : currentUser?.email}</p>
          <p className="user-role">Role: {viewingOther ? viewUser?.role : currentUser?.role}</p>
          {viewingOther ? (
            <div className="profile-actions">
              <button className="btn" onClick={() => navigate(`/chat/${/* try to find direct */ ''}`)}>Message</button>
              <button className="btn" onClick={() => { window.open(getAvatarUrl(), '_blank') }}>View Photo</button>
            </div>
          ) : null}
          {!viewingOther && (
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => navigate('/settings/2fa')}>Manage 2FA</button>
              <button className="btn" onClick={() => navigate('/settings/sessions')} style={{ marginLeft: 8 }}>Active Sessions</button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={(viewingOther ? viewUser?.username : currentUser?.username) || ''}
              disabled
              className="input"
            />
            <small>Username cannot be changed</small>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={(viewingOther ? viewUser?.email : currentUser?.email) || ''}
              disabled
              className="input"
            />
            <small>Email cannot be changed</small>
          </div>

          {!viewingOther && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

