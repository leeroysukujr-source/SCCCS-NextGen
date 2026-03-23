import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { channelsAPI } from '../api/channels'
import { messagesAPI } from '../api/messages'
import { filesAPI } from '../api/files'
import { useAuthStore } from '../store/authStore'
import {
  FiInfo, FiUsers, FiImage, FiFile, FiLink, FiCalendar, FiLock,
  FiEdit2, FiX, FiBell, FiBellOff, FiClock, FiSettings, FiCheck, FiDownload,
  FiShare2, FiCopy, FiUpload, FiMessageCircle, FiUser, FiLogOut, FiCheckCircle, FiTrendingUp
} from 'react-icons/fi'
import './ChannelSettings.css'
import { useConfirm, useNotify } from '../components/NotificationProvider'

export default function ChannelSettings({ channel, onClose }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [channelName, setChannelName] = useState(channel?.name || '')
  const [channelDescription, setChannelDescription] = useState(channel?.description || '')
  const [isMuted, setIsMuted] = useState(false)
  const [disappearingMessages, setDisappearingMessages] = useState('off')
  const [shareLink, setShareLink] = useState('')
  const [showShareLink, setShowShareLink] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Check if user is admin
  const { data: currentMember } = useQuery({
    queryKey: ['channelMember', channel?.id, user?.id],
    queryFn: async () => {
      if (!channel?.id) return null
      const members = await channelsAPI.getMembers(channel.id)
      return members.find(m => m.id === user?.id || m.user_id === user?.id)
    },
    enabled: !!channel?.id && !!user?.id
  })

  const isCreator = channel?.created_by === user?.id
  const isAdmin = isCreator || currentMember?.member_role === 'admin' || currentMember?.member_role === 'co-admin'

  // Load channel details
  const { data: channelDetails } = useQuery({
    queryKey: ['channel', channel?.id],
    queryFn: () => channelsAPI.getChannel(channel.id),
    enabled: !!channel?.id
  })

  // Load members
  const { data: members = [] } = useQuery({
    queryKey: ['channelMembers', channel?.id],
    queryFn: () => channelsAPI.getMembers(channel.id),
    enabled: !!channel?.id && activeSection === 'members'
  })

  // Load invites for invite management
  const { data: invites = [], refetch: refetchInvites } = useQuery({
    queryKey: ['channelInvites', channel?.id],
    queryFn: () => channelsAPI.listInvites(channel.id),
    enabled: !!channel?.id && activeSection === 'invites'
  })

  const createInviteMutation = useMutation({
    mutationFn: (data) => channelsAPI.createInvite(channel.id, data),
    onSuccess: () => {
      refetchInvites()
      notify('success', 'Invite created')
    },
    onError: (err) => notify('error', err.response?.data?.error || 'Failed to create invite')
  })

  const revokeInviteMutation = useMutation({
    mutationFn: ({ token }) => channelsAPI.revokeInvite(channel.id, token),
    onSuccess: () => {
      refetchInvites()
      notify('success', 'Invite revoked')
    },
    onError: (err) => notify('error', err.response?.data?.error || 'Failed to revoke invite')
  })

  // Load messages for media/files/links
  const { data: allMessages = [] } = useQuery({
    queryKey: ['allMessages', channel?.id],
    queryFn: () => messagesAPI.getMessages(channel.id),
    enabled: !!channel?.id && (activeSection === 'media' || activeSection === 'files' || activeSection === 'links')
  })

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: (data) => channelsAPI.updateChannel(channel.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['channels'])
      queryClient.invalidateQueries(['channel', channel.id])
      setEditingName(false)
      setEditingDescription(false)
      notify('success', 'Channel updated successfully')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to update channel')
    }
  })

  // Get share link mutation
  const getShareLinkMutation = useMutation({
    mutationFn: () => channelsAPI.getShareLink(channel.id),
    onSuccess: (data) => {
      setShareLink(data.share_link)
      setShowShareLink(true)
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to generate share link')
    }
  })

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: (file) => channelsAPI.uploadAvatar(channel.id, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['channels'])
      queryClient.invalidateQueries(['channel', channel.id])
      setUploadingAvatar(false)
      notify('success', 'Avatar uploaded successfully')
    },
    onError: (error) => {
      setUploadingAvatar(false)
      notify('error', error.response?.data?.error || 'Failed to upload avatar')
    }
  })

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: () => channelsAPI.leaveChannel(channel.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['channels'])
      notify('success', 'You have left the channel')
      onClose()
      navigate('/chat')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to leave channel')
    }
  })

  // Create or find direct message channel
  const createDirectMessage = async (otherUserId) => {
    try {
      // Try to find existing direct message channel
      const allChannels = await channelsAPI.getChannels()
      const directChannel = allChannels.find(c =>
        c.type === 'direct' &&
        c.members?.some(m => m.id === otherUserId || m.user_id === otherUserId) &&
        c.members?.some(m => m.id === user?.id || m.user_id === user?.id)
      )

      if (directChannel) {
        navigate(`/chat/${directChannel.id}`)
        onClose()
      } else {
        // Create new direct message channel
        const newChannel = await channelsAPI.createChannel({
          name: `Direct Message`,
          type: 'direct',
          member_ids: [otherUserId]
        })
        navigate(`/chat/${newChannel.id}`)
        onClose()
      }
    } catch (error) {
      console.error('Error creating direct message:', error)
      notify('error', 'Failed to create direct message')
    }
  }

  useEffect(() => {
    if (channel) {
      setChannelName(channel.name || '')
      setChannelDescription(channel.description || '')
    }
  }, [channel])

  const handleSaveName = () => {
    if (channelName.trim() && channelName !== channel.name) {
      updateChannelMutation.mutate({ name: channelName.trim() })
    } else {
      setEditingName(false)
    }
  }

  const handleSaveDescription = () => {
    if (channelDescription !== channel.description) {
      updateChannelMutation.mutate({ description: channelDescription.trim() })
    } else {
      setEditingDescription(false)
    }
  }

  // Filter messages by type
  const mediaMessages = allMessages.filter(msg =>
    msg.message_type === 'image' ||
    (msg.attachments && msg.attachments.some(f => f.mime_type?.startsWith('image/')))
  )

  const fileMessages = allMessages.filter(msg =>
    msg.message_type === 'file' ||
    (msg.attachments && msg.attachments.length > 0)
  )

  // Extract links from messages
  const linkMessages = allMessages.filter(msg => {
    if (!msg.content) return false
    const urlPattern = /(https?:\/\/[^\s]+)/g
    return urlPattern.test(msg.content)
  })

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getInitials = (name) => {
    if (!name) return 'C'
    const words = name.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      notify('error', 'Please select an image file')
      return
    }

    setUploadingAvatar(true)
    uploadAvatarMutation.mutate(file)
  }

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMaxUses, setInviteMaxUses] = useState('')
  const [inviteExpiresDays, setInviteExpiresDays] = useState('')


  const handleCopyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      notify('success', 'Share link copied to clipboard!')
    }
  }

  const handleViewProfile = (memberId) => {
    navigate(`/profile/${memberId}`)
    onClose()
  }

  const handleMessageUser = (memberId) => {
    createDirectMessage(memberId)
  }

  const handleLeaveChannel = () => {
    confirm('Are you sure you want to leave this channel?').then(ok => {
      if (!ok) return
      leaveChannelMutation.mutate()
    })
  }

  const getAvatarUrl = (url) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    return `${baseURL}${url}`
  }

  return (
    <div className="channel-settings-overlay" onClick={onClose}>
      <div className="channel-settings-container" onClick={(e) => e.stopPropagation()}>
        <div className="channel-settings-sidebar">
          <div className="settings-sidebar-header">
            <h3>Channel Info</h3>
            <button className="close-settings-btn" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <nav className="settings-nav">
            <button
              className={`settings-nav-item ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              <FiInfo /> Overview
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'members' ? 'active' : ''}`}
              onClick={() => setActiveSection('members')}
            >
              <FiUsers /> Members
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'media' ? 'active' : ''}`}
              onClick={() => setActiveSection('media')}
            >
              <FiImage /> Media
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'files' ? 'active' : ''}`}
              onClick={() => setActiveSection('files')}
            >
              <FiFile /> Files
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'links' ? 'active' : ''}`}
              onClick={() => setActiveSection('links')}
            >
              <FiLink /> Links
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'events' ? 'active' : ''}`}
              onClick={() => setActiveSection('events')}
            >
              <FiCalendar /> Events
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'encryption' ? 'active' : ''}`}
              onClick={() => setActiveSection('encryption')}
            >
              <FiLock /> Encryption
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="channel-settings-content">
          {activeSection === 'overview' && (
            <div className="settings-section">
              <div className="channel-profile-section">
                <div className="channel-profile-avatar-container">
                  <div className="channel-profile-avatar">
                    {channelDetails?.avatar_url ? (
                      <img
                        src={getAvatarUrl(channelDetails.avatar_url)}
                        alt={channel?.name}
                        className="channel-avatar-img"
                      />
                    ) : (
                      getInitials(channel?.name)
                    )}
                  </div>
                  {isAdmin && (
                    <label className="avatar-upload-btn" title="Upload profile picture">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={uploadingAvatar}
                      />
                      <FiUpload />
                    </label>
                  )}
                </div>
                <div className="channel-name-section">
                  {editingName ? (
                    <div className="editable-field">
                      <input
                        type="text"
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName()
                          if (e.key === 'Escape') {
                            setChannelName(channel?.name || '')
                            setEditingName(false)
                          }
                        }}
                        className="editable-input"
                        autoFocus
                      />
                      <button className="save-btn" onClick={handleSaveName}>
                        <FiCheck />
                      </button>
                    </div>
                  ) : (
                    <div className="channel-name-display">
                      <h2>{channel?.name}</h2>
                      {isCreator && (
                        <button
                          className="edit-icon-btn"
                          onClick={() => setEditingName(true)}
                        >
                          <FiEdit2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-info-grid">
                <div className="info-item">
                  <label>Created</label>
                  <span>{formatDate(channel?.created_at)}</span>
                </div>

                <div className="info-item">
                  <label>Description</label>
                  {editingDescription ? (
                    <div className="editable-field">
                      <textarea
                        value={channelDescription}
                        onChange={(e) => setChannelDescription(e.target.value)}
                        onBlur={handleSaveDescription}
                        className="editable-textarea"
                        rows={3}
                        autoFocus
                      />
                      <button className="save-btn" onClick={handleSaveDescription}>
                        <FiCheck />
                      </button>
                    </div>
                  ) : (
                    <div className="description-display">
                      <span>{channel?.description || 'No description'}</span>
                      {isCreator && (
                        <button
                          className="edit-icon-btn"
                          onClick={() => setEditingDescription(true)}
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="settings-item">
                  <div className="settings-label">
                    <label>Disappearing messages</label>
                    <span className="settings-value">Off</span>
                  </div>
                </div>

                <div className="settings-item">
                  <div className="settings-label">
                    <label>Advanced chat privacy</label>
                    <span className="settings-hint">
                      This setting can only be updated on your phone. <a href="#" onClick={(e) => e.preventDefault()}>Learn more</a>
                    </span>
                  </div>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="privacy-toggle"
                      disabled
                    />
                    <label htmlFor="privacy-toggle"></label>
                  </div>
                </div>

                <div className="settings-item">
                  <div className="settings-label">
                    <label>Mute notifications</label>
                  </div>
                  <div className="mute-dropdown">
                    <select
                      value={isMuted ? 'muted' : 'unmuted'}
                      onChange={(e) => setIsMuted(e.target.value === 'muted')}
                      className="mute-select"
                    >
                      <option value="unmuted">Unmuted</option>
                      <option value="muted">Muted</option>
                    </select>
                  </div>
                </div>

                <div className="settings-section insights-section">
                  <h4 className="section-title">Academic Insights</h4>
                  <div className="widget-container">
                    <div className="widget-item">
                      <div className="widget-header">
                        <FiCheckCircle className="widget-icon attendance" />
                        <div className="widget-label">Attendance</div>
                      </div>
                      <div className="widget-progress-bar">
                        <div className="progress-fill" style={{ width: '85%' }}></div>
                      </div>
                      <div className="widget-value">85%</div>
                    </div>
                    <div className="widget-item">
                      <div className="widget-header">
                        <FiTrendingUp className="widget-icon progress" />
                        <div className="widget-label">Course Progress</div>
                      </div>
                      <div className="widget-progress-bar">
                        <div className="progress-fill" style={{ width: '62%' }}></div>
                      </div>
                      <div className="widget-value">62%</div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="settings-item">
                    <div className="settings-label">
                      <label>Share Channel</label>
                      <span className="settings-hint">Generate a shareable link for this channel</span>
                    </div>
                    <div className="share-link-section">
                      {showShareLink ? (
                        <div className="share-link-display">
                          <input
                            type="text"
                            value={shareLink}
                            readOnly
                            className="share-link-input"
                          />
                          <button
                            className="copy-link-btn"
                            onClick={handleCopyShareLink}
                            title="Copy link"
                          >
                            <FiCopy />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="generate-link-btn"
                          onClick={() => getShareLinkMutation.mutate()}
                          disabled={getShareLinkMutation.isLoading}
                        >
                          <FiShare2 /> Generate Share Link
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="settings-item">
                  <button
                    className="leave-channel-btn"
                    onClick={handleLeaveChannel}
                    disabled={leaveChannelMutation.isLoading}
                  >
                    <FiLogOut /> Exit Group
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'members' && (
            <div className="settings-section">
              <h2>Members ({members.length})</h2>
              <div className="members-list-settings">
                {members.map((member) => {
                  const memberId = member.id || member.user_id
                  const isCurrentUser = memberId === user?.id
                  return (
                    <div
                      key={member.id || member.user_id}
                      className="member-item-settings"
                    >
                      <div
                        className="member-avatar-settings"
                        onClick={() => !isCurrentUser && handleViewProfile(memberId)}
                        style={{ cursor: isCurrentUser ? 'default' : 'pointer' }}
                        title={isCurrentUser ? '' : 'Click to view profile'}
                      >
                        {member.avatar_url ? (
                          <img
                            src={getAvatarUrl(member.avatar_url)}
                            alt={member.first_name}
                            className="member-avatar-img"
                          />
                        ) : (
                          member.first_name?.[0]?.toUpperCase() || member.username?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                      <div
                        className="member-info-settings"
                        onClick={() => !isCurrentUser && handleViewProfile(memberId)}
                        style={{ cursor: isCurrentUser ? 'default' : 'pointer' }}
                      >
                        <strong>{member.first_name} {member.last_name}</strong>
                        <span>{member.email}</span>
                      </div>
                      {member.member_role && (
                        <span className="member-role-badge-settings">
                          {member.member_role === 'admin' ? 'Admin' :
                            member.member_role === 'co-admin' ? 'Co-Admin' : 'Member'}
                        </span>
                      )}
                      {!isCurrentUser && (
                        <div className="member-actions">
                          <button
                            className="member-action-btn"
                            onClick={() => handleMessageUser(memberId)}
                            title="Send message"
                          >
                            <FiMessageCircle />
                          </button>
                          <button
                            className="member-action-btn"
                            onClick={() => handleViewProfile(memberId)}
                            title="View profile"
                          >
                            <FiUser />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeSection === 'invites' && (
            <div className="settings-section">
              <h2>Invites</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <input type="email" placeholder="invite email (optional)" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                <input type="number" placeholder="max uses" value={inviteMaxUses} onChange={(e) => setInviteMaxUses(e.target.value)} />
                <input type="number" placeholder="expires (days)" value={inviteExpiresDays} onChange={(e) => setInviteExpiresDays(e.target.value)} />
                <button onClick={() => createInviteMutation.mutate({ email: inviteEmail || null, max_uses: inviteMaxUses || null, expires_in_days: inviteExpiresDays || null })}>Create Invite</button>
              </div>

              <div>
                <h4>Active Invites</h4>
                {invites.length === 0 && <p>No invites</p>}
                {invites.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <div>
                      <div><strong>Token</strong>: {inv.token}</div>
                      <div><small>email: {inv.email || 'any'}</small> • <small>uses: {inv.uses}/{inv.max_uses || '∞'}</small> • <small>expires: {inv.expires_at || 'never'}</small></div>
                    </div>
                    <div>
                      <button onClick={() => navigator.clipboard.writeText(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/join-invite/${inv.token}`)}>Copy Link</button>
                      <button onClick={() => revokeInviteMutation.mutate({ token: inv.token })}>Revoke</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'media' && (
            <div className="settings-section">
              <h2>Media ({mediaMessages.length})</h2>
              <div className="media-grid">
                {mediaMessages.map((msg) => (
                  <div key={msg.id} className="media-item">
                    {msg.attachments && msg.attachments[0] ? (
                      <img
                        src={filesAPI.getFileUrl(msg.attachments[0].id)}
                        alt="Media"
                        className="media-thumbnail"
                      />
                    ) : (
                      <div className="media-placeholder">Image</div>
                    )}
                  </div>
                ))}
                {mediaMessages.length === 0 && (
                  <div className="empty-state">No media files</div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'files' && (
            <div className="settings-section">
              <h2>Files ({fileMessages.length})</h2>
              <div className="files-list">
                {fileMessages.map((msg) => (
                  msg.attachments?.map((file) => (
                    <div key={file.id} className="file-item-settings">
                      <FiFile className="file-icon" />
                      <div className="file-info-settings">
                        <strong>{file.original_filename}</strong>
                        <span>{file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : 'Unknown size'}</span>
                      </div>
                      <button
                        onClick={() => filesAPI.downloadFile(file.id, file.original_filename)}
                        className="download-btn"
                        title="Download"
                      >
                        <FiDownload />
                      </button>
                    </div>
                  ))
                ))}
                {fileMessages.length === 0 && (
                  <div className="empty-state">No files</div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'links' && (
            <div className="settings-section">
              <h2>Links ({linkMessages.length})</h2>
              <div className="links-list">
                {linkMessages.map((msg) => {
                  const urlPattern = /(https?:\/\/[^\s]+)/g
                  const urls = msg.content.match(urlPattern) || []
                  return urls.map((url, idx) => (
                    <div key={`${msg.id}-${idx}`} className="link-item">
                      <FiLink className="link-icon" />
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {url}
                      </a>
                    </div>
                  ))
                })}
                {linkMessages.length === 0 && (
                  <div className="empty-state">No links</div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'events' && (
            <div className="settings-section">
              <h2>Events</h2>
              <div className="empty-state">
                <FiCalendar size={48} />
                <p>No events scheduled</p>
              </div>
            </div>
          )}

          {activeSection === 'encryption' && (
            <div className="settings-section">
              <h2>Encryption</h2>
              <div className="encryption-info">
                <div className="encryption-status">
                  <FiLock className="encryption-icon-large" />
                  <h3>End-to-End Encryption</h3>
                  <p>
                    {channel?.is_encrypted
                      ? 'This channel is protected with end-to-end encryption. Only you and the people you communicate with can read what\'s sent.'
                      : 'Encryption is not enabled for this channel.'}
                  </p>
                </div>
                {channel?.is_encrypted && channelDetails?.encryption_key && (
                  <div className="encryption-key-section">
                    <label>Encryption Key</label>
                    <div className="key-display">
                      <code>{channelDetails.encryption_key.substring(0, 20)}...</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

