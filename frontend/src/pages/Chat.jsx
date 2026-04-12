import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { channelsAPI } from '../api/channels'
import { messagesAPI } from '../api/messages'
import { filesAPI } from '../api/files'
import { roomsAPI } from '../api/rooms'
import { usersAPI } from '../api/users'
import { useAuthStore } from '../store/authStore'
import { encryptionUtil } from '../utils/encryption'
import { getSocketUrl } from '../utils/api'
import CreateChatroomModal from '../components/CreateChatroomModal'
import ChannelSettings from '../components/ChannelSettings'
import ScheduleMessageModal from '../components/ScheduleMessageModal'
import ScheduledMessagesModal from '../components/ScheduledMessagesModal'
import AssignmentBuilderModal from '../components/AssignmentBuilderModal'
import VoicePlayer from '../components/VoicePlayer'
import {
  FiSend, FiHash, FiPaperclip, FiMic, FiVideo,
  FiImage, FiFile, FiX, FiPlay, FiPause, FiLock, FiDownload,
  FiTrash2, FiEdit2, FiSearch, FiMoreVertical, FiUser, FiUsers,
  FiCopy, FiShare2, FiCornerUpLeft, FiHeart, FiMessageCircle, FiPhone, FiCornerDownRight,
  FiBookmark, FiClock, FiZap, FiStar,
  FiTrendingUp,
  FiPlus, FiSettings, FiArrowRight, FiEye
} from 'react-icons/fi'
import { FiList } from 'react-icons/fi'
import { useSocket } from '../contexts/SocketProvider'
import './Chat.css'
import './ChatPremier.css'
import './ChatContextStyles.css'
import { getApiBaseUrl } from '../utils/api'
import { useConfirm, useNotify } from '../components/NotificationProvider'

