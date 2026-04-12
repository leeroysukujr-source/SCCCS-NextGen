import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { directMessagesAPI } from '../api/directMessages'
import { usersAPI } from '../api/users'
import { roomsAPI } from '../api/rooms'
import { filesAPI } from '../api/files'
import { useAuthStore } from '../store/authStore'
import { getSocketUrl } from '../utils/api'
import {
  FiSend, FiSearch, FiUser, FiMessageCircle, FiX, FiArrowRight,
  FiPaperclip, FiImage, FiFile, FiTrash2, FiEdit2, FiMoreVertical,
  FiHeart, FiCopy, FiShare2, FiCornerUpLeft, FiCornerDownRight,
  FiStar, FiBookmark, FiClock, FiPhone, FiVideo, FiMic, FiPlus, FiUserPlus
} from 'react-icons/fi'
import { useSocket } from '../contexts/SocketProvider'
import './DirectMessagesPremium.css'
import DirectMessageBubble from '../components/DirectMessageBubble'
import ScheduleMessageModal from '../components/ScheduleMessageModal'
import { useConfirm, useNotify } from '../components/NotificationProvider'

export default function DirectMessages() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const notify = useNotify()

  // Ensure unread counts are updated when switching conversations (clears badge)
  useEffect(() => {
    if (userId) {
      setTimeout(() => {
        queryClient.invalidateQueries(['directMessages', 'conversations'])
      }, 500)
    }
  }, [userId, queryClient])

  const [selectedUser, setSelectedUser] = useState(null)
  const [message, setMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const { socket: sharedSocket, status: sharedSocketStatus } = useSocket()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [typingUsers, setTypingUsers] = useState({})
  const [showMessageMenu, setShowMessageMenu] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [editingMessage, setEditingMessage] = useState(null)
  const [replyToMessage, setReplyToMessage] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTimer, setRecordingTimer] = useState('00:00')
  const [messageReactions, setMessageReactions] = useState({})
  const [longPressTimer, setLongPressTimer] = useState(null)
  const [longPressMessage, setLongPressMessage] = useState(null)
  const [showReactionPicker, setShowReactionPicker] = useState(null)
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 })
  const [incomingCall, setIncomingCall] = useState(null)
  const [ongoingCall, setOngoingCall] = useState(null)
  const [isCalling, setIsCalling] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const messageInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingIntervalRef = useRef(null)
  const menuRef = useRef(null)
  const reactionPickerRef = useRef(null)
  const recordingCanvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const animationFrameRef = useRef(null)
  const canceledRecordingRef = useRef(false)
  const callTimeoutRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Fetch conversations list
  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useQuery({
    queryKey: ['directMessages', 'conversations'],
    queryFn: () => directMessagesAPI.getConversations(),
    enabled: !!token,
    refetchInterval: 5000
  })

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading, error: messagesError, refetch: refetchMessages } = useQuery({
    queryKey: ['directMessages', 'conversation', selectedUser?.user_id],
    queryFn: () => selectedUser ? directMessagesAPI.getConversation(selectedUser.user_id) : Promise.resolve([]),
    enabled: !!selectedUser && !!token,
    refetchInterval: 5000
  })

  // Fetch search results
  const { data: allSearchResults = [] } = useQuery({
    queryKey: ['users', 'search'],
    queryFn: () => Promise.resolve([]),
    enabled: false
  })

  // -------------------------------------------------------------------
  // DERIVED DATA (Calculated once per render, before effects)
  // -------------------------------------------------------------------
  
  // Deduplicate conversations by user_id (API may sometimes return duplicates).
  // Keep the conversation with the newest last_message or highest unread_count.
  const uniqueByUser = new Map()
  for (const conv of conversations) {
    const key = String(conv.user_id || conv.user?.id || '')
    if (!key) continue
    const existing = uniqueByUser.get(key)
    if (!existing) {
      uniqueByUser.set(key, conv)
      continue
    }

    // Prefer conversation with unread messages
    const existingUnread = existing.unread_count || 0
    const convUnread = conv.unread_count || 0
    if (convUnread > existingUnread) {
      uniqueByUser.set(key, conv)
      continue
    }

    // Otherwise prefer the one with newer last_message
    const existingTime = existing.last_message?.created_at ? new Date(existing.last_message.created_at).getTime() : 0
    const convTime = conv.last_message?.created_at ? new Date(conv.last_message.created_at).getTime() : 0
    if (convTime > existingTime) {
      uniqueByUser.set(key, conv)
    }
  }

  const dedupedConversations = Array.from(uniqueByUser.values())

  // Sort conversations: unread first, then by last message time
  const sortedConversations = [...dedupedConversations].sort((a, b) => {
    // Unread messages first
    if (a.unread_count > 0 && b.unread_count === 0) return -1
    if (a.unread_count === 0 && b.unread_count > 0) return 1

    // Then by last message time (most recent first)
    const timeA = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0
    const timeB = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0
    return timeB - timeA
  })

  const filteredConversations = sortedConversations.filter(conv => {
    if (!conv.user) return false
    const query = searchQuery.toLowerCase()
    return (
      conv.user.username?.toLowerCase().includes(query) ||
      conv.user.first_name?.toLowerCase().includes(query) ||
      conv.user.last_name?.toLowerCase().includes(query)
    )
  })

  // Show search results in sidebar when searching
  const isSearching = searchQuery.length > 0 && searchResults.length > 0

  // -------------------------------------------------------------------
  // EFFECTS (Must come after derived data)
  // -------------------------------------------------------------------

  // Synchronize selectedUser with userId URL parameter
  useEffect(() => {
    if (userId && !selectedUser) {
      // 1. Try finding in current conversations
      const existingConv = sortedConversations.find(c => String(c.user_id) === String(userId))
      if (existingConv) {
        setSelectedUser(existingConv)
      } else {
        // 2. If not found, fetch the user info to start a new conversation
        usersAPI.getUser(userId).then(userData => {
          setSelectedUser({
            user_id: userData.id,
            user: userData,
            last_message: null,
            unread_count: 0
          })
        }).catch(err => {
          console.error('Failed to resolve user for DM:', err)
          notify('error', 'User not found or unavailable')
        })
      }
    } else if (!userId && selectedUser) {
      setSelectedUser(null)
    }
  }, [userId, sortedConversations, selectedUser, notify])

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    if (e.target.nextSibling) {
      e.target.nextSibling.style.display = 'flex';
    }
  };
    if (!sharedSocket) return

    const newSocket = sharedSocket
    setSocket(newSocket)

    newSocket.off('connect').on('connect', () => {
      console.log('[DirectMessages] Socket connected')
    })

    newSocket.off('connected').on('connected', (data) => {
      console.log('[DirectMessages] Authenticated and joined personal room:', data)
    })

    newSocket.off('connect_error').on('connect_error', (error) => {
      console.error('[DirectMessages] Socket connection error:', error)
    })

    newSocket.off('direct_message_received').on('direct_message_received', (messageData) => {
      if (!messageData || !messageData.id) return
      queryClient.invalidateQueries(['directMessages', 'conversations'])
      if (messageData.sender_id === selectedUser?.user_id || messageData.recipient_id === selectedUser?.user_id) {
        queryClient.setQueryData(['directMessages', 'conversation', selectedUser?.user_id], (oldMessages = []) => {
          const exists = oldMessages.some(m => m.id === messageData.id)
          if (exists) return oldMessages
          return [...oldMessages, { ...messageData, isNew: true }].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        })
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
      }
    })

    newSocket.off('user_typing_dm').on('user_typing_dm', (data) => {
      if (data.recipient_id === user?.id && data.user_id === selectedUser?.user_id) {
        setTypingUsers(prev => ({ ...prev, [data.user_id]: data.user_name || 'Someone' }))
        setTimeout(() => { setTypingUsers(prev => { const newState = { ...prev }; delete newState[data.user_id]; return newState }) }, 3000)
      }
    })

    newSocket.off('incoming_call').on('incoming_call', async (data) => {
      try {
        const callerInfo = await usersAPI.getUser(data.caller_id)
        setIncomingCall({ caller_id: data.caller_id, caller: callerInfo, room_id: data.room_id, call_type: data.call_type, timestamp: data.timestamp })
      } catch (error) {
        console.error('Error fetching caller info:', error)
        setIncomingCall({ caller_id: data.caller_id, caller: null, room_id: data.room_id, call_type: data.call_type, timestamp: data.timestamp })
      }
    })

    newSocket.off('call_accepted').on('call_accepted', (data) => {
      setIsCalling(false)
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null }
      if (data.room_id && !window.location.pathname.includes(`/meeting/${data.room_id}`)) {
        navigate(`/meeting/${data.room_id}`)
      }
    })

    return () => {
      try {
        newSocket.off('connect')
        newSocket.off('connected')
        newSocket.off('connect_error')
        newSocket.off('direct_message_received')
        newSocket.off('user_typing_dm')
        newSocket.off('incoming_call')
        newSocket.off('call_accepted')
      } catch (e) { }
    }
  }, [sharedSocket, selectedUser?.user_id, queryClient])

  // Auto scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages.length])

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setIsSidebarOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-close sidebar on mobile when a conversation is selected
  useEffect(() => {
    if (isMobile && selectedUser) {
      setIsSidebarOpen(false)
    }
  }, [selectedUser?.user_id, isMobile])

  // Search for users (lecturers if student, students if lecturer)
  const handleSearchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      // Try local search first
      let results = await usersAPI.searchUsers(query)
      
      // If no local results or few results, try global search if query is long enough
      if (results.length < 3 && query.length >= 3) {
        const globalResults = await usersAPI.searchUsers(query, true)
        // Merge results, removing duplicates
        const existingIds = new Set(results.map(r => r.id))
        results = [...results, ...globalResults.filter(r => !existingIds.has(r.id))]
      }

      const filtered = results.filter(u => u.id !== user?.id)
      setSearchResults(filtered)
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      if (!selectedUser?.user_id) throw new Error('No user selected')
      return directMessagesAPI.sendMessage(selectedUser.user_id, data)
    },
    onSuccess: (newMessage) => {
      setMessage('')
      setSelectedFiles([])
      queryClient.invalidateQueries(['directMessages', 'conversation', selectedUser?.user_id])
      queryClient.invalidateQueries(['directMessages', 'conversations'])

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    },
    onError: (error) => {
      console.error('Error sending message:', error)
      notify('error', error.response?.data?.error || 'Failed to send message')
    }
  })

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() && selectedFiles.length === 0) return
    if (!selectedUser) return

    // If editing, update message instead
    if (editingMessage) {
      try {
        await directMessagesAPI.updateMessage(editingMessage.id, {
          content: message.trim()
        })
        setMessage('')
        setEditingMessage(null)
        setReplyToMessage(null)
        queryClient.invalidateQueries(['directMessages', 'conversation', selectedUser?.user_id])
        return
      } catch (error) {
        console.error('Error updating message:', error)
        notify('error', 'Failed to update message')
        return
      }
    }

    setUploadingFiles(true)
    let uploadedFileIds = []

    try {
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (fileObj) => {
          // If it already has an ID (e.g. voice notes), return it
          if (fileObj.id) return fileObj.id

          // If it has a file object, upload it
          if (fileObj.file) {
            try {
              // Using the same API signature as seen in voice recording: uploadFile(file, userId)
              // Adjust if your API implementation differentiates between FormData and File object
              // But usually uploadFile handles FormData creation if passed a File, or we pass FormData.
              // Given line 383: filesAPI.uploadFile(audioFile, selectedUser.id)
              // We will assume it takes the file object directly.
              const response = await filesAPI.uploadFile(fileObj.file, selectedUser.user_id)
              return response.id
            } catch (err) {
              console.error('File upload failed', err)
              return null
            }
          }
          return null
        })

        uploadedFileIds = (await Promise.all(uploadPromises)).filter(Boolean)
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      notify('error', 'Failed to upload files')
      setUploadingFiles(false)
      return
    }

    let msgType = 'text'
    if (selectedFiles.length > 0) {
      // Check if any file is a voice note
      const hasVoice = selectedFiles.some(f => f.type === 'voice' || f.mime_type?.startsWith('audio/') || f.name?.endsWith('.webm') || f.name?.endsWith('.mp3'))
      if (hasVoice) {
        msgType = 'voice'
      }
    }

    const messageData = {
      content: message.trim() || (uploadedFileIds.length > 0 ? '[File]' : ''),
      message_type: msgType,
      file_ids: uploadedFileIds,
      reply_to: replyToMessage?.id || null
    }

    try {
      await sendMessageMutation.mutateAsync(messageData)
    } catch (error) {
      // Error handled in mutation callback usually, but we catch locally to ensure final block runs
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleTyping = (e) => {
    setMessage(e.target.value)

    if (socket && socket.connected && selectedUser) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Emit typing
      socket.emit('typing_dm', {
        recipient_id: selectedUser.user_id
      })

      // Clear typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        // Typing stopped
      }, 3000)
    }
  }

  // Auto-resize textarea
  const autoResizeTextarea = (el) => {
    if (!el) return
    try {
      el.style.height = 'auto'
      const scroll = el.scrollHeight
      el.style.height = Math.min(scroll, 300) + 'px'
    } catch (e) { }
  }

  useEffect(() => {
    autoResizeTextarea(messageInputRef.current)
  }, [message])

  // Voice recording functions
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

  const startVoiceRecording = async () => {
    try {
      canceledRecordingRef.current = false
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedAudioMimeType()
      let mediaRecorder
      try {
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      } catch (err) {
        mediaRecorder = new MediaRecorder(stream)
      }
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        if (canceledRecordingRef.current) {
          try { stream.getTracks().forEach(t => t.stop()) } catch (e) { }
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
          if (audioContextRef.current) {
            try { audioContextRef.current.close() } catch (e) { }
            audioContextRef.current = null
          }
          clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = null
          setRecordingTimer('00:00')
          canceledRecordingRef.current = false
          return
        }

        try {
          const mime = getSupportedAudioMimeType() || 'audio/webm'
          const ext = getAudioFileExtension(mime)
          const audioBlob = new Blob(audioChunksRef.current, { type: mime })
          if (audioBlob.size === 0) throw new Error('Audio recording failed: empty blob')
          const timestamp = Date.now()
          const audioFile = new File([audioBlob], `voice-note-${timestamp}.${ext}`, { type: mime })
          setUploadingFiles(true)
          const uploadedFile = await filesAPI.uploadFile(audioFile, selectedUser.id)
          if (uploadedFile && uploadedFile.mime_type) console.log(`Voice note uploaded: ${uploadedFile.original_filename} (${uploadedFile.mime_type})`)
          setSelectedFiles([{ id: uploadedFile.id, name: uploadedFile.original_filename, file: uploadedFile, mime_type: uploadedFile.mime_type, type: 'voice' }])
          notify('success', 'Voice note recorded')
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
          clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = null
          setRecordingTimer('00:00')
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      const start = Date.now()
      setRecordingTimer('00:00')
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - start
        setRecordingTimer(formatDuration(elapsed))
      }, 500)

      // Setup audio analyser & waveform
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const audioCtx = new AudioContext()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        sourceNodeRef.current = source
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 2048
        analyserRef.current = analyser
        source.connect(analyser)
        const bufferLength = analyser.frequencyBinCount
        dataArrayRef.current = new Uint8Array(bufferLength)
        const canvas = recordingCanvasRef.current
        const canvasCtx = canvas?.getContext('2d')
        const draw = () => {
          if (!canvasCtx || !analyserRef.current) { animationFrameRef.current = requestAnimationFrame(draw); return }
          const width = canvas.width; const height = canvas.height
          analyserRef.current.getByteTimeDomainData(dataArrayRef.current)
          canvasCtx.fillStyle = 'rgba(255,255,255,0.03)'
          canvasCtx.fillRect(0, 0, width, height)
          canvasCtx.lineWidth = 2; canvasCtx.strokeStyle = '#06b6d4'; canvasCtx.beginPath()
          const sliceWidth = width * 1.0 / dataArrayRef.current.length
          let x = 0
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            const v = dataArrayRef.current[i] / 128.0; const y = v * height / 2
            if (i === 0) canvasCtx.moveTo(x, y); else canvasCtx.lineTo(x, y)
            x += sliceWidth
          }
          canvasCtx.lineTo(width, height / 2); canvasCtx.stroke()
          animationFrameRef.current = requestAnimationFrame(draw)
        }
        animationFrameRef.current = requestAnimationFrame(draw)
      } catch (e) { console.warn('Waveform init failed', e) }
    } catch (error) {
      console.error('Error starting voice recording:', error)
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const cancelVoiceRecording = () => {
    canceledRecordingRef.current = true
    try { if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop() } catch (e) { }
    setIsRecording(false)
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setSelectedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, file: f }))])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Message action handlers
  const handleReplyToMessage = (msg) => {
    setReplyToMessage(msg)
    setShowMessageMenu(null)
    messageInputRef.current?.focus()
  }

  const handleForwardMessage = (msg) => {
    setShowMessageMenu(null)
    // TODO: Show forward modal
    notify('info', 'Forward feature - Select user to forward to')
  }

  const handleEditMessage = (msg) => {
    setEditingMessage(msg)
    setMessage(msg.content)
    setShowMessageMenu(null)
    messageInputRef.current?.focus()
  }

  const handleDeleteMessage = async (messageId) => {
    const ok = await confirm('Are you sure you want to delete this message?')
    if (!ok) return

    try {
      await directMessagesAPI.deleteMessage(messageId)
      queryClient.invalidateQueries(['directMessages', 'conversation', selectedUser?.user_id])
      queryClient.invalidateQueries(['directMessages', 'conversations'])
      setShowMessageMenu(null)
    } catch (error) {
      console.error('Error deleting message:', error)
      notify('error', 'Failed to delete message')
    }
  }

  const handleCopyMessage = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.content)
      setShowMessageMenu(null)
      // Show toast notification
      notify('success', 'Message copied!')
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleReactToMessage = (messageId, emoji) => {
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

    if (socket) {
      socket.emit('react_to_dm', {
        message_id: messageId,
        emoji: emoji,
        user_id: user?.id
      })
    }

    setShowReactionPicker(null)
  }

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Call handlers
  const handleInitiateCall = async (callType) => {
    if (!selectedUser?.user_id || !socket) return

    try {
      setIsCalling(true)

      // Create call room via API using roomsAPI
      const roomData = await roomsAPI.createDirectRoom(selectedUser.user_id, callType)

      // Emit call initiation via socket
      socket.emit('initiate_call', {
        recipient_id: selectedUser.user_id,
        room_id: roomData.id,
        call_type: callType
      })

      // Navigate caller to meeting room immediately
      navigate(`/meeting/${roomData.id}?call_type=${callType}`)
      setOngoingCall({ room_id: roomData.id })

      // Set timeout for call ringing (30 seconds) - only if recipient doesn't join
      callTimeoutRef.current = setTimeout(() => {
        setIsCalling(false)
        if (socket) {
          socket.emit('end_call', {
            recipient_id: selectedUser.user_id,
            room_id: roomData.id
          })
        }
        // Don't show alert if user is already in the meeting
        if (!ongoingCall || ongoingCall.room_id !== roomData.id) {
          notify('info', 'Call timed out. No answer.')
        }
      }, 30000)

    } catch (error) {
      console.error('Error initiating call:', error)
      setIsCalling(false)
      notify('error', 'Failed to initiate call. Please try again.')
    }
  }

  const handleAcceptCall = () => {
    if (!incomingCall || !socket) return

    socket.emit('accept_call', {
      caller_id: incomingCall.caller_id,
      room_id: incomingCall.room_id
    })

    // Navigate to meeting
    navigate(`/meeting/${incomingCall.room_id}?call_type=${incomingCall.call_type}`)
    setIncomingCall(null)
    setOngoingCall({ room_id: incomingCall.room_id })
  }

  const handleRejectCall = () => {
    if (!incomingCall || !socket) return

    socket.emit('reject_call', {
      caller_id: incomingCall.caller_id,
      room_id: incomingCall.room_id
    })

    setIncomingCall(null)
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatCallDuration = (seconds) => {
    if (!seconds || seconds === 0) return '00:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className={`direct-messages ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isMobile ? 'is-mobile' : ''}`}>
      <div className={`dm-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="dm-sidebar-header">
          <h2>Inbox</h2>
          <button
            className="new-dm-btn"
            onClick={() => {
              setShowUserSearch(true)
              setSearchQuery('')
              setTimeout(() => {
                searchInputRef.current?.focus()
              }, 100)
            }}
            title="New Message"
          >
            <FiMessageCircle size={20} />
            <span>New</span>
          </button>
        </div>

        <div className="dm-search-box">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search people or messages..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value
                setSearchQuery(val)
                if (val.trim().length >= 2) {
                  handleSearchUsers(val)
                } else {
                  setSearchResults([])
                }
              }}
            />
            {searchQuery && (
              <button 
                className="clear-search" 
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                }}
              >
                <FiX />
              </button>
            )}
          </div>
        </div>


        <div className="conversations-list">
          {/* SEARCH RESULTS VIEW */}
          {searchQuery.trim().length >= 2 ? (
            <div className="search-mode-container">
              <div className="sidebar-section-label">
                {searchResults.length > 0 ? 'Search Results' : 'No users found'}
              </div>

              <div className="search-results-list">
                {searchResults.length > 0 ? (
                  searchResults.map(result => {
                    const existingConv = conversations.find(c => c.user_id === result.id)
                    return (
                      <div
                        key={result.id}
                        className="conversation-item search-result-item"
                        onClick={() => {
                          const existingConv = sortedConversations.find(c => String(c.user_id) === String(result.id))
                          if (existingConv) {
                            setSelectedUser(existingConv)
                          } else {
                            setSelectedUser({
                              user_id: result.id,
                              user: result,
                              last_message: null,
                              unread_count: 0
                            })
                          }
                          navigate(`/direct-messages/${result.id}`)
                          setSearchQuery('')
                          setSearchResults([])
                        }}
                      >
                        <div className="conversation-avatar">
                          {result.avatar_url ? (
                            <img src={result.avatar_url} alt={result.username} />
                          ) : (
                            <div className="avatar-placeholder-small">
                              {result.first_name?.[0]?.toUpperCase() || result.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="conversation-info">
                          <div className="conversation-name">
                            {result.first_name && result.last_name
                              ? `${result.first_name} ${result.last_name}`
                              : result.username}
                          </div>
                          <div className="conversation-preview">
                            <span className="user-role">{result.role}</span>
                            {existingConv && (
                              <span className="has-conversation">Active Chat</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="no-conversations">
                    <p>No system-wide users match "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* REGULAR CONVERSATIONS LIST */
            <>
              <div className="sidebar-section-label">Recent Messages</div>
              {conversationsLoading ? (
                <div className="no-conversations">
                  <FiMessageCircle />
                  <p>Loading inbox...</p>
                </div>
              ) : conversationsError ? (
                <div className="no-conversations">
                  <FiMessageCircle />
                  <p>Check connection</p>
                  <button onClick={() => refetchConversations()}>Retry</button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="no-conversations-captivating">
                  <div className="aura-pulse-mini"></div>
                  <h3>Quiet Room</h3>
                  <p>Search for a colleague or student to ignite a professional dialogue.</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.user_id}
                    className={`conversation-item ${selectedUser?.user_id === conv.user_id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedUser(conv)
                      if (isMobile) setIsSidebarOpen(false)
                      navigate(`/direct-messages/${conv.user_id}`)
                    }}
                  >
                    <div className="conversation-avatar">
                      <div className="avatar-container-rel">
                        {conv.user?.avatar_url && (
                          <img 
                            src={conv.user.avatar_url} 
                            alt={conv.user.username} 
                            onError={handleImageError}
                          />
                        )}
                        <div className="avatar-placeholder-small" style={{ display: conv.user?.avatar_url ? 'none' : 'flex' }}>
                          {conv.user?.first_name?.[0]?.toUpperCase() || conv.user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="unread-badge">{conv.unread_count}</span>
                      )}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-name">
                        {conv.user?.first_name && conv.user?.last_name
                          ? `${conv.user.first_name} ${conv.user.last_name}`
                          : conv.user?.username || 'Unknown User'}
                      </div>
                      {conv.last_message && (
                        <div className="conversation-preview">
                          <span className={!conv.last_message.is_read && conv.last_message.is_sent ? 'unread' : ''}>
                            {conv.last_message.content?.substring(0, 50) || '[File]'}
                          </span>
                          <span className="conversation-time">
                            {formatTime(conv.last_message.created_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      <div className="dm-main">
        <div className="dm-messages-bg" />
        {selectedUser ? (
          <>
            <div className="dm-header">
              <div className="dm-header-info">
                {isMobile && (
                  <button 
                    className="mobile-back-btn" 
                    onClick={() => {
                      setSelectedUser(null);
                      setIsSidebarOpen(true);
                    }}
                    title="Back to Conversations"
                  >
                    <FiArrowRight style={{ transform: 'rotate(180deg)' }} />
                  </button>
                )}
                <div
                  className="dm-header-avatar clickable-avatar"
                  onClick={() => navigate(`/profile/${selectedUser.user_id}`)}
                  title="View profile"
                >
                  <div className="avatar-container-rel">
                    {selectedUser.user?.avatar_url && (
                      <img 
                        src={selectedUser.user.avatar_url} 
                        alt={selectedUser.user.username} 
                        onError={handleImageError}
                      />
                    )}
                    <div className="avatar-placeholder" style={{ display: selectedUser.user?.avatar_url ? 'none' : 'flex' }}>
                      {selectedUser.user?.first_name?.[0]?.toUpperCase() || selectedUser.user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>
                </div>
                <div>
                  <div
                    className="dm-header-name clickable-name"
                    onClick={() => navigate(`/profile/${selectedUser.user_id}`)}
                  >
                    {selectedUser.user?.first_name && selectedUser.user?.last_name
                      ? `${selectedUser.user.first_name} ${selectedUser.user.last_name}`
                      : selectedUser.user?.username || 'Unknown User'}
                  </div>
                  <div className="dm-header-role">{selectedUser.user?.role}</div>
                </div>
              </div>
              {/* Call buttons in header */}
              <div className="dm-header-actions">
                <button
                  className="header-action-btn"
                  onClick={async () => {
                    if (!selectedUser?.user_id) return
                    await handleInitiateCall('audio')
                  }}
                  title="Voice call"
                  disabled={isCalling || !!incomingCall}
                >
                  <FiPhone />
                </button>
                <button
                  className="header-action-btn"
                  onClick={async () => {
                    if (!selectedUser?.user_id) return
                    await handleInitiateCall('video')
                  }}
                  title="Video call"
                  disabled={isCalling || !!incomingCall}
                >
                  <FiVideo />
                </button>
              </div>
            </div>

            <div className="dm-messages">
              {messagesLoading ? (
                <div className="no-messages">
                  <FiMessageCircle />
                  <p>Loading messages...</p>
                </div>
              ) : messagesError ? (
                <div className="no-messages">
                  <FiMessageCircle />
                  <p>Error loading messages</p>
                  <button onClick={() => refetchMessages()}>
                    Retry
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="no-messages">
                  <img 
                    src="/assets/images/dm-aura.png" 
                    alt="Inbox Aura" 
                    className="empty-state-illustration" 
                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.empty-state-icon-fallback').style.display = 'flex'; }}
                  />
                  <div className="empty-state-icon-fallback" style={{ display: 'none', justifyContent: 'center', marginBottom: '20px', color: 'var(--dm-accent)', opacity: 0.5 }}>
                    <FiMessageCircle size={100} />
                  </div>
                  <h3>Your Inbox is a Blank Canvas</h3>
                  <p>Start a new conversation or send a professional greeting to get things moving.</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    const prevMsg = index > 0 ? messages[index - 1] : null
                    const nextMsg = index < messages.length - 1 ? messages[index + 1] : null

                    return (
                      <DirectMessageBubble
                        key={msg.id}
                        message={msg}
                        listIndex={index}
                        previousMessage={prevMsg}
                        nextMessage={nextMsg}
                        onReply={handleReplyToMessage}
                        onEdit={handleEditMessage}
                        onDelete={(m) => handleDeleteMessage(m.id)}
                        onReact={(m, e) => handleReactToMessage(m.id, e)}
                        onCopy={handleCopyMessage}
                        reactions={messageReactions[msg.id]}
                      />
                    )
                  })}
                </>
              )}

              {Object.keys(typingUsers).length > 0 && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  {Object.values(typingUsers).join(', ')} is typing
                </div>
              )}

              <div ref={messagesEndRef} />



              {/* Reaction Picker - Mobile */}
              {showReactionPicker && (
                <div
                  ref={reactionPickerRef}
                  className="reaction-picker"
                  style={{
                    position: 'fixed',
                    left: `${reactionPickerPosition.x}px`,
                    top: `${reactionPickerPosition.y}px`,
                    zIndex: 1000
                  }}
                >
                  {['❤️', '👍', '😄', '😢', '😮', '🔥'].map(emoji => (
                    <button
                      key={emoji}
                      className="reaction-emoji"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReactToMessage(showReactionPicker, emoji)
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form className="dm-input-form" onSubmit={handleSendMessage}>
              {/* Reply Preview in Input */}
              {replyToMessage && (
                <div className="reply-preview-input">
                  <div className="reply-preview-content">
                    <div className="reply-indicator-line"></div>
                    <div className="reply-info">
                      <div className="reply-author">Replying to {replyToMessage.sender?.first_name || replyToMessage.sender?.username}</div>
                      <div className="reply-text">{replyToMessage.content?.substring(0, 50) || '[File]'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="close-reply-btn"
                    onClick={() => setReplyToMessage(null)}
                  >
                    <FiX />
                  </button>
                </div>
              )}

              {/* Edit Preview */}
              {editingMessage && (
                <div className="edit-preview">
                  <div className="edit-preview-content">
                    <span>Editing message</span>
                    <button
                      type="button"
                      className="close-edit-btn"
                      onClick={() => {
                        setEditingMessage(null)
                        setMessage('')
                      }}
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              )}
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="selected-files-preview" style={{
                  display: 'flex', gap: '8px', padding: '0 0 12px 12px',
                  overflowX: 'auto', marginBottom: '4px'
                }}>
                  {selectedFiles.map((f, idx) => (
                    <div key={idx} className="file-preview-card" style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'var(--dm-bg-secondary)', padding: '8px 12px',
                      borderRadius: '12px', border: '1px solid var(--dm-border)',
                      minWidth: '200px', maxWidth: '200px', position: 'relative'
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: '#e0e7ff', color: '#6366f1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', flexShrink: 0
                      }}>
                        {f.name?.match(/\.(xlsx|xls|csv)$/i) ? <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>X</span> :
                          f.name?.match(/\.(pdf)$/i) ? <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>PDF</span> :
                            f.name?.match(/\.(doc|docx)$/i) ? <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>W</span> :
                              <FiFile size={16} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.85rem', fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          color: 'var(--dm-text-primary)'
                        }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, color: 'var(--dm-text-secondary)' }}>
                          {(f.file?.size || f.size) ? Math.round((f.file?.size || f.size) / 1024) + ' KB' : 'File'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                        style={{
                          position: 'absolute', top: '-6px', right: '-6px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: 'var(--dm-text-secondary)', color: 'white',
                          border: '2px solid var(--dm-bg-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', fontSize: '10px'
                        }}
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ position: 'relative' }}>

                {/* Action Menu (Popup) */}
                {showActionMenu && (
                  <div className="action-menu-popup" style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '0',
                    marginBottom: '10px',
                    zIndex: 100,
                    background: 'var(--dm-bg-primary)',
                    border: '1px solid var(--dm-border)',
                    borderRadius: '16px',
                    padding: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minWidth: '280px'
                  }}>
                    <div className="menu-section-label">Communication & Media</div>

                    <button
                      type="button"
                      className="menu-item-enhanced"
                      onClick={() => {
                        fileInputRef.current?.click()
                        setShowActionMenu(false)
                      }}
                    >
                      <div className="menu-item-icon file"><FiPaperclip size={20} /></div>
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
                      <div className="menu-item-icon voice"><FiMic size={20} /></div>
                      <div className="menu-item-content">
                        <span className="menu-item-title">Voice Message</span>
                        <span className="menu-item-desc">Tap to start recording professional audio</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="menu-item-enhanced"
                      onClick={() => {
                        setShowScheduleModal(true)
                        setShowActionMenu(false)
                      }}
                    >
                      <div className="menu-item-icon schedule"><FiClock size={20} /></div>
                      <div className="menu-item-content">
                        <span className="menu-item-title">Schedule Message</span>
                        <span className="menu-item-desc">Send at a specific time</span>
                      </div>
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  multiple
                />

                {isRecording ? (
                  <div className="recording-active-bar" style={{
                    display: 'flex', alignItems: 'center', gap: '12px', flex: 1,
                    background: 'var(--dm-bg-secondary)', padding: '4px 12px', borderRadius: '20px'
                  }}>
                    <button
                      type="button"
                      className="recording-trash-btn"
                      onClick={cancelVoiceRecording}
                      title="Discard recording"
                      style={{ color: 'var(--dm-danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <FiTrash2 size={20} />
                    </button>

                    <div className="recording-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="pulse-dot" style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></div>
                      <span className="recording-timer-text" style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{recordingTimer}</span>
                    </div>

                    <div className="recording-waveform-mid" style={{ flex: 1, height: '40px', display: 'flex', alignItems: 'center' }}>
                      <canvas ref={recordingCanvasRef} width={300} height={40} style={{ width: '100%', height: '100%' }} />
                    </div>

                    <button
                      type="button"
                      className="recording-send-btn"
                      onClick={stopVoiceRecording}
                      title="Send Voice Message"
                      style={{ color: 'white', background: 'var(--dm-accent)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <FiSend size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="dm-input-container" style={{ position: 'relative', flex: 1, display: 'flex', gap: '8px', alignItems: 'flex-end', background: 'var(--dm-bg-secondary)', padding: '8px 12px', borderRadius: '20px' }}>
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => setShowActionMenu(!showActionMenu)}
                      title="More actions"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--dm-text-secondary)' }}
                    >
                      {showActionMenu ? <FiX size={20} /> : <FiPlus size={20} />}
                    </button>

                    <textarea
                      ref={messageInputRef}
                      className="dm-input textarea-input"
                      placeholder="Type a message..."
                      value={message}
                      onChange={handleTyping}
                      onInput={(e) => autoResizeTextarea(e.target)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage(e)
                        }
                      }}
                      aria-label="Direct message input"
                      role="textbox"
                      aria-multiline="true"
                      style={{ flex: 1, background: 'transparent', border: 'none', resize: 'none', maxHeight: '150px', outline: 'none', padding: '8px 0', fontSize: '0.95rem' }}
                    />
                    <button
                      type="submit"
                      className="send-btn"
                      disabled={!message.trim() && selectedFiles.length === 0}
                      style={{ background: (!message.trim() && selectedFiles.length === 0) ? 'var(--dm-bg-tertiary)' : 'var(--dm-accent)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <FiSend size={18} />
                    </button>
                  </div>
                )}
              </div>
            </form>
          </>
        ) : (
          <div className="no-conversation-selected">
            <img 
              src="/assets/images/dm-aura.png" 
              alt="Inbox Aura" 
              className="empty-state-illustration" 
            />
            <h3>Inbox Center</h3>
            <p>Select a colleague or student from your sidebar to start a secure, real-time professional conversation.</p>
          </div>
        )}
      </div>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="incoming-call-modal">
          <div className="call-modal-content">
            <div className="call-modal-avatar">
              {incomingCall.caller?.avatar_url ? (
                <img src={incomingCall.caller.avatar_url} alt={incomingCall.caller.username} />
              ) : (
                <div className="avatar-placeholder-large">
                  {incomingCall.caller?.first_name?.[0]?.toUpperCase() || incomingCall.caller?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <h2 className="call-modal-title">
              {incomingCall.caller?.first_name && incomingCall.caller?.last_name
                ? `${incomingCall.caller.first_name} ${incomingCall.caller.last_name}`
                : incomingCall.caller?.username || 'Unknown User'}
            </h2>
            <p className="call-modal-subtitle">
              Incoming {incomingCall.call_type === 'video' ? 'video' : 'voice'} call
            </p>
            <div className="call-modal-actions">
              <button
                className="call-action-btn accept-call"
                onClick={handleAcceptCall}
              >
                {incomingCall.call_type === 'video' ? <FiVideo /> : <FiPhone />}
              </button>
              <button
                className="call-action-btn reject-call"
                onClick={handleRejectCall}
              >
                <FiX />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calling Indicator */}
      {isCalling && (
        <div className="calling-indicator">
          <div className="calling-content">
            <div className="calling-avatar">
              {selectedUser?.user?.avatar_url ? (
                <img src={selectedUser.user.avatar_url} alt={selectedUser.user.username} />
              ) : (
                <div className="avatar-placeholder-medium">
                  {selectedUser?.user?.first_name?.[0]?.toUpperCase() || selectedUser?.user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <p>Calling...</p>
            <button
              className="end-call-btn"
              onClick={() => {
                setIsCalling(false)
                if (socket && selectedUser?.user_id && ongoingCall?.room_id) {
                  // Calculate call duration
                  const callDuration = ongoingCall.startTime
                    ? Math.floor((Date.now() - ongoingCall.startTime) / 1000)
                    : 0

                  socket.emit('end_call', {
                    recipient_id: selectedUser.user_id,
                    room_id: ongoingCall.room_id,
                    other_user_id: selectedUser.user_id,
                    call_duration: callDuration
                  })
                }
                if (callTimeoutRef.current) {
                  clearTimeout(callTimeoutRef.current)
                }
                setOngoingCall(null)
              }}
            >
              <FiX /> End Call
            </button>
          </div>
        </div>
      )}

      {/* Schedule Message Modal */}
      {showScheduleModal && (
        <ScheduleMessageModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          channelId={null}
          onScheduled={() => {
            notify('success', 'Message scheduled successfully!')
            setShowScheduleModal(false)
          }}
          isDirectMessage={true}
          recipientId={selectedUser?.user_id}
        />
      )}
    </div>
  )
}

