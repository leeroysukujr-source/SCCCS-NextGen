import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsAPI } from '../api/groups'
import { useAuthStore } from '../store/authStore'
import { FiUsers, FiSearch, FiPlus, FiX, FiClock, FiLink, FiCheck, FiCopy, FiTarget } from 'react-icons/fi'
import './Groups.css'
import { useConfirm, useNotify } from '../components/NotificationProvider'

export default function Groups() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinMessage, setJoinMessage] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [linkCopied, setLinkCopied] = useState(null)
  const notify = useNotify()
  const confirm = useConfirm()

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsAPI.getGroups,
  })

  const joinMutation = useMutation({
    mutationFn: ({ groupId, data }) => groupsAPI.joinGroup(groupId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['groups'])
      setShowJoinModal(false)
      setSelectedGroup(null)
      setJoinMessage('')
      setJoinCode('')
      if (data.message) {
        notify('info', data.message)
      } else {
        notify('success', 'Joined group successfully!')
      }
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to join group')
    }
  })

  const joinByCodeMutation = useMutation({
    mutationFn: groupsAPI.joinGroupByCode,
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      setJoinCode('')
      notify('success', 'Joined group successfully!')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to join group')
    }
  })

  const leaveMutation = useMutation({
    mutationFn: groupsAPI.leaveGroup,
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      notify('success', 'Left group successfully')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to leave group')
    }
  })

  const handleJoin = async (group) => {
    setSelectedGroup(group)
    if (group.join_type === 'direct') {
      // Direct join - join immediately
      const ok = await confirm(`Are you sure you want to join "${group.name}"?`)
      if (ok) joinMutation.mutate({ groupId: group.id, data: {} })
    } else if (group.join_type === 'request') {
      // Request join - show modal for message
      setShowJoinModal(true)
    } else if (group.join_type === 'link') {
      // Link join - show modal for code
      setShowJoinModal(true)
    }
  }

  const handleJoinSubmit = (e) => {
    e.preventDefault()
    if (selectedGroup.join_type === 'request') {
      joinMutation.mutate({ 
        groupId: selectedGroup.id, 
        data: { message: joinMessage } 
      })
    } else if (selectedGroup.join_type === 'link') {
      if (!joinCode) {
        notify('error', 'Please enter the join code')
        return
      }
      joinMutation.mutate({ 
        groupId: selectedGroup.id, 
        data: { join_code: joinCode } 
      })
    }
  }

  const handleJoinByCode = (e) => {
    e.preventDefault()
    if (!joinCode) {
      notify('error', 'Please enter the join code')
      return
    }
    joinByCodeMutation.mutate(joinCode)
  }

  const handleLeave = async (groupId, groupName) => {
    const ok = await confirm(`Are you sure you want to leave "${groupName}"?`)
    if (!ok) return
    leaveMutation.mutate(groupId)
  }

  const copyJoinLink = (group) => {
    if (group.join_link) {
      const link = `${window.location.origin}${group.join_link}`
      navigator.clipboard.writeText(link)
      setLinkCopied(group.id)
      setTimeout(() => setLinkCopied(null), 2000)
    }
  }

  const filteredGroups = groups.filter(group => {
    const matchesSearch = 
      group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.category?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = filterCategory === 'all' || group.category === filterCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="groups-page">
      <div className="groups-container">
        <div className="groups-header">
          <div className="header-left">
            <h1>
              <FiUsers /> Project Squads
            </h1>
            <p>Deploy into specialized study groups and research units</p>
          </div>
        </div>

        {/* Join by Code Section - Mission Control Style */}
        <div className="join-by-code-section animate-in">
          <div className="section-intel">
            <h3><FiTarget /> Join by Vector</h3>
            <p>Enter the secure deployment code below</p>
          </div>
          <form onSubmit={handleJoinByCode} className="join-code-form">
            <input
              type="text"
              placeholder="VECTOR-CODE-ALPHA"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="join-code-input"
            />
            <button type="submit" className="btn-primary" disabled={joinByCodeMutation.isLoading}>
              {joinByCodeMutation.isLoading ? 'ESTABLISHING...' : 'ENGAGE'}
            </button>
          </form>
        </div>

        {/* Filters - Glass Toggles */}
        <div className="groups-filters">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search Intelligence Hub..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-buttons">
            {['all', 'students', 'teachers', 'other'].map(cat => (
                <button
                    key={cat}
                    className={`filter-btn ${filterCategory === cat ? 'active' : ''}`}
                    onClick={() => setFilterCategory(cat)}
                >
                    {cat}
                </button>
            ))}
          </div>
        </div>

        {/* Groups Grid */}
        <div className="groups-grid">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading groups...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="empty-state">
              <FiUsers size={48} />
              <h3>No groups found</h3>
              <p>{searchTerm || filterCategory !== 'all' ? 'Try adjusting your search or filters' : 'No groups available yet'}</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className={`group-card ${!group.is_active ? 'inactive' : ''}`}>
                <div className="group-header">
                  <div className="group-icon">
                    <FiUsers />
                  </div>
                  <div className="group-info">
                    <h3>{group.name}</h3>
                    <span className="group-category">{group.category}</span>
                  </div>
                </div>
                
                {group.description && (
                  <p className="group-description">{group.description}</p>
                )}
                
                <div className="group-meta">
                  <span className="member-count">
                    <FiUsers /> {group.member_count || 0}
                    {group.max_members && ` / ${group.max_members}`} members
                  </span>
                  <span className={`join-type ${group.join_type}`}>
                    {group.join_type === 'direct' ? 'Direct Join' : 
                     group.join_type === 'request' ? 'Request Required' : 
                     'Link Required'}
                  </span>
                </div>

                <div className="group-actions">
                  {group.is_member ? (
                    <div className="member-status">
                      <FiCheck /> Member
                      <button
                        className="btn-secondary"
                        onClick={() => handleLeave(group.id, group.name)}
                        disabled={leaveMutation.isLoading}
                      >
                        Leave
                      </button>
                    </div>
                  ) : group.has_pending_request ? (
                    <div className="pending-status">
                      <FiClock /> Request Pending
                    </div>
                  ) : (
                    <div className="join-actions">
                      {group.join_type === 'link' && group.join_code && (
                        <button
                          className="btn-secondary"
                          onClick={() => copyJoinLink(group)}
                          title="Copy join link"
                        >
                          {linkCopied === group.id ? <FiCheck /> : <FiLink />}
                          {linkCopied === group.id ? 'Copied!' : 'Copy Link'}
                        </button>
                      )}
                      <button
                        className="btn-primary"
                        onClick={() => handleJoin(group)}
                        disabled={joinMutation.isLoading || !group.is_active}
                      >
                        {group.join_type === 'direct' ? 'Join' : 
                         group.join_type === 'request' ? 'Request to Join' : 
                         'Join with Code'}
                      </button>
                    </div>
                  )}
                </div>

                {!group.is_active && (
                  <div className="inactive-badge">Inactive</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && selectedGroup && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selectedGroup.join_type === 'request' ? 'Request to Join' : 'Join Group'}
              </h2>
              <button className="modal-close" onClick={() => setShowJoinModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleJoinSubmit} className="modal-body">
              <div className="group-info-modal">
                <h3>{selectedGroup.name}</h3>
                {selectedGroup.description && (
                  <p>{selectedGroup.description}</p>
                )}
              </div>
              
              {selectedGroup.join_type === 'request' && (
                <div className="form-group">
                  <label>Message (Optional)</label>
                  <textarea
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="Why do you want to join this group?"
                    rows={4}
                  />
                </div>
              )}
              
              {selectedGroup.join_type === 'link' && (
                <div className="form-group">
                  <label>Join Code *</label>
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter the group join code"
                    className="join-code-input-modal"
                  />
                </div>
              )}
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowJoinModal(false)
                    setJoinMessage('')
                    setJoinCode('')
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={joinMutation.isLoading}>
                  {joinMutation.isLoading ? 'Submitting...' : selectedGroup.join_type === 'request' ? 'Send Request' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