export default function Chat() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [message, setMessage] = useState('')
  const [unreadCounts, setUnreadCounts] = useState({}) // 'connected' | 'disconnected' | 'unknown'
  const [unsentQueue, setUnsentQueue] = useState(() => {
    try {
      const raw = localStorage.getItem('unsent_messages')
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  })
  const [showActionMenu, setShowActionMenu] = useState(false) // New State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showScheduledList, setShowScheduledList] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState(null)
  const [recordingTimer, setRecordingTimer] = useState('00:00')
  const recordingIntervalRef = useRef(null)
  const recordingCanvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const animationFrameRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const canceledRecordingRef = useRef(false)
  const [avatarMenu, setAvatarMenu] = useState({ open: false, x: 0, y: 0, user: null })
  const avatarMenuRef = useRef(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showChannelMenu, setShowChannelMenu] = useState(null)
  const [showMessageMenu, setShowMessageMenu] = useState(null)
  const [messageMenuPosition, setMessageMenuPosition] = useState({ x: 0, y: 0 }) // New state
  const [editingMessage, setEditingMessage] = useState(null)
  const [replyToMessage, setReplyToMessage] = useState(null)
  const [messageReactions, setMessageReactions] = useState({})
  const [forwardMessage, setForwardMessage] = useState(null)
  const [showChannelSettings, setShowChannelSettings] = useState(false)
  const [channelSettingsChannel, setChannelSettingsChannel] = useState(null)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [channelMembers, setChannelMembers] = useState([])
  const [currentUserMemberRole, setCurrentUserMemberRole] = useState(null)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [mentionUsers, setMentionUsers] = useState([])
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [showContextPanel, setShowContextPanel] = useState(false) // Phase 1: Context Panel state
  const [showSlashSuggestions, setShowSlashSuggestions] = useState(false) // Phase 2: Slash Commands
  const [slashQuery, setSlashQuery] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false) // Phase 2: Emoji Picker
  const [showAssignmentModal, setShowAssignmentModal] = useState(false) // Phase 2: Assignment Builder
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // Mobile Responsive Sidebar State
  const [activeSidebarTab, setActiveSidebarTab] = useState('joined') // 'joined' or 'discover'
  const [availableChannels, setAvailableChannels] = useState([])
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false)


  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [isRecordingPaused, setIsRecordingPaused] = useState(false)
  const typingTimeoutRef = useRef(null)
  const mentionSuggestionsRef = useRef(null)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const videoRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const videoChunksRef = useRef([])
  const messageInputRef = useRef(null)
  const accumulatedTimeRef = useRef(0)
  const lastStartTimeRef = useRef(null)

  const { user, token } = useAuthStore()
  const confirm = useConfirm()
  const notify = useNotify()
  const queryClient = useQueryClient()

  // Implementation of missing offline message queue functions
  const enqueueUnsentMessage = useCallback((tempMsg, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem('scccs_unsent_messages') || '[]')
      queue.push({ tempMsg, payload, timestamp: Date.now() })
      localStorage.setItem('scccs_unsent_messages', JSON.stringify(queue))
      console.log('[Chat] Message enqueued for retry:', tempMsg.id)
    } catch (e) {
      console.error('[Chat] Failed to enqueue message:', e)
    }
  }, [])

  const flushUnsentQueue = useCallback(async () => {
    try {
      const queue = JSON.parse(localStorage.getItem('scccs_unsent_messages') || '[]')
      if (queue.length === 0) return
      
      console.log(`[Chat] Flushing ${queue.length} unsent messages...`)
      
      const remaining = []
      for (const item of queue) {
        try {
          // If message is too old (e.g. > 24h), discard it
          if (Date.now() - item.timestamp > 86400000) continue
          
          await messagesAPI.createMessage(item.tempMsg.channel_id, item.payload)
          console.log('[Chat] Successfully flushed message:', item.tempMsg.id)
        } catch (e) {
          console.error('[Chat] Failed to flush message, keeping in queue:', item.tempMsg.id, e)
          remaining.push(item)
        }
      }
      
      localStorage.setItem('scccs_unsent_messages', JSON.stringify(remaining))
      if (remaining.length === 0) {
        queryClient.invalidateQueries(['messages'])
      }
    } catch (e) {
      console.error('[Chat] Failed to flush unsent queue:', e)
    }
  }, [queryClient])


  const loadAvailableChannels = useCallback(async () => {
    setIsDiscoverLoading(true)
    try {
      const available = await channelsAPI.getAvailable()
      setAvailableChannels(available)
    } catch (error) {
      console.error('Error loading available channels:', error)
      notify('error', 'Failed to load discoverable channels')
    } finally {
      setIsDiscoverLoading(false)
    }
  }, [notify])

  useEffect(() => {
    if (activeSidebarTab === 'discover') {
      loadAvailableChannels()
    }
  }, [activeSidebarTab, loadAvailableChannels])

  const { data: channels = [], refetch: refetchChannels } = useQuery({
    queryKey: ['channels'],
    queryFn: channelsAPI.getChannels,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  })

  const { data: messages = [], refetch: refetchMessages, error: messagesError } = useQuery({
    queryKey: ['messages', selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel) return []
      const msgs = await messagesAPI.getMessages(selectedChannel.id)

      // Deduplicate messages by ID to prevent duplicates
      const uniqueMessages = Array.from(
        new Map((msgs || []).map(msg => [msg.id, msg])).values()
      )

      // Sort messages by created_at ascending (oldest first)
      return uniqueMessages.sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime()
        const timeB = new Date(b.created_at || 0).getTime()
        return timeA - timeB
      })
    },
    enabled: !!selectedChannel,
    refetchInterval: false, // Disable automatic refetch - rely on Socket.IO for real-time updates
    refetchIntervalInBackground: false,
    staleTime: Infinity, // Never consider data stale - we update via Socket.IO
    cacheTime: Infinity, // Keep in cache forever
    retry: false, // Don't retry on permission errors
    // Keep previous data while fetching new data
    keepPreviousData: true,
  })

  // Filter channels by search query
  const filteredChannels = channels.filter(channel =>
    channel.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Load encryption key when channel is selected
  useEffect(() => {
    if (selectedChannel && selectedChannel.encryption_key) {
      setEncryptionKey(selectedChannel.encryption_key)
    } else if (selectedChannel) {
      channelsAPI.getChannel(selectedChannel.id).then(channel => {
        if (channel.encryption_key) {
          setEncryptionKey(channel.encryption_key)
        }
      }).catch(() => { })
    }
  }, [selectedChannel])

  // Load channel members function - MUST be defined before use
  const loadChannelMembers = useCallback(async () => {
    if (!selectedChannel) return

    try {
      const members = await channelsAPI.getMembers(selectedChannel.id)
      setChannelMembers(members)

      // Find current user's role in the channel
      const currentUserMember = members.find(m => m.user_id === user?.id)
      if (currentUserMember) {
        setCurrentUserMemberRole(currentUserMember.role)
      }
    } catch (error) {
      console.error('Error loading channel members:', error)
      setChannelMembers([])
    }
  }, [selectedChannel, user?.id])

  useEffect(() => {
    if (channelId) {
      const channel = channels.find((c) => c.id === parseInt(channelId))
      if (channel) {
        setSelectedChannel(channel)
        navigate(`/chat/${channel.id}`, { replace: true })
      }
    } else if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0])
      navigate(`/chat/${channels[0].id}`, { replace: true })
    }
  }, [channelId, channels])

  // Auto-focus input when channel is selected
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setIsSidebarOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-close sidebar on mobile when channel is selected
  useEffect(() => {
    if (isMobile && selectedChannel) {
      setIsSidebarOpen(false)
    }
  }, [selectedChannel?.id, isMobile])

  // Auto-focus input when channel is selected
  useEffect(() => {
    if (selectedChannel && messageInputRef.current && !uploadingFiles && !isSidebarOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (messageInputRef.current && !messageInputRef.current.disabled) {
          messageInputRef.current.focus()
          // Force focus by clicking as well
          messageInputRef.current.click()
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [selectedChannel, uploadingFiles])

  // Load members when channel is selected or members modal is opened
  useEffect(() => {
    if (selectedChannel && showMembersModal) {
      loadChannelMembers()
    }
  }, [selectedChannel, showMembersModal, loadChannelMembers])

  // User search functionality
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearchQuery.length >= 2) {
        try {
          const results = await usersAPI.searchUsers(userSearchQuery)
          setSearchResults(results)
        } catch (error) {
          console.error('Search error:', error)
          setSearchResults([])
        }
      } else {
        setSearchResults([])
      }
    }

    const timeoutId = setTimeout(searchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [userSearchQuery])

  // Load channel members for mentions
  useEffect(() => {
    if (selectedChannel) {
      channelsAPI.getMembers(selectedChannel.id).then(members => {
        setMentionUsers(members)
      }).catch(() => { })
    }
  }, [selectedChannel])

  // Handle @mention detection in message input
  useEffect(() => {
    // Only show mention suggestions if there's an @ symbol and we're actually in mention mode
    if (message && mentionStartIndex >= 0 && message[mentionStartIndex] === '@') {
      const textAfterAt = message.substring(mentionStartIndex + 1)
      const spaceIndex = textAfterAt.indexOf(' ')
      const query = spaceIndex > 0 ? textAfterAt.substring(0, spaceIndex) : textAfterAt

      setMentionQuery(query)
      if (query.length > 0) {
        setShowMentionSuggestions(true)
      } else {
        setShowMentionSuggestions(false)
      }
    } else {
      setShowMentionSuggestions(false)
      setMentionStartIndex(-1)
    }
  }, [message, mentionStartIndex])

  // Close mention suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mentionSuggestionsRef.current && !mentionSuggestionsRef.current.contains(e.target)) {
        setShowMentionSuggestions(false)
      }
    }
    if (showMentionSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMentionSuggestions])

  const { socket: sharedSocket, status: sharedSocketStatus } = useSocket()
  const [socket, setSocket] = useState(null)
  const [socketStatus, setSocketStatus] = useState(sharedSocketStatus || 'connecting')

  // Sync internal status with provider status
  useEffect(() => {
    if (sharedSocketStatus) {
      setSocketStatus(sharedSocketStatus)
    }
  }, [sharedSocketStatus])

  // Socket.IO connection: attach to shared socket provided by SocketProvider
  useEffect(() => {
    if (!sharedSocket) return

    const newSocket = sharedSocket
    setSocket(newSocket)
    // Initial sync
    if (sharedSocketStatus) setSocketStatus(sharedSocketStatus)
    else setSocketStatus(newSocket.connected ? 'connected' : 'connecting')

    const serializeSocketError = (err) => {
      try {
        if (!err) return String(err)
        const plain = {}
        Object.getOwnPropertyNames(err).forEach(k => { plain[k] = err[k] })
        return JSON.stringify(plain)
      } catch (e) {
        try { return JSON.stringify(err) } catch (_) { return String(err) }
      }
    }

    newSocket.off('connect').on('connect', () => {
      console.log('[Chat] Socket connected')
      setSocketStatus('connected')
      try { newSocket.emit('ping') } catch (e) { /* ignore */ }
      try { flushUnsentQueue() } catch (e) { console.error('Flush unsent failed on connect:', e) }
      if (selectedChannel) newSocket.emit('join_channel', { channel_id: selectedChannel.id })
    })

    newSocket.off('disconnect').on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected:', reason)
      setSocketStatus('disconnected')
    })

    newSocket.off('connect_error').on('connect_error', (error) => {
      console.error('[Chat] Socket connection error:', error && (error.message || String(error)), 'details:', serializeSocketError(error), error)
    })

    newSocket.off('error').on('error', (error) => {
      console.error('[Chat] Socket error:', serializeSocketError(error), error)
    })

    newSocket.off('pong').on('pong', (data) => {
      if (data && data.ok) setSocketStatus('connected')
    })

    const __pingInterval = setInterval(() => {
      try { newSocket.emit('ping') } catch (e) { /* socket closed */ }
    }, 15000)

    // Message handlers
    newSocket.off('message_received').on('message_received', (messageData) => {
      if (!messageData || !messageData.id || !messageData.channel_id) return
      const processedMessage = { ...messageData }
      queryClient.setQueryData(['messages', processedMessage.channel_id], (oldMessages = []) => {
        const uniqueOldMessages = Array.from(new Map(oldMessages.map(msg => [msg.id, msg])).values())
        const exists = uniqueOldMessages.some(m => m.id === processedMessage.id)
        if (exists) return uniqueOldMessages.map(m => m.id === processedMessage.id ? { ...processedMessage, isNew: true } : m).sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        const filtered = uniqueOldMessages.filter(m => !(m.id?.toString().startsWith('temp-') && m.content === processedMessage.content && m.author_id === processedMessage.author_id && Math.abs(new Date(m.created_at || 0) - new Date(processedMessage.created_at || 0)) < 5000))
        const updated = [...filtered, { ...processedMessage, isNew: true }]
        const deduplicated = Array.from(new Map(updated.map(msg => [msg.id, msg])).values())
        return deduplicated.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      })

      if (processedMessage.channel_id === selectedChannel?.id && processedMessage.author_id !== user?.id && socket && socket.connected) {
        setTimeout(() => {
          socket.emit('mark_message_read', { message_id: processedMessage.id, channel_id: selectedChannel.id })
        }, 500)
      }

      if (processedMessage.channel_id === selectedChannel?.id) {
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
      } else {
        setUnreadCounts(prev => ({ ...prev, [processedMessage.channel_id]: (prev[processedMessage.channel_id] || 0) + 1 }))
      }

      try { if (socket && socket.connected) socket.emit('message_ack', { message_id: processedMessage.id, channel_id: processedMessage.channel_id }) } catch (e) { }
    })

    newSocket.off('user_typing').on('user_typing', (data) => {
      if (data.channel_id === selectedChannel?.id && data.user_id !== user?.id) {
        setTypingUsers(prev => ({ ...prev, [data.user_id]: data.user_name || 'Someone' }))
        setTimeout(() => setTypingUsers(prev => { const newState = { ...prev }; delete newState[data.user_id]; return newState }), 3000)
      }
    })

    newSocket.off('message_reaction').on('message_reaction', (data) => {
      if (data.channel_id === selectedChannel?.id) {
        setMessageReactions(prev => {
          const current = prev[data.message_id] || {}
          const currentUsers = current[data.emoji] || []
          if (currentUsers.includes(data.user_id)) {
            const updated = { ...current }
            updated[data.emoji] = currentUsers.filter(id => id !== data.user_id)
            if (updated[data.emoji].length === 0) delete updated[data.emoji]
            return { ...prev, [data.message_id]: updated }
          }
          return { ...prev, [data.message_id]: { ...current, [data.emoji]: [...currentUsers, data.user_id] } }
        })
      }
    })

    newSocket.off('message_deleted').on('message_deleted', (data) => {
      if (data.channel_id === selectedChannel?.id) {
        queryClient.setQueryData(['messages', data.channel_id], (oldMessages = []) => oldMessages.filter(m => m.id !== data.message_id))
      }
    })

    newSocket.off('message_updated').on('message_updated', (messageData) => {
      if (messageData.channel_id === selectedChannel?.id) {
        queryClient.setQueryData(['messages', messageData.channel_id], (oldMessages = []) => oldMessages.map(m => m.id === messageData.id ? { ...messageData, is_edited: true } : m))
      }
    })

    newSocket.off('message_read').on('message_read', (data) => {
      if (data.channel_id === selectedChannel?.id) {
        queryClient.setQueryData(['messages', data.channel_id], (oldMessages = []) => oldMessages.map(m => {
          if (m.id === data.message_id) {
            const readBy = m.read_by || []
            if (!readBy.includes(data.user_id)) return { ...m, read_by: [...readBy, data.user_id] }
          }
          return m
        }))
      }
    })

    return () => {
      clearInterval(__pingInterval)
      try {
        newSocket.off('connect')
        newSocket.off('disconnect')
        newSocket.off('connect_error')
        newSocket.off('error')
        newSocket.off('pong')
        newSocket.off('message_received')
        newSocket.off('user_typing')
        newSocket.off('message_reaction')
        newSocket.off('message_deleted')
        newSocket.off('message_updated')
        newSocket.off('message_read')
      } catch (e) { /* ignore */ }
    }
  }, [sharedSocket, queryClient, selectedChannel?.id, sharedSocketStatus, user?.id])

  // Join channel room on socket
  useEffect(() => {
    if (socket && socket.connected && selectedChannel) {
      socket.emit('join_channel', { channel_id: selectedChannel.id })
      console.log(`[Chat] Joined channel ${selectedChannel.id}`)

      return () => {
        if (socket && socket.connected) {
          socket.emit('leave_channel', { channel_id: selectedChannel.id })
          console.log(`[Chat] Left channel ${selectedChannel.id}`)
        }
      }
    }
  }, [socket, selectedChannel?.id])

  // Auto scroll to bottom on new messages or when channel changes
  useEffect(() => {
    if (messages.length > 0 && selectedChannel) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      })
    }
  }, [messages.length, selectedChannel?.id])

  // Close message menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.message-menu') && !e.target.closest('.message-wrapper')) {
        setShowMessageMenu(null)
      }
    }
    if (showMessageMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showMessageMenu])

  const handleCreateChatroom = async (data) => {
    try {
      console.log('Creating chatroom with data:', data)

      // Validate required fields
      if (!data.name || !data.name.trim()) {
        notify('info', 'Please enter a chatroom name')
        return
      }

      const channel = await channelsAPI.createChannel(data)
      console.log('Chatroom created successfully:', channel)

      // Close modal and reset
      setShowCreateModal(false)

      // Refresh channels list
      queryClient.invalidateQueries(['channels'])

      // Navigate to the new channel
      if (channel && channel.id) {
        navigate(`/chat/${channel.id}`)
      } else {
        // If channel creation succeeded but no ID, just refresh
        navigate('/chat')
      }
    } catch (error) {
      console.error('Failed to create chatroom:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)

      // Show detailed error message
      let errorMessage = 'Failed to create chatroom'
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }

      notify('error', errorMessage)
    }
  }

  const handleDeleteChannel = async (channelId) => {
    try {
      await channelsAPI.deleteChannel(channelId)

      // Show success message
      notify('success', 'Channel deleted successfully')

      // Refresh channels list
      queryClient.invalidateQueries(['channels'])

      // Navigate away from deleted channel
      const remainingChannels = channels.filter(c => c.id !== channelId)
      if (remainingChannels.length > 0) {
        navigate(`/chat/${remainingChannels[0].id}`)
      } else {
        navigate('/chat')
      }
    } catch (error) {
      console.error('Error deleting channel:', error)
      const errorMessage = error.response?.data?.error || 'Failed to delete channel'
      notify('error', errorMessage)
    }
  }

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      if (!selectedChannel) {
        throw new Error('No channel selected')
      }

      let content = data.content

      // Encrypt message if channel is encrypted
      /* Encryption is handled by backend to avoid double-encryption and [Message] errors
      if (selectedChannel?.is_encrypted && encryptionKey && content && content !== '[File]') {
        try {
          // Validate encryption key before attempting encryption
          if (typeof encryptionKey === 'string' && encryptionKey.trim().length > 0) {
            content = await encryptionUtil.encryptMessage(content, encryptionKey)
          } else {
            console.warn('Invalid encryption key, sending message unencrypted')
            // Continue without encryption if key is invalid
          }
        } catch (error) {
          console.error('Encryption error:', error)
          // Don't throw error, just log it and continue with unencrypted message
          // This allows the message to be sent even if encryption fails
          console.warn('Sending message without encryption due to encryption error')
        }
      }
      */

      // If editing, update message instead of creating new one
      if (editingMessage) {
        return messagesAPI.updateMessage(editingMessage.id, {
          content,
          file_ids: data.file_ids || []
        })
      }

      // Extract mentions from original content (before encryption)
      const originalContent = data.content
      const mentionPattern = /@(\w+)/g
      const mentionedUsernames = []
      let match
      while ((match = mentionPattern.exec(originalContent)) !== null) {
        mentionedUsernames.push(match[1])
      }

      // Get mentioned user IDs
      const mentionedUserIds = []
      if (mentionedUsernames.length > 0) {
        try {
          const allMembers = await channelsAPI.getMembers(selectedChannel.id)
          mentionedUsernames.forEach(username => {
            const user = allMembers.find(m => m.username === username)
            if (user) mentionedUserIds.push(user.id)
          })
        } catch (error) {
          console.error('Error fetching members for mentions:', error)
          // Continue without mentions if member fetch fails
        }
      }

      return messagesAPI.createMessage(selectedChannel.id, {
        ...data,
        content,
        mentions: mentionedUserIds,
        file_ids: data.file_ids || [],
        thread_id: data.thread_id || null,
        reply_to: data.reply_to || null
      })
    },
    onSuccess: (newMessage, variables) => {
      // Update cache with real message, replacing temp message
      if (editingMessage) {
        // Replace edited message
        queryClient.setQueryData(['messages', selectedChannel.id], (oldMessages = []) => {
          return oldMessages.map(m =>
            m.id === editingMessage.id ? { ...newMessage, is_edited: true } : m
          )
        })
      } else {
        // Replace temp message with real message
        queryClient.setQueryData(['messages', selectedChannel.id], (oldMessages = []) => {
          // First deduplicate existing messages by ID (to be safe)
          const uniqueOldMessages = Array.from(
            new Map(oldMessages.map(msg => [msg.id, msg])).values()
          )

          // Remove the specific temp message by ID
          const filtered = uniqueOldMessages.filter(m => m.id !== variables.tempId)

          // Check if real message already exists (e.g. from socket)
          const exists = filtered.some(m => m.id === newMessage.id)

          if (!exists) {
            // Add new message
            const updated = [...filtered, { ...newMessage, isNew: true }]
            return updated.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
          }

          // Update existing message
          return filtered.map(m => m.id === newMessage.id ? { ...newMessage, isNew: true } : m)
            .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        })
      }

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    },
    onError: (error) => {
      console.error('Error sending message:', error)

      // If network error or no response, keep the temp message and enqueue for retry
      if (error.request && !error.response) {
        try {
          const temp = { id: `temp-${Date.now()}`, channel_id: selectedChannel.id }
          const payload = {
            content: error.config?.data?.content || '',
            message_type: error.config?.data?.message_type || 'text',
            file_ids: error.config?.data?.file_ids || [],
            thread_id: error.config?.data?.thread_id || null,
            reply_to: error.config?.data?.reply_to || null
          }
          enqueueUnsentMessage(temp, payload)
        } catch (e) {
          console.error('Failed to enqueue unsent message:', e)
        }
      } else {
        // Remove temp message on server-side errors
        queryClient.setQueryData(['messages', selectedChannel.id], (oldMessages = []) => {
          return oldMessages.filter(m => !m.id?.toString().startsWith('temp-'))
        })
      }

      // Show user-friendly error message (non-blocking)
      let errorMessage = 'Failed to send message. Please try again.'

      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error || error.response.statusText || errorMessage
        if (error.response.status === 403) {
          errorMessage = 'You do not have permission to send messages in this channel. Please contact the channel administrator.'
        } else if (error.response.status === 404) {
          errorMessage = 'Channel not found. Please refresh the page.'
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.'
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your internet connection and ensure the server is running.'
      } else {
        // Something else happened
        errorMessage = error.message || errorMessage
      }

      // Use console.error instead of alert to avoid blocking UI
      console.error('Message send error:', errorMessage)

      // Show a non-blocking notification (you can replace this with a toast library later)
      // For now, just log it so the user can see it in console and continue typing
      // The input field will remain active
    }
  })

  const handleSend = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if ((!message.trim() && selectedFiles.length === 0) || !selectedChannel || uploadingFiles) return

    let messageContent = message.trim()
    let messageType = selectedFiles.length > 0 ? 'file' : 'text'

    if (messageContent.startsWith('/assignment')) {
      messageType = 'assignment'
      messageContent = messageContent.replace('/assignment', '').trim() || 'New Assignment'
    } else if (messageContent.startsWith('/announce')) {
      messageType = 'announcement'
      messageContent = messageContent.replace('/announce', '').trim() || 'New Announcement'
    } else if (messageContent.startsWith('/poll')) {
      messageType = 'poll'
      messageContent = messageContent.replace('/poll', '').trim() || 'Quick Poll'
    }
    const fileIds = []

    // Upload files first
    if (selectedFiles.length > 0) {
      setUploadingFiles(true)
      try {
        for (const file of selectedFiles) {
          // If the file is already uploaded (server object with id), use it directly
          if (file && file.id) {
            fileIds.push(file.id)
            continue
          }
          const uploadedFile = await filesAPI.uploadFile(file, selectedChannel.id)
          fileIds.push(uploadedFile.id)
        }
      } catch (error) {
        console.error('File upload error:', error)
        notify('error', 'Failed to upload files. Please try again.')
        setUploadingFiles(false)
        return
      }
      setUploadingFiles(false)
    }

    // Store original content for optimistic update
    const originalContent = messageContent || '[File]'

    // Optimistically add message to UI
    const tempMessage = {
      id: `temp-${Date.now()}`,
      channel_id: selectedChannel.id,
      author_id: user?.id,
      author: user,
      content: originalContent,
      message_type: messageType,
      file_ids: fileIds,
      attachments: selectedFiles.map((f, i) => ({
        id: f.id || `temp-file-${i}`,
        original_filename: f.original_filename || f.name,
        file_size: f.file_size || f.size,
        mime_type: f.mime_type || f.type
      })),
      created_at: new Date().toISOString(),
      is_encrypted: selectedChannel?.is_encrypted || false,
      isNew: true
    }

    queryClient.setQueryData(['messages', selectedChannel.id], (oldMessages = []) => {
      return [...oldMessages, tempMessage]
    })

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    // Clear input immediately for better UX
    setMessage('')
    setSelectedFiles([])
    setReplyToMessage(null)
    setEditingMessage(null)

    // Send message via API (backend will emit via socket)
    // If offline or socket disconnected, enqueue the message for retry
    if (!navigator.onLine || (socket && !socket.connected)) {
      try {
        enqueueUnsentMessage(tempMessage, {
          content: originalContent,
          message_type: messageType,
          file_ids: fileIds,
          thread_id: replyToMessage?.id || null,
          reply_to: replyToMessage?.id || null
        })
      } catch (e) {
        console.error('Failed to enqueue unsent message:', e)
      }
    } else {
      try {
        sendMessageMutation.mutate({
          content: originalContent,
          message_type: messageType,
          file_ids: fileIds,
          thread_id: replyToMessage?.id || null,
          reply_to: replyToMessage?.id || null,
          tempId: tempMessage.id
        })
      } catch (error) {
        console.error('Error sending message:', error)
        // Error handling is done in mutation onError
      }
    }

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles([...selectedFiles, ...files])
    e.target.value = ''
  }

  const handleRemoveFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const handleTyping = useCallback((value) => {
    setMessage(value)

    // Handle Mentions
    const lastWord = value.split(' ').pop()
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      setMentionQuery(lastWord.substring(1))
      setMentionStartIndex(value.lastIndexOf('@'))
      setShowMentionSuggestions(true)
    } else {
      setShowMentionSuggestions(false)
    }

    // Phase 2: Handle Slash Commands
    if (value.startsWith('/')) {
      setSlashQuery(value.substring(1).split(' ')[0])
      setShowSlashSuggestions(true)
    } else {
      setShowSlashSuggestions(false)
    }

    // Typing socket emit
    if (socket && selectedChannel) {
      socket.emit('typing', {
        channel_id: selectedChannel.id,
        user_id: user?.id,
        username: user?.username
      })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { channel_id: selectedChannel.id, user_id: user?.id })
      }, 2000)
    }
  }, [socket, selectedChannel, user])

  // Auto-resize helper for textarea
  const autoResizeTextarea = (el) => {
    if (!el) return
    try {
      el.style.height = 'auto'
      const scroll = el.scrollHeight
      el.style.height = Math.min(scroll, 300) + 'px'
    } catch (e) { }
  }

  // Ensure textarea resizes when message changes (e.g., programmatic clear)
  useEffect(() => {
    autoResizeTextarea(messageInputRef.current)
  }, [message])

  // Message action handlers
  const handleCall = async (userId, type) => {
    try {
      // Get user info first
      const targetUser = await usersAPI.getUser(userId)
      const roomName = `Direct Call: ${user?.first_name || user?.username} & ${targetUser?.first_name || targetUser?.username}`

      // Create direct meeting room
      const response = await roomsAPI.createRoom({
        name: roomName,
        meeting_type: 'direct',
        participants: [userId]
      })

      if (response && response.id) {
        navigate(`/meeting/${response.id}?type=${type}`)
      } else {
        // Fallback: try to find existing room or navigate to direct meeting
        navigate(`/meeting/direct?user=${userId}&type=${type}`)
      }
    } catch (error) {
      console.error('Error creating direct call room:', error)
      // Fallback: navigate to direct meeting page
      navigate(`/meeting/direct?user=${userId}&type=${type}`)
    }
  }

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      // Toggle reaction
      setMessageReactions(prev => {
        const current = prev[messageId] || {}
        const currentUsers = current[emoji] || []
        const hasReacted = currentUsers.includes(user?.id)

        if (hasReacted) {
          // Remove reaction
          const updated = { ...current }
          updated[emoji] = currentUsers.filter(id => id !== user?.id)
          if (updated[emoji].length === 0) {
            delete updated[emoji]
          }
          return { ...prev, [messageId]: updated }
        } else {
          // Add reaction
          return {
            ...prev,
            [messageId]: {
              ...current,
              [emoji]: [...currentUsers, user?.id]
            }
          }
        }
      })

      // Emit reaction via socket
      if (socket) {
        socket.emit('react_to_message', {
          message_id: messageId,
          emoji: emoji,
          user_id: user?.id
        })
      }
    } catch (error) {
      console.error('Error reacting to message:', error)
    }
  }

  const handleReplyToMessage = (msg) => {
    setReplyToMessage(msg)
    messageInputRef.current?.focus()
  }

  const handleForwardMessage = (msg) => {
    setForwardMessage(msg)
    // TODO: Show forward modal to select channel
    notify('info', 'Forward feature - Select channel to forward to')
  }

  const handleCopyMessage = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.content)
      // Show toast notification
      notify('success', 'Message copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleReplyPrivately = (msg) => {
    // Navigate to direct message or create private channel
    navigate(`/chat/private/${msg.author_id}`)
  }

  const handleEditMessage = (msg) => {
    setEditingMessage(msg)
    setMessage(msg.content)
    messageInputRef.current?.focus()
  }

  const handleDeleteMessage = async (messageId) => {
    const ok = await confirm('Are you sure you want to delete this message?')
    if (!ok) return

    try {
      await messagesAPI.deleteMessage(messageId)
      queryClient.invalidateQueries(['messages', selectedChannel?.id])

      // Emit delete via socket
      if (socket) {
        socket.emit('delete_message', {
          message_id: messageId,
          channel_id: selectedChannel?.id
        })
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      notify('error', 'Failed to delete message')
    }
  }

  const startVoiceRecording = async () => {
    try {
      canceledRecordingRef.current = false
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedAudioMimeType()
      let mediaRecorder
      try {
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      } catch (err) {
        // Fallback to default if specific mimeType isn't supported by the browser
        mediaRecorder = new MediaRecorder(stream)
      }
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        // If canceled, skip upload and cleanup
        if (canceledRecordingRef.current) {
          try { stream.getTracks().forEach(t => t.stop()) } catch (e) { }
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
          if (audioContextRef.current) {
            try { audioContextRef.current.close() } catch (e) { }
            audioContextRef.current = null
          }
          clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = null
          setRecordingStartTime(null)
          setRecordingTimer('00:00')
          canceledRecordingRef.current = false
          return
        }

        try {
          // Get the supported MIME type and map to proper file extension
          const mime = getSupportedAudioMimeType() || 'audio/webm'
          const ext = getAudioFileExtension(mime)

          // Create audio blob with proper MIME type
          const audioBlob = new Blob(audioChunksRef.current, { type: mime })

          // Validate blob is not empty
          if (audioBlob.size === 0) {
            throw new Error('Audio recording failed: empty blob')
          }

          // Create file with proper name and type
          const timestamp = Date.now()
          const audioFile = new File(
            [audioBlob],
            `voice-note-${timestamp}.${ext}`,
            { type: mime }
          )

          setUploadingFiles(true)
          const uploadedFile = await filesAPI.uploadFile(audioFile, selectedChannel?.id)

          // Verify the uploaded file has correct MIME type
          if (uploadedFile && uploadedFile.mime_type) {
            console.log(`Voice note uploaded: ${uploadedFile.original_filename} (${uploadedFile.mime_type}, ${uploadedFile.file_size} bytes)`)
          }

          // Build payload for immediate sending
          const durationStr = formatDuration(accumulatedTimeRef.current)
          const voicePayload = {
            channel_id: selectedChannel?.id,
            content: `Voice Message (${durationStr})`,
            message_type: 'voice',
            file_ids: [uploadedFile.id]
          }

          // Send via mutation to ensure it's saved in DB and broadcasted correctly
          // Our mutation handles offline queuing automatically
          sendMessageMutation.mutate(voicePayload)
        } catch (error) {
          console.error('Voice note upload error:', error)
          notify('error', error.message || 'Failed to record voice note')
        } finally {
          setUploadingFiles(false)
          try { stream.getTracks().forEach(track => track.stop()) } catch (e) { }
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
          if (audioContextRef.current) {
            try { audioContextRef.current.close() } catch (e) { }
            audioContextRef.current = null
          }
          // stop timer
          clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = null
          setRecordingStartTime(null)
          setRecordingTimer('00:00')
          accumulatedTimeRef.current = 0
          lastStartTimeRef.current = null
          setIsRecordingPaused(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsRecordingPaused(false)
      accumulatedTimeRef.current = 0
      lastStartTimeRef.current = Date.now()
      setRecordingTimer('0:00')

      // start timer
      recordingIntervalRef.current = setInterval(() => {
        if (!isRecordingPaused) {
          const totalElapsed = accumulatedTimeRef.current + (Date.now() - (lastStartTimeRef.current || Date.now()))
          setRecordingTimer(formatDuration(totalElapsed))
        }
      }, 200)

      // Setup audio analyser and waveform drawing
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const audioCtx = new AudioContext()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        sourceNodeRef.current = source
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyserRef.current = analyser
        source.connect(analyser)
        const bufferLength = analyser.frequencyBinCount
        dataArrayRef.current = new Uint8Array(bufferLength)

        const canvas = recordingCanvasRef.current
        const canvasCtx = canvas?.getContext('2d')
        const draw = () => {
          if (!canvasCtx || !analyserRef.current) {
            animationFrameRef.current = requestAnimationFrame(draw)
            return
          }
          const width = canvas.width
          const height = canvas.height
          analyserRef.current.getByteFrequencyData(dataArrayRef.current)

          canvasCtx.clearRect(0, 0, width, height)

          // Professional visualization: middle-out bars
          const barWidth = 3
          const barGap = 2
          const barCount = Math.floor(width / (barWidth + barGap))

          for (let i = 0; i < barCount; i++) {
            const dataIdx = Math.floor((i / barCount) * bufferLength)
            const value = dataArrayRef.current[dataIdx] || 0
            const barHeight = (value / 255) * height * 0.8

            canvasCtx.fillStyle = '#ef4444'
            const x = i * (barWidth + barGap)
            const y = (height - barHeight) / 2

            // Draw rounded bar
            if (canvasCtx.roundRect) {
              canvasCtx.beginPath()
              canvasCtx.roundRect(x, y, barWidth, barHeight, 2)
              canvasCtx.fill()
            } else {
              canvasCtx.fillRect(x, y, barWidth, barHeight)
            }
          }

          animationFrameRef.current = requestAnimationFrame(draw)
        }
        animationFrameRef.current = requestAnimationFrame(draw)
      } catch (e) {
        // Non-fatal: if audio context creation fails, continue without waveform
        console.warn('Waveform initialization failed', e)
      }
    } catch (error) {
      console.error('Error starting voice recording:', error)
      notify('error', 'Failed to access microphone. Please allow microphone access.')
    }
  }

  const pauseVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsRecordingPaused(true)
      if (lastStartTimeRef.current) {
        accumulatedTimeRef.current += (Date.now() - lastStartTimeRef.current)
      }
      lastStartTimeRef.current = null
    }
  }

  const resumeVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsRecordingPaused(false)
      lastStartTimeRef.current = Date.now()
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      // clear timer here too (in case onstop doesn't fire immediately)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const cancelVoiceRecording = () => {
    canceledRecordingRef.current = true
    try {
      if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop()
    } catch (e) { }
    setIsRecording(false)
  }

  // Utility: return best audio mime supported by the browser
  const getSupportedAudioMimeType = () => {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null
    // Prefer high-quality codecs first: Opus > Vorbis > MP3
    const candidates = [
      'audio/webm;codecs=opus',     // Best: WebM with Opus (high quality, small size)
      'audio/webm',                 // WebM container (will use default codec)
      'audio/ogg;codecs=opus',      // OGG with Opus
      'audio/ogg',                  // OGG container
      'audio/mp4',                  // MP4/AAC
      'audio/mpeg'                  // MP3 fallback
    ]
    for (const t of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(t)) return t
      } catch (e) {
        // continue
      }
    }
    return null
  }

  const getAudioFileExtension = (mimeType) => {
    if (!mimeType) return 'webm'
    if (mimeType.includes('webm')) return 'webm'
    if (mimeType.includes('ogg')) return 'ogg'
    if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'm4a'
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
    if (mimeType.includes('wav')) return 'wav'
    return 'webm'
  }

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
    const seconds = (totalSeconds % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      videoRecorderRef.current = mediaRecorder
      videoChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        videoChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' })
        const videoFile = new File([videoBlob], `video-message-${Date.now()}.webm`, { type: 'video/webm' })

        try {
          setUploadingFiles(true)
          const uploadedFile = await filesAPI.uploadFile(videoFile, selectedChannel.id)

          sendMessageMutation.mutate({
            content: '🎥 Video message',
            message_type: 'video',
            file_ids: [uploadedFile.id]
          })

          if (socket) {
            socket.emit('new_message', {
              channel_id: selectedChannel.id,
              content: '🎥 Video message',
              message_type: 'video'
            })
          }
        } catch (error) {
          console.error('Video upload error:', error)
          notify('error', 'Failed to send video')
        } finally {
          setUploadingFiles(false)
        }

        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecordingVideo(true)
    } catch (error) {
      console.error('Error starting video recording:', error)
      notify('error', 'Failed to access camera. Please allow camera access.')
    }
  }

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop()
      setIsRecordingVideo(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (file) => {
    const mimeType = file.mime_type || file.type || ''
    if (mimeType.startsWith('image/')) return <FiImage />
    if (mimeType.startsWith('video/')) return <FiVideo />
    if (mimeType.startsWith('audio/')) return <FiMic />
    return <FiFile />
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const formatMessageTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const renderMessageContent = (msg) => {
    if (!msg.content) return ''

    // Parse mentions (@username) and highlight them
    const content = msg.content
    const parts = []
    const mentionPattern = /@(\w+)/g
    let lastIndex = 0
    let match

    while ((match = mentionPattern.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>)
      }

      // Check if mentioned user is in the mentions list
      const isMentioned = msg.mentions && msg.mentions.length > 0
      const username = match[1]

      // Find user from channel members
      const mentionedUser = channelMembers.find(m => m.username === username)

      parts.push(
        <span key={`mention-${match.index}`} className="mention-highlight">
          @{username}
        </span>
      )

      lastIndex = mentionPattern.lastIndex
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>)
    }

    return parts.length > 0 ? parts : content
  }

  return (
    <div className={`chat-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isMobile ? 'is-mobile' : ''}`}>
      {/* Channels Sidebar */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${activeSidebarTab === 'joined' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('joined')}
            >
              Joined
            </button>
            <button 
              className={`sidebar-tab ${activeSidebarTab === 'discover' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('discover')}
            >
              Discover
            </button>
          </div>
          <div className="header-title-row" style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1rem' }}>{activeSidebarTab === 'joined' ? 'My Chatrooms' : 'Public Channels'}</h2>
              {activeSidebarTab === 'joined' && (
                <>
                  <span className="channel-count">{channels.length}</span>
                  <button
                    className="create-channel-btn"
                    onClick={() => setShowCreateModal(true)}
                    title="Create new chatroom"
                    style={{ marginLeft: '4px' }}
                  >
                    <FiPlus />
                  </button>
                </>
              )}
            </div>
            <button
              className="header-action-btn"
              onClick={() => {
                const searchEl = document.getElementById('sidebar-search-container');
                if (searchEl) {
                  searchEl.style.display = searchEl.style.display === 'none' ? 'flex' : 'none';
                }
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <FiSearch size={20} />
            </button>
          </div>
        </div>

        <div id="sidebar-search-container" className="sidebar-search" style={{ display: 'none', marginBottom: '10px' }}>
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search chatrooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
        </div>

        <div className="channels-list">
          {activeSidebarTab === 'joined' ? (
            filteredChannels.length > 0 ? (
              filteredChannels.map((channel) => {
                const isActive = selectedChannel?.id === channel.id
                return (
                  <div
                    key={channel.id}
                    className={`channel-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedChannel(channel)
                      setUnreadCounts(prev => ({ ...prev, [channel.id]: 0 }))
                      if (isMobile) setIsSidebarOpen(false)
                      navigate(`/chat/${channel.id}`)
                    }}
                  >
                    <div className="channel-avatar group-hover:scale-110 transition-transform duration-300">
                      <div className="avatar-glass"></div>
                      {channel.is_encrypted ? (
                        <FiLock className="channel-icon text-emerald-400" />
                      ) : (
                        <FiHash className="channel-icon text-indigo-400" />
                      )}
                      {(unreadCounts[channel.id] || 0) > 0 && (
                        <div className="unread-badge animate-bounce">
                          {unreadCounts[channel.id]}
                        </div>
                      )}
                    </div>
                    <div className="channel-details">
                      <div className="channel-name-row">
                        <span className="channel-name font-bold tracking-tight">{channel.name}</span>
                        {channel.is_encrypted && (
                          <FiLock className="lock-icon text-emerald-400" size={12} />
                        )}
                      </div>
                      <div className="channel-meta">
                        <span className="member-count flex items-center gap-1 opacity-60">
                          <FiUsers size={10} /> {channel.member_count || 0}
                        </span>
                        {channel.description && (
                          <span className="channel-desc truncate text-xs opacity-40 italic">{channel.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-channels">
                <div className="empty-icon">💬</div>
                <p className="empty-text">No chatrooms found</p>
                {searchQuery && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </button>
                )}
                {!searchQuery && (
                  <button
                    className="create-first-btn"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <FiPlus /> Create Your First Chatroom
                  </button>
                )}
              </div>
            )
          ) : (
            /* DISCOVER TAB */
            <div className="discover-channels-container">
              {isDiscoverLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner-mini"></div>
                  <p>Searching for public spaces...</p>
                </div>
              ) : availableChannels.length > 0 ? (
                availableChannels
                  .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(channel => (
                    <div key={channel.id} className="channel-item discover-item">
                      <div className="channel-avatar">
                        <FiHash className="channel-icon" />
                      </div>
                      <div className="channel-details">
                        <div className="channel-name-row">
                          <span className="channel-name">{channel.name}</span>
                        </div>
                        <div className="channel-meta">
                          <span className="member-count"><FiUsers size={10} /> {channel.member_count} members</span>
                        </div>
                        <button 
                          className="join-channel-mini-btn"
                          onClick={() => {
                            channelsAPI.joinChannel(channel.id)
                              .then(() => {
                                notify('success', `Joined ${channel.name}`)
                                refetchChannels()
                                setActiveSidebarTab('joined')
                                navigate(`/chat/${channel.id}`)
                              })
                              .catch(err => notify('error', err.response?.data?.error || 'Failed to join'))
                          }}
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="empty-channels">
                  <FiSearch size={40} opacity={0.3} />
                  <p>No new public channels found in your workspace.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="header-info">
                {isMobile && (
                  <button className="mobile-back-btn" onClick={() => setIsSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                    <FiArrowRight size={20} />
                  </button>
                )}
                <div className="channel-header-avatar">
                  {selectedChannel.is_encrypted ? (
                    <FiLock className="header-icon" />
                  ) : (
                    <FiHash className="header-icon" />
                  )}
                </div>
                <div className="header-text">
                  <h3
                    className="channel-title"
                    onClick={() => setShowContextPanel(!showContextPanel)}
                    style={{ cursor: 'pointer' }}
                    title="Click for channel info"
                  >
                    {selectedChannel.name}
                    {selectedChannel.is_encrypted && (
                      <FiLock className="encryption-icon" size={14} />
                    )}
                  </h3>
                  {/* Socket status badge */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                    <span className={`socket-status-dot socket-${socketStatus}`} aria-hidden="true" />
                    <small style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{socketStatus}</small>
                  </div>
                  <p className="channel-subtitle">
                    {selectedChannel.description || 'No description'}

                  </p>
                </div>
              </div>
              <div className="header-actions">
                <button
                  className="header-action-btn"
                  onClick={() => setShowUserSearch(!showUserSearch)}
                  title="Search Users"
                >
                  <FiSearch />
                </button>
                {selectedChannel.is_encrypted && (
                  <div className="encryption-badge" title="End-to-end encrypted">
                    <FiLock size={14} />
                  </div>
                )}
                {/* Show manage/delete buttons for channel creator OR admin */}
                {(() => {
                  const currentMember = channelMembers.find(m => m.user_id === user?.id)
                  const isChannelAdmin = currentMember && ['admin', 'co-admin'].includes(currentMember.member_role)
                  const canManage = selectedChannel.created_by === user?.id || user?.role === 'admin' || isChannelAdmin
                  if (!canManage) return null
                  return (
                    <>
                      <button
                        className="header-action-btn"
                        onClick={() => {
                          setShowInviteModal(true)
                          setInviteLoading(true)
                          setInviteError(null)
                          channelsAPI.generateShareLink(selectedChannel.id, { qr: true })
                            .then(d => setInviteData(d))
                            .catch(err => setInviteError(err.response?.data?.error || 'Failed to generate link'))
                            .finally(() => setInviteLoading(false))
                        }}
                        title="Invite users / Share link"
                      >
                        <FiShare2 />
                      </button>
                      <button
                        className="header-action-btn"
                        onClick={() => {
                          setShowMembersModal(true)
                          loadChannelMembers()
                        }}
                        title="Manage Members"
                      >
                        <FiUsers />
                      </button>
                      <button
                        className="header-action-btn delete"
                        onClick={async () => {
                          const confirmMessage = user?.role === 'admin' && selectedChannel.created_by !== user?.id
                            ? `Are you sure you want to delete "${selectedChannel.name}"? You are deleting this channel as an admin. This action cannot be undone.`
                            : `Are you sure you want to delete "${selectedChannel.name}"? This action cannot be undone.`
                          const ok = await confirm(confirmMessage)
                          if (ok) {
                            handleDeleteChannel(selectedChannel.id)
                          }
                        }}
                        title={user?.role === 'admin' ? "Delete Chatroom (Admin)" : "Delete Chatroom"}
                      >
                        <FiTrash2 />
                      </button>
                    </>
                  )
                })()}
                <button
                  className={`header-action-btn ${showContextPanel ? 'active' : ''}`}
                  onClick={() => setShowContextPanel(!showContextPanel)}
                  title="Channel Information"
                >
                  <FiList />
                </button>
              </div>
              {/* User Search Dropdown */}
              {showUserSearch && (
                <div className="user-search-dropdown">
                  <div className="search-input-wrapper">
                    <FiSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="user-search-input"
                      autoFocus
                    />
                    <button
                      className="close-search-btn"
                      onClick={() => {
                        setShowUserSearch(false)
                        setUserSearchQuery('')
                        setSearchResults([])
                      }}
                    >
                      <FiX />
                    </button>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="search-results-list">
                      {searchResults.map((searchUser) => (
                        <div
                          key={searchUser.id}
                          className="search-result-item"
                          onClick={() => {
                            // Insert mention in message input
                            const currentMessage = message
                            const newMessage = currentMessage
                              ? `${currentMessage} @${searchUser.username} `
                              : `@${searchUser.username} `
                            setMessage(newMessage)
                            messageInputRef.current?.focus()
                            setShowUserSearch(false)
                            setUserSearchQuery('')
                            setSearchResults([])
                          }}
                        >
                          <div className="search-avatar">
                            {searchUser.first_name?.[0]?.toUpperCase() || searchUser.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="search-user-info">
                            <strong>{searchUser.first_name} {searchUser.last_name}</strong>
                            <span className="search-username">@{searchUser.username} • {searchUser.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : userSearchQuery.length >= 2 ? (
                    <div className="search-empty">No users found</div>
                  ) : (
                    <div className="search-placeholder">Type at least 2 characters to search</div>
                  )}
                </div>
              )}
              {/* Invite Modal */}
              {showInviteModal && (
                <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>Invite to "{selectedChannel.name}"</h3>
                      <button className="modal-close" onClick={() => setShowInviteModal(false)}>✕</button>
                    </div>

                    <div className="modal-body">
                      {inviteLoading && <p className="loading">Generating link...</p>}
                      {inviteError && <p className="error-text">{inviteError}</p>}

                      {inviteData && (
                        <div className="invite-section">
                          <h4>Share Link</h4>
                          <div className="invite-link-container">
                            <input type="text" readOnly value={inviteData.share_link} className="invite-link-input" />
                            <button className="btn btn-secondary" onClick={() => {
                              navigator.clipboard.writeText(inviteData.share_link)
                              notify('success', 'Link copied to clipboard')
                            }}>Copy</button>
                          </div>

                          {inviteData.qr_image_base64 && (
                            <div className="invite-qr-container">
                              <h5>QR Code</h5>
                              <img src={`data:image/png;base64,${inviteData.qr_image_base64}`} alt="QR code" className="invite-qr" />
                            </div>
                          )}

                          <button className="btn btn-danger" onClick={async () => {
                            setInviteLoading(true)
                            setInviteError(null)
                            try {
                              const d = await channelsAPI.generateShareLink(selectedChannel.id, { qr: true, regen: true })
                              setInviteData(d)
                              notify('info', 'Share link regenerated — previous link is now revoked')
                            } catch (err) {
                              setInviteError(err.response?.data?.error || 'Failed to regenerate')
                            } finally {
                              setInviteLoading(false)
                            }
                          }}>Regenerate & Revoke Previous</button>
                        </div>
                      )}

                      <div className="invite-section">
                        <h4>Invite by Email</h4>
                        <div className="invite-form">
                          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" className="form-input" />
                          <input type="number" min={1} placeholder="max uses (optional)" id="invite-max-uses" className="form-input" />
                          <input type="number" min={1} placeholder="expires (days)" id="invite-expires-days" className="form-input" />
                          <button className="btn btn-primary" onClick={async () => {
                            if (!inviteEmail) { notify('info', 'Enter an email'); return }
                            try {
                              const maxUsesEl = document.getElementById('invite-max-uses')
                              const expiresEl = document.getElementById('invite-expires-days')
                              const res = await channelsAPI.createInvite(selectedChannel.id, { email: inviteEmail, max_uses: maxUsesEl?.value || null, expires_in_days: expiresEl?.value || null })
                              notify('success', 'Invite created and email sent (if SMTP configured)')
                              setInviteEmail('')
                              loadChannelMembers()
                            } catch (err) {
                              notify('error', err.response?.data?.error || 'Failed to create invite')
                            }
                          }}>Create & Email Invite</button>
                        </div>
                      </div>

                      <div className="members-column">
                        <h4>Channel Members</h4>
                        <div className="members-list">
                          {channelMembers.map(cm => (
                            <div key={cm.user_id} className="member-item">
                              <div className="member-info">
                                <strong>{cm.username}</strong>
                                <small className="member-role">{cm.member_role}</small>
                              </div>
                              {cm.user_id !== user?.id && (
                                <div className="member-actions">
                                  {cm.member_role !== 'admin' ? (
                                    <button className="btn btn-sm btn-secondary" onClick={async () => {
                                      try {
                                        await channelsAPI.updateMemberRole(selectedChannel.id, cm.user_id, 'admin')
                                        notify('success', 'Promoted to admin')
                                        loadChannelMembers()
                                      } catch (err) {
                                        notify('error', err.response?.data?.error || 'Failed')
                                      }
                                    }}>Make Admin</button>
                                  ) : (
                                    <button className="btn btn-sm btn-secondary" onClick={async () => {
                                      try {
                                        await channelsAPI.updateMemberRole(selectedChannel.id, cm.user_id, 'member')
                                        notify('success', 'Demoted to member')
                                        loadChannelMembers()
                                      } catch (err) {
                                        notify('error', err.response?.data?.error || 'Failed')
                                      }
                                    }}>Remove Admin</button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Messages Container */}
            <div className="messages-container">
              <div className="messages-list">
                {/* Admin view-only restriction message */}
                {selectedChannel?.admin_view_only && user?.role === 'admin' ? (
                  <div className="empty-messages">
                    <div className="empty-message-icon">🔒</div>
                    <h3>Admin View Only</h3>
                    <p>As an administrator, you can see this chatroom in the list, but you cannot view messages or conversations to protect user privacy. Only the chatroom creator can access the messages.</p>
                  </div>
                ) : messagesError && messagesError.response?.status === 403 ? (
                  <div className="empty-messages">
                    <div className="empty-message-icon">🔒</div>
                    <h3>Access Denied</h3>
                    <p>You do not have permission to view messages in this channel.</p>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, index) => {
                    const isOwn = msg.author_id === user?.id
                    const prevMsg = index > 0 ? messages[index - 1] : null
                    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null

                    // Better grouping logic - messages from same sender within 5 minutes are grouped
                    const isGrouped = prevMsg &&
                      prevMsg.author_id === msg.author_id &&
                      new Date(msg.created_at) - new Date(prevMsg.created_at) < 300000 // 5 minutes

                    const showAvatar = !isOwn && (!prevMsg ||
                      prevMsg.author_id !== msg.author_id ||
                      new Date(msg.created_at) - new Date(prevMsg.created_at) > 300000)

                    const showDate = !prevMsg ||
                      new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                    // Check if this is last message in a group
                    const isLastInGroup = !nextMsg ||
                      nextMsg.author_id !== msg.author_id ||
                      new Date(nextMsg.created_at) - new Date(msg.created_at) > 300000

                    // Ensure unique key - use message ID with index as fallback
                    const messageKey = msg.id ? `msg-${msg.id}` : `msg-temp-${index}-${msg.created_at || Date.now()}`

                    return (
                      <div key={messageKey}>
                        {showDate && (
                          <div className="date-divider">
                            <span>{new Date(msg.created_at).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</span>
                          </div>
                        )}
                        {msg.message_type && ['call_started', 'call_ended', 'call_missed', 'call_answered'].includes(msg.message_type) ? (
                          <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
                            <div className="call-card">
                              <div className="call-card-header">
                                <div className="call-card-icon">
                                  {msg.message_type.includes('video') || (msg.attachments && msg.attachments[0]?.message_type === 'video') ? <FiVideo /> : <FiPhone />}
                                </div>
                                <span>{msg.message_type === 'call_missed' ? 'Missed Call' : 'Room Call'}</span>
                              </div>
                              <div className="call-card-body">
                                <span>{msg.content}</span>
                                {msg.call_duration && <span>Duration: {Math.floor(msg.call_duration / 60)}m {msg.call_duration % 60}s</span>}
                              </div>
                              {msg.message_type !== 'call_ended' && (
                                <button
                                  className="rejoin-call-btn"
                                  onClick={() => handleCall(msg.author_id, msg.message_type.includes('video') ? 'video' : 'audio')}
                                >
                                  <FiZap /> Rejoin Call
                                </button>
                              )}
                            </div>
                          </div>
                        ) : msg.message_type === 'announcement' ? (
                          <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
                            <div className="announcement-card">
                              <div className="card-badge"><FiZap /> Announcement</div>
                              <div className="card-content">{msg.content}</div>
                            </div>
                          </div>
                        ) : msg.message_type === 'assignment' || msg.message_type === 'assignment_card' ? (
                          <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
                            <div className="assignment-card enhanced">
                              <div className="card-badge"><FiFile /> New Assignment</div>
                              {(() => {
                                try {
                                  const data = JSON.parse(msg.content);
                                  if (data.type === 'assignment_details') {
                                    return (
                                      <>
                                        <div className="card-title">{data.title}</div>
                                        <div className="card-meta">
                                          <div className="meta-item"><FiClock size={14} /> Due: {new Date(data.dueDate).toLocaleString()}</div>
                                          <div className="meta-item points">{data.totalPoints} pts</div>
                                        </div>
                                        <div className="card-desc-short">{data.description}</div>
                                        <button className="card-action-btn primary" onClick={() => notify('success', 'Assignment access confirmed.')}>Open Assignment</button>
                                      </>
                                    );
                                  }
                                } catch (e) {
                                  return (
                                    <>
                                      <div className="card-title">{msg.content}</div>
                                      <button className="card-action-btn" onClick={() => notify('info', 'Opening assignment details...')}>View Assignment</button>
                                    </>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`message-wrapper ${isOwn ? 'own' : 'other'} ${msg.isNew ? 'new-message' : ''} ${isGrouped ? 'grouped' : ''} ${isLastInGroup ? 'last-in-group' : ''} ${!isGrouped ? 'not-grouped' : ''}`}
                          >
                            {/* Hover Actions Bar - Phase 1 */}
                            <div className="message-hover-actions">
                              <button className="hover-action-btn" onClick={() => handleReplyToMessage(msg)} title="Reply"><FiCornerUpLeft size={16} /></button>
                              <button className="hover-action-btn" onClick={() => handleReactToMessage(msg.id, '❤️')} title="React"><FiHeart size={16} /></button>
                              <button className="hover-action-btn" onClick={() => notify('info', 'Pin feature coming soon!')} title="Pin"><FiBookmark size={16} /></button>
                              <button className="hover-action-btn" onClick={() => handleCopyMessage(msg)} title="Copy"><FiCopy size={16} /></button>
                            </div>

                            {!isOwn && showAvatar && (
                              <div
                                className="message-avatar"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // open avatar menu near click
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setAvatarMenu({ open: true, x: rect.right + window.scrollX - 10, y: rect.top + window.scrollY, user: msg.author })
                                }}
                                style={{ cursor: 'pointer' }}
                                title="View profile"
                              >
                                {msg.author?.first_name?.[0]?.toUpperCase() ||
                                  msg.author?.username?.[0]?.toUpperCase() ||
                                  'U'}
                                {/* Call buttons on avatar */}
                                <div className="avatar-call-buttons">
                                  <button
                                    className="call-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCall(msg.author_id, 'audio')
                                    }}
                                    title="Voice call"
                                  >
                                    <FiPhone />
                                  </button>
                                  <button
                                    className="call-btn video-call"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCall(msg.author_id, 'video')
                                    }}
                                    title="Video call"
                                  >
                                    <FiVideo />
                                  </button>
                                </div>
                              </div>
                            )}
                            {!isOwn && !showAvatar && <div className="message-avatar-spacer" />}
                            <div className="message-content-wrapper">
                              {/* Show sender name only if not grouped */}
                              {!isOwn && !isGrouped && (
                                <div className="message-header">
                                  <span className="message-author-name">
                                    {msg.author?.first_name || msg.author?.username || 'Unknown User'}
                                    {msg.author?.role && (
                                      <span className="message-author-role">{msg.author.role}</span>
                                    )}
                                  </span>
                                  <span className="message-time">{formatMessageTime(msg.created_at)}</span>
                                </div>
                              )}
                              {/* Reply Preview */}
                              {msg.reply_to && (
                                <div className="reply-preview">
                                  <div className="reply-indicator-line"></div>
                                  <div className="reply-content">
                                    <div className="reply-author">{msg.reply_to?.author?.first_name || msg.reply_to?.author?.username || 'Unknown'}</div>
                                    <div className="reply-text">{msg.reply_to?.content?.substring(0, 50) || '[File]'}</div>
                                  </div>
                                </div>
                              )}
                              {/* UNIQUE FEATURE: Pinned Message Indicator */}
                              {msg.is_pinned && (
                                <div className="pinned-message-indicator">
                                  <FiBookmark /> Pinned Message
                                </div>
                              )}
                              <div className={`message-bubble-premier ${isOwn ? 'own' : 'other'} role-${msg.author?.role?.toLowerCase() || 'student'}`}>
                                {/* Message menu toggle button */}
                                <button
                                  className="message-menu-toggle"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Always close others
                                    if (showMessageMenu === msg.id) {
                                      setShowMessageMenu(null)
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      // User requested: "should drop down not drop up" -> Always open down
                                      setMessageMenuPosition({
                                        x: rect.right,
                                        y: rect.bottom, // Always positioned at bottom of button
                                        direction: 'down'
                                      })
                                      setShowMessageMenu(msg.id)
                                    }
                                  }}
                                  title="Message options"
                                >
                                  <FiMoreVertical />
                                </button>
                                {msg.message_type === 'voice' && msg.attachments?.length > 0 && (
                                  <VoicePlayer
                                    url={filesAPI.getFileUrl(msg.attachments[0].id)}
                                  />
                                )}

                                {msg.message_type === 'video' && msg.attachments?.length > 0 && (
                                  <div className="video-message-player">
                                    <div className="media-player-wrapper">
                                      <video
                                        controls
                                        src={filesAPI.getFileUrl(msg.attachments[0].id)}
                                        className="video-player"
                                        preload="metadata"
                                      >
                                        Your browser does not support video playback.
                                      </video>
                                      <button
                                        className="media-download-btn"
                                        onClick={() => filesAPI.downloadFile(
                                          msg.attachments[0].id,
                                          msg.attachments[0].original_filename
                                        )}
                                        title="Download video"
                                      >
                                        <FiDownload />
                                      </button>
                                    </div>
                                    <div className="media-info">
                                      <span className="media-filename">{msg.attachments[0].original_filename}</span>
                                      <span className="media-size">{formatFileSize(msg.attachments[0].file_size)}</span>
                                    </div>
                                  </div>
                                )}

                                {msg.attachments && msg.attachments.length > 0 &&
                                  msg.message_type !== 'voice' &&
                                  msg.message_type !== 'video' && (
                                    <div className="message-attachments">
                                      {msg.attachments.map((file) => {
                                        const isImage = file.mime_type?.startsWith('image/')
                                        return (
                                          <div key={file.id} className="attachment-item">
                                            {isImage && (
                                              <div className="attachment-preview">
                                                <img
                                                  src={filesAPI.getFileUrl(file.id)}
                                                  alt={file.original_filename}
                                                  className="attachment-image"
                                                  onClick={() => window.open(filesAPI.getFileUrl(file.id), '_blank')}
                                                />
                                              </div>
                                            )}
                                            <div className="attachment-content">
                                              <div className="attachment-icon">
                                                {getFileIcon(file)}
                                              </div>
                                              <div className="attachment-details">
                                                <div className="attachment-name" title={file.original_filename}>
                                                  {file.original_filename}
                                                </div>
                                                <div className="attachment-size">{formatFileSize(file.file_size)}</div>
                                              </div>
                                            </div>
                                            <button
                                              className="attachment-download-btn"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                filesAPI.downloadFile(file.id, file.original_filename)
                                              }}
                                              title="Download file"
                                            >
                                              <FiDownload />
                                            </button>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                {msg.content && msg.message_type !== 'voice' && msg.message_type !== 'video' && (
                                  <div className="message-text">{renderMessageContent(msg)}</div>
                                )}

                                {/* Message reactions */}
                                {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).length > 0 && (
                                  <div className="message-reactions">
                                    {Object.entries(messageReactions[msg.id]).map(([emoji, users]) => (
                                      <span key={emoji} className="reaction-badge" onClick={() => handleReactToMessage(msg.id, emoji)}>
                                        {emoji} {users.length}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Premium Footer (Telegram style) */}
                                <div className="message-footer-premium flex items-center justify-end gap-1.5 mt-1 opacity-60">
                                  <span className="message-time-mini tabular-nums text-[9px] font-bold tracking-tighter">
                                    {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                  {isOwn && (
                                    <span className={`read-receipt-enhanced ${msg.read_by && msg.read_by.length > 0 ? 'read' : 'sent'}`}>
                                      {msg.read_by && msg.read_by.length > 0 ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="receipt-svg read"><polyline points="20 6 9 17 4 12"></polyline><polyline points="15 6 9 12 4 7" transform="translate(5, 0)"></polyline></svg>
                                      ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="receipt-svg sent"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                      )}
                                    </span>
                                  )}
                                  {!isOwn && msg.view_count !== undefined && msg.view_count > 0 && (
                                    <span className="view-count-mini flex items-center gap-0.5 text-[9px] font-black tracking-tighter opacity-80">
                                      <FiEye size={10} /> {msg.view_count}
                                    </span>
                                  )}
                                  {msg.is_edited && (
                                    <span className="edited-indicator-mini text-[9px] italic opacity-40 uppercase">(ed)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="empty-messages">
                    <div className="empty-message-icon">💬</div>
                    <h3>No messages yet</h3>
                    <p>Start the conversation by sending a message</p>
                  </div>
                )}

                {/* Typing Indicator */}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="typing-indicator-wrapper">
                    <div className="typing-bubble">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="typing-text">
                        {Object.values(typingUsers)[0]}
                        {Object.keys(typingUsers).length > 1 && ` and ${Object.keys(typingUsers).length - 1} other${Object.keys(typingUsers).length > 2 ? 's' : ''}`}
                        {Object.keys(typingUsers).length === 1 ? ' is' : ' are'} typing
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="messages-end" />
              </div>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="files-preview">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-preview-item">
                    {file.type?.startsWith('image/') && (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="preview-image"
                      />
                    )}
                    {!file.type?.startsWith('image/') && (
                      <div className="preview-icon">
                        {getFileIcon(file)}
                      </div>
                    )}
                    <div className="preview-info">
                      <div className="preview-name">{file.name}</div>
                      <div className="preview-size">{formatFileSize(file.size)}</div>
                    </div>
                    <button
                      className="remove-file-btn"
                      onClick={() => handleRemoveFile(index)}
                      title="Remove file"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Reply/Edit Preview */}
            {(replyToMessage || editingMessage) && (
              <div className="reply-edit-preview">
                <div className="preview-content">
                  {editingMessage && (
                    <div className="preview-label">
                      <FiEdit2 /> Editing message
                      <button onClick={() => {
                        setEditingMessage(null)
                        setMessage('')
                      }}>
                        <FiX />
                      </button>
                    </div>
                  )}
                  {replyToMessage && !editingMessage && (
                    <div className="preview-label">
                      <FiCornerUpLeft /> Replying to {replyToMessage.author?.first_name || replyToMessage.author?.username}
                      <button onClick={() => setReplyToMessage(null)}>
                        <FiX />
                      </button>
                    </div>
                  )}
                  {(replyToMessage || editingMessage) && (
                    <div className="preview-text">
                      {replyToMessage?.content?.substring(0, 100) || editingMessage?.content?.substring(0, 100)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message Input */}
            {/* Message Input */}
            <div className="message-input-area">
              <form className="message-input-form" onSubmit={handleSend}>
                <div className="input-actions" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`action-button ${showActionMenu ? 'active' : ''}`}
                    onClick={() => setShowActionMenu(!showActionMenu)}
                    title="More actions"
                  >
                    <FiPlus />
                  </button>

                  {/* Action Menu (Popup) - Phase 2 Professional Upgrade */}
                  {showActionMenu && (
                    <div className="action-menu-popup">
                      <div className="action-menu-category">
                        <span>Communication & Media</span>
                      </div>
                      <button
                        type="button"
                        className="menu-item-enhanced"
                        onClick={() => {
                          fileInputRef.current?.click()
                          setShowActionMenu(false)
                        }}
                      >
                        <div className="menu-item-icon media"><FiPaperclip size={18} /></div>
                        <div className="menu-item-content">
                          <span className="menu-item-title">Attach File</span>
                          <span className="menu-item-desc">Photos, videos, or documents</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="menu-item-enhanced"
                        onClick={() => {
                          startVoiceRecording()
                          setShowActionMenu(false)
                        }}
                      >
                        <div className="menu-item-icon voice"><FiMic size={18} /></div>
                        <div className="menu-item-content">
                          <span className="menu-item-title">Voice Message</span>
                          <span className="menu-item-desc">Tap to start recording professional audio</span>
                        </div>
                      </button>

                      {/* Academic Tools (Lecturer Only) */}
                      {(user?.role === 'lecturer' || user?.role === 'admin' || user?.role === 'super_admin' || currentUserMemberRole === 'admin' || currentUserMemberRole === 'co-admin' || user?.role === 'teacher') && (
                        <>
                          <div className="action-menu-category">
                            <span>Academic Tools</span>
                          </div>
                          <button
                            type="button"
                            className="menu-item-enhanced"
                            onClick={() => {
                              setShowAssignmentModal(true)
                              setShowActionMenu(false)
                            }}
                          >
                            <div className="menu-item-icon academic"><FiFile size={18} /></div>
                            <div className="menu-item-content">
                              <span className="menu-item-title">New Assignment</span>
                              <span className="menu-item-desc">Create tasks for students</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="menu-item-enhanced"
                            onClick={() => {
                              setMessage('/poll ')
                              messageInputRef.current?.focus()
                              setShowActionMenu(false)
                            }}
                          >
                            <div className="menu-item-icon poll"><FiTrendingUp size={18} /></div>
                            <div className="menu-item-content">
                              <span className="menu-item-title">Quick Poll</span>
                              <span className="menu-item-desc">Get instant feedback</span>
                            </div>
                          </button>
                        </>
                      )}

                      <div className="action-menu-category">
                        <span>Planning</span>
                      </div>
                      <button
                        type="button"
                        className="menu-item-enhanced"
                        onClick={() => {
                          setShowScheduleModal(true)
                          setShowActionMenu(false)
                        }}
                      >
                        <div className="menu-item-icon schedule"><FiClock size={18} /></div>
                        <div className="menu-item-content">
                          <span className="menu-item-title">Schedule Message</span>
                          <span className="menu-item-desc">Send at a specific time</span>
                        </div>
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />

                </div>
                <div className="input-wrapper">
                  {/* Phase 2: Slash Suggestions */}
                  {showSlashSuggestions && (
                    <div className="slash-suggestions">
                      {[
                        { cmd: 'assignment', desc: 'Create a structured assignment', icon: <FiFile />, role: 'lecturer' },
                        { cmd: 'announce', desc: 'Post a highlighted announcement', icon: <FiZap />, role: 'lecturer' },
                        { cmd: 'poll', desc: 'Create an interactive poll', icon: <FiTrendingUp />, role: 'lecturer' },
                        { cmd: 'meet', desc: 'Start an instant video meeting', icon: <FiVideo /> },
                        { cmd: 'file', desc: 'Upload and share documents', icon: <FiPaperclip /> },
                        { cmd: 'clock', desc: 'Check current time', icon: <FiClock /> },
                      ]
                        .filter(s => {
                          const isLecturer = user?.role === 'lecturer' || user?.role === 'admin' || user?.role === 'super_admin' || currentUserMemberRole === 'admin' || currentUserMemberRole === 'co-admin' || user?.role === 'teacher';
                          if (s.role === 'lecturer' && !isLecturer) return false;
                          return s.cmd.startsWith(slashQuery.toLowerCase());
                        })
                        .map(item => (
                          <div key={item.cmd} className="suggestion-item" onClick={() => handleSlashCommand(`/${item.cmd}`)}>
                            <div className="suggestion-icon">{item.icon}</div>
                            <div className="suggestion-text">
                              <span className="command">/{item.cmd}</span>
                              <span className="desc">{item.desc}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {isRecording ? (
                    <div className="recording-active-bar">
                      <button
                        type="button"
                        className="recording-trash-btn"
                        onClick={cancelVoiceRecording}
                        title="Discard recording"
                      >
                        <FiTrash2 size={20} />
                      </button>

                      <div className="recording-status">
                        <div className="pulse-dot"></div>
                        <span className="recording-timer-text">{recordingTimer}</span>
                      </div>

                      <div className="recording-waveform-mid">
                        <canvas ref={recordingCanvasRef} width={300} height={40} />
                      </div>

                      <button
                        type="button"
                        className="recording-pause-btn"
                        onClick={isRecordingPaused ? resumeVoiceRecording : pauseVoiceRecording}
                        title={isRecordingPaused ? "Resume" : "Pause"}
                      >
                        {isRecordingPaused ? <FiPlay size={20} fill="currentColor" /> : <FiPause size={20} fill="currentColor" />}
                      </button>

                      <button
                        type="button"
                        className="recording-send-btn"
                        onClick={stopVoiceRecording}
                        title="Send Voice Message"
                      >
                        <FiSend size={20} />
                      </button>
                    </div>
                  ) : (
                    <textarea
                      ref={messageInputRef}
                      value={message}
                      onChange={(e) => {
                        e.stopPropagation()
                        handleTyping(e.target.value)
                      }}
                      onInput={(e) => autoResizeTextarea(e.target)}
                      placeholder={
                        uploadingFiles
                          ? 'Uploading...'
                          : selectedChannel?.admin_view_only && user?.role !== 'admin' && user?.role !== 'super_admin'
                            ? 'Admin view only - cannot send messages'
                            : selectedChannel
                              ? 'Type a message or use / for commands...'
                              : 'Select a channel'
                      }
                      className="message-input textarea-input"
                      disabled={uploadingFiles || !selectedChannel || (selectedChannel?.admin_view_only && user?.role !== 'admin' && user?.role !== 'super_admin')}
                      autoFocus={!!selectedChannel}
                      onKeyDown={(e) => {
                        if (isRecording && e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          stopVoiceRecording()
                          return
                        }
                        if (e.key === 'Enter' && !e.shiftKey && !showSlashSuggestions && !showMentionSuggestions) {
                          e.preventDefault()
                          handleSend(e)
                        }
                        if (e.key === 'Escape') {
                          setShowSlashSuggestions(false)
                          setShowMentionSuggestions(false)
                        }
                      }}
                    />
                  )}
                  <div className="input-utilities">
                    <button
                      type="button"
                      className={`utility-btn ${showEmojiPicker ? 'active' : ''}`}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title="Emojis"
                    >
                      😊
                    </button>
                  </div>

                  {showEmojiPicker && (
                    <div className="simple-emoji-picker">
                      {['❤️', '👍', '😄', '😢', '😮', '🔥', '👏', '🎉', '🙌', '🤔', '👀', '💯'].map(e => (
                        <span key={e} onClick={() => {
                          setMessage(prev => prev + e)
                          setShowEmojiPicker(false)
                        }}>{e}</span>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="send-button"
                    disabled={uploadingFiles || (!message.trim() && selectedFiles.length === 0) || (selectedChannel?.admin_view_only && user?.role !== 'admin' && user?.role !== 'super_admin')}
                    title="Send message"
                  >
                    {uploadingFiles ? (
                      <div className="loading-spinner-small"></div>
                    ) : (
                      <FiSend />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-empty-state">
            <div className="empty-state-content">
              <div className="empty-icon-large">💬</div>
              <h2>Welcome to Chatrooms</h2>
              <p>Select a chatroom from the sidebar or create a new one to start chatting</p>
              <button
                className="create-chatroom-button"
                onClick={() => setShowCreateModal(true)}
              >
                <FiPlus /> Create Your First Chatroom
              </button>
            </div>
          </div>
        )
        }
      </div >

      {/* Phase 1: Context Panel (3rd Column) */}
      {
        selectedChannel && (
          <div className={`chat-context ${!showContextPanel ? 'collapsed' : ''}`}>
            <div className="context-header">
              <h3>Channel Info</h3>
              <div className="context-header-actions">
                <button
                  className="more-settings-btn"
                  onClick={() => {
                    setChannelSettingsChannel(selectedChannel)
                    setShowChannelSettings(true)
                  }}
                  title="Full Settings"
                >
                  <FiSettings />
                </button>
                <button className="close-context-btn" onClick={() => setShowContextPanel(false)}>
                  <FiX />
                </button>
              </div>
            </div>
            <div className="context-body">
              <div className="context-section">
                <h4>About</h4>
                <p>{selectedChannel.description || 'No description provided'}</p>
              </div>
              <div className="context-section">
                <h4>Details</h4>
                <div className="info-list">
                  <div className={`info-item ${selectedChannel.is_encrypted ? 'encrypted' : ''}`}>
                    <FiLock size={18} />
                    <span>{selectedChannel.is_encrypted ? 'End-to-end Encrypted' : 'Standard Connection'}</span>
                  </div>
                  <div className="info-item">
                    <FiUsers size={18} />
                    <span>{channelMembers.length} {channelMembers.length === 1 ? 'member' : 'members'}</span>
                  </div>
                  <div className="info-item">
                    <FiClock size={18} />
                    <span>Created {new Date(selectedChannel.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="context-section">
                <h4>Recent Members</h4>
                <div className="context-members-list">
                  {channelMembers.slice(0, 5).map(m => (
                    <div key={m.user_id} className="context-member-item">
                      <div className="member-avatar-small">
                        {m.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span>{m.username}</span>
                    </div>
                  ))}
                  {channelMembers.length > 5 && (
                    <button className="view-all-members-btn" onClick={() => setShowMembersModal(true)}>
                      + {channelMembers.length - 5} more
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {showMessageMenu && createPortal(
        <>
          <div
            className="message-menu-backdrop"
            onClick={() => setShowMessageMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setShowMessageMenu(null); }}
          />
          <div
            className="message-menu"
            style={{
              position: 'fixed',
              top: messageMenuPosition.direction === 'down' ? messageMenuPosition.y : 'auto',
              bottom: messageMenuPosition.direction === 'up' ? (window.innerHeight - messageMenuPosition.y) : 'auto',
              left: Math.max(10, Math.min(messageMenuPosition.x - 180, window.innerWidth - 200)),
              zIndex: 10000,
              margin: messageMenuPosition.direction === 'down' ? '5px 0 0 0' : '0 0 5px 0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const messages = queryClient.getQueryData(['messages', selectedChannel?.id]) || []
              const msg = messages.find(m => m.id === showMessageMenu)
              if (!msg) return null
              const isOwn = msg.author_id === user?.id

              return (
                <>
                  <button className="menu-item" onClick={() => { handleReactToMessage(msg.id, '❤️'); setShowMessageMenu(null); }}>
                    <FiHeart /> React
                  </button>
                  <button className="menu-item" onClick={() => { handleReplyToMessage(msg); setShowMessageMenu(null); }}>
                    <FiCornerUpLeft /> Reply
                  </button>
                  <button className="menu-item" onClick={() => { handleForwardMessage(msg); setShowMessageMenu(null); }}>
                    <FiShare2 /> Forward
                  </button>
                  <button className="menu-item" onClick={() => { handleCopyMessage(msg); setShowMessageMenu(null); }}>
                    <FiCopy /> Copy
                  </button>
                  {!isOwn && (
                    <button className="menu-item" onClick={() => { handleReplyPrivately(msg); setShowMessageMenu(null); }}>
                      <FiMessageCircle /> Reply Privately
                    </button>
                  )}
                  {(isOwn || user?.role === 'admin' || user?.role === 'super_admin') && (
                    <>
                      <div className="menu-divider" />
                      {isOwn && (
                        <button className="menu-item" onClick={() => { handleEditMessage(msg); setShowMessageMenu(null); }}>
                          <FiEdit2 /> Edit
                        </button>
                      )}
                      <button className="menu-item delete" onClick={() => { handleDeleteMessage(msg.id); setShowMessageMenu(null); }}>
                        <FiTrash2 /> Delete
                      </button>
                    </>
                  )}
                </>
              )
            })()}
          </div>
        </>,
        document.body
      )}

      <CreateChatroomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateChatroom}
      />

      <ScheduleMessageModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        initialContent={message}
        selectedFiles={selectedFiles}
        channelId={selectedChannel?.id}
        onScheduled={(res) => {
          // Optionally clear message / attachments after scheduling
          setMessage('')
          setSelectedFiles([])
        }}
      />

      <AssignmentBuilderModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onCreated={(payload) => {
          if (socket && socket.connected) {
            socket.emit('send_message', payload)
          } else {
            notify('error', 'Connection lost. Message queued.')
          }
        }}
        channelId={selectedChannel?.id}
      />

      <ScheduledMessagesModal
        isOpen={showScheduledList}
        onClose={() => setShowScheduledList(false)}
        channelId={selectedChannel?.id}
      />

      {/* Channel Settings Panel */}
      {
        showChannelSettings && channelSettingsChannel && (
          <ChannelSettings
            channel={channelSettingsChannel}
            onClose={() => {
              setShowChannelSettings(false)
              setChannelSettingsChannel(null)
            }}
          />
        )
      }

      {/* Members Management Modal */}
      {
        showMembersModal && selectedChannel && (
          <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Manage Members - {selectedChannel.name}</h2>
                <button className="modal-close" onClick={() => setShowMembersModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <div className="members-list">
                  {channelMembers.length === 0 ? (
                    <div className="empty-state">
                      <FiUsers size={48} />
                      <p>No members found</p>
                    </div>
                  ) : (
                    channelMembers.map((member) => {
                      const isCreator = selectedChannel.created_by === member.id
                      const canManage = selectedChannel.created_by === user?.id ||
                        (currentUserMemberRole === 'admin' || currentUserMemberRole === 'co-admin')

                      return (
                        <div key={member.id} className="member-item">
                          <div className="member-info">
                            <div
                              className="member-avatar"
                              onClick={() => navigate('/profile')}
                              style={{ cursor: 'pointer' }}
                              title="View profile"
                            >
                              {member.first_name?.[0]?.toUpperCase() || member.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="member-details">
                              <strong>{member.first_name} {member.last_name}</strong>
                              <span className="member-email">{member.email}</span>
                            </div>
                          </div>
                          <div className="member-role-badge">
                            {isCreator ? (
                              <span className="role-admin">Creator</span>
                            ) : member.member_role === 'admin' ? (
                              <span className="role-admin">Admin</span>
                            ) : member.member_role === 'co-admin' ? (
                              <span className="role-co-admin">Co-Admin</span>
                            ) : (
                              <span className="role-member">Member</span>
                            )}
                          </div>
                          {canManage && !isCreator && (
                            <select
                              className="role-select"
                              value={member.member_role || 'member'}
                              onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                            >
                              <option value="member">Member</option>
                              <option value="co-admin">Co-Admin</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </div>
                      )
                    })
                  )}
                  {/* Avatar context menu */}
                  {avatarMenu.open && (
                    <div
                      ref={avatarMenuRef}
                      className="avatar-menu"
                      style={{ left: avatarMenu.x, top: avatarMenu.y }}
                      onMouseLeave={() => setAvatarMenu({ open: false, x: 0, y: 0, user: null })}
                    >
                      <button className="avatar-menu-item" onClick={() => {
                        setAvatarMenu({ open: false, x: 0, y: 0, user: null })
                        navigate(`/profile/${avatarMenu.user?.id || avatarMenu.user?.user_id}`)
                      }}>View Profile</button>
                      <button className="avatar-menu-item" onClick={() => {
                        setAvatarMenu({ open: false, x: 0, y: 0, user: null })
                        const url = avatarMenu.user?.avatar_url
                        if (url) window.open(url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`, '_blank')
                      }}>View Photo</button>
                      <button className="avatar-menu-item" onClick={() => {
                        setAvatarMenu({ open: false, x: 0, y: 0, user: null })
                        // open direct message or create
                        if (avatarMenu.user) createDirectMessage(avatarMenu.user.id || avatarMenu.user.user_id)
                      }}>Message</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}
