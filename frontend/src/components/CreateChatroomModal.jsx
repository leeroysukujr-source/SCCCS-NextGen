import { useState, useEffect } from 'react'
import { FiX, FiUsers, FiLock, FiGlobe, FiPlus, FiSearch, FiMessageCircle } from 'react-icons/fi'
import { usersAPI } from '../api/users'
import { useAuthStore } from '../store/authStore'
import './CreateChatroomModal.css'
import { useNotify } from './NotificationProvider'

export default function CreateChatroomModal({ isOpen, onClose, onCreate, isCreating }) {
  const { user } = useAuthStore()
  const notify = useNotify()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('private')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [autoAddMembers, setAutoAddMembers] = useState(false)

  // Search users when searchQuery changes
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true)
        try {
          const results = await usersAPI.searchUsers(searchQuery)
          // Filter out already selected users
          setAvailableUsers(results.filter(user => 
            !selectedUsers.find(selected => selected.id === user.id)
          ))
        } catch (error) {
          console.error('User search error:', error)
          setAvailableUsers([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setAvailableUsers([])
      }
    }

    const timeoutId = setTimeout(searchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedUsers])

  const handleCreate = () => {
    if (!name.trim()) {
      notify('error', 'Please enter a chatroom name')
      return
    }

    const channelData = {
      name: name.trim(),
      description: description.trim() || '',
      type,
      is_encrypted: true
    }

    // Only include member_ids if there are selected users
    if (selectedUsers.length > 0) {
      channelData.member_ids = selectedUsers.map(u => u.id)
    }

    // Admin can auto-add all students and lecturers
    if ((user?.role === 'admin' || user?.role === 'super_admin') && autoAddMembers) {
      channelData.auto_add_members = true
    }

    onCreate(channelData)

    // Reset form after successful creation (onCreate will handle errors)
    // Don't reset here as onCreate is async - reset in onClose or on success
  }

  const handleAddUser = (user) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user])
      setSearchQuery('')
    }
  }

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId))
  }

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('')
      setDescription('')
      setType('private')
      setSelectedUsers([])
      setSearchQuery('')
      setAvailableUsers([])
      setAutoAddMembers(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-chatroom-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Chatroom</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '2rem 3rem' }}>
          <div className="form-group">
            <label>Chatroom Name</label>
            <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FiMessageCircle className="input-icon" style={{ position: 'absolute', left: '1.25rem', fontSize: '1.25rem', color: 'var(--primary-purple)', zIndex: 2 }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter chatroom name"
                className="form-input"
                style={{ paddingLeft: '3.5rem' }}
                maxLength={100}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this chatroom about?"
              className="form-textarea"
              rows="3"
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label>Privacy Mode</label>
            <div className="privacy-options">
              <div
                className={`privacy-option ${type === 'private' ? 'active' : ''}`}
                onClick={() => setType('private')}
              >
                <div className="privacy-icon-wrapper">
                  <FiLock />
                </div>
                <div className="privacy-content">
                  <strong>Private Channel</strong>
                  <p>Only invited members can access</p>
                </div>
              </div>
              <div
                className={`privacy-option ${type === 'public' ? 'active' : ''}`}
                onClick={() => setType('public')}
              >
                <div className="privacy-icon-wrapper">
                  <FiGlobe />
                </div>
                <div className="privacy-content">
                  <strong>Public Space</strong>
                  <p>Discoverable by all community members</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin-only option to auto-add all students and lecturers */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoAddMembers}
                  onChange={(e) => setAutoAddMembers(e.target.checked)}
                />
                <span>Automatically add all students and lecturers as members</span>
              </label>
              <p className="form-hint" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                When enabled, all students and lecturers will be automatically added to this chatroom
              </p>
            </div>
          )}

          <div className="form-group">
            <label>Add Members (Optional)</label>
            <div className="selected-users">
              {selectedUsers.map(user => (
                <div key={user.id} className="selected-user-tag">
                  <span>{user.first_name || user.username}</span>
                  <button onClick={() => handleRemoveUser(user.id)}>
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
            <div className="user-search-wrapper" style={{ position: 'relative' }}>
              <FiSearch className="search-icon-input" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', zIndex: 1 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users to add..."
                className="form-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
            {searchQuery && availableUsers.length > 0 && (
              <div className="user-suggestions">
                {isSearching ? (
                  <p className="suggestion-note">Searching...</p>
                ) : (
                  availableUsers.map(user => (
                    <div
                      key={user.id}
                      className="user-suggestion-item"
                      onClick={() => handleAddUser(user)}
                    >
                      <div className="suggestion-avatar">
                        {user.first_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="suggestion-info">
                        <strong>{user.first_name} {user.last_name}</strong>
                        <span>@{user.username}</span>
                      </div>
                      <FiPlus className="add-icon" />
                    </div>
                  ))
                )}
              </div>
            )}
            {searchQuery && !isSearching && availableUsers.length === 0 && searchQuery.length >= 2 && (
              <div className="user-suggestions">
                <p className="suggestion-note">No users found</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
                <FiPlus /> Create Chatroom
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

