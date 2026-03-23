import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedbackAPI } from '../api/feedback'
import { usersAPI } from '../api/users'
import { useAuthStore } from '../store/authStore'
import {
  FiSend, FiPlus, FiSearch, FiFilter, FiEdit2, FiTrash2,
  FiMessageSquare, FiAlertCircle, FiCheckCircle, FiClock,
  FiX, FiUser, FiArrowUp, FiArrowDown, FiStar
} from 'react-icons/fi'
import './Feedback.css'
import { useConfirm, useNotify } from '../components/NotificationProvider'

export default function Feedback() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const confirm = useConfirm()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const [newFeedback, setNewFeedback] = useState({
    lecturer_id: '',
    subject: '',
    content: '',
    category: 'general',
    priority: 'normal',
    is_anonymous: false
  })

  const [responseText, setResponseText] = useState('')
  const [responseStatus, setResponseStatus] = useState('acknowledged')

  // Broadcast state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [broadcastData, setBroadcastData] = useState({
    target_role: 'student',
    subject: '',
    content: ''
  })

  // Get recipients list (Lecturers and Admins)
  const { data: recipients = [] } = useQuery({
    queryKey: ['recipients', user?.role],
    queryFn: async () => {
      if (!user) return []
      if (user.role === 'admin') return [] // Admins don't send feedback up

      let list = []
      try {
        if (user.role === 'student') {
          // Students can send to Teachers and Admins
          const [teachers, admins] = await Promise.all([
            usersAPI.getPublicTeachers(),
            usersAPI.getPublicAdmins()
          ])
          list = [...teachers, ...admins]
        } else if (user.role === 'teacher') {
          // Teachers can send to Admins
          const admins = await usersAPI.getPublicAdmins()
          list = [...admins]
        }
      } catch (err) {
        console.error('Error fetching recipients:', err)
        return []
      }

      // Unique and not self
      const unique = list.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i)
      return unique.filter(u => u.id !== user?.id)
    },
    enabled: !!user && user.role !== 'admin',
  })

  // Get feedbacks
  const { data: feedbacks = [], refetch: refetchFeedbacks, isLoading: feedbacksLoading, error: feedbacksError } = useQuery({
    queryKey: ['feedbacks', filterStatus, filterCategory],
    queryFn: feedbackAPI.getFeedbacks,
    refetchInterval: 30000,
    retry: 2,
  })

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(fb => {
    const matchesSearch =
      fb.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.lecturer?.first_name && `${fb.lecturer.first_name} ${fb.lecturer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (fb.student?.first_name && `${fb.student.first_name} ${fb.student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = filterStatus === 'all' || fb.status === filterStatus
    const matchesCategory = filterCategory === 'all' || fb.category === filterCategory

    return matchesSearch && matchesStatus && matchesCategory
  })

  // Create feedback mutation
  const createFeedbackMutation = useMutation({
    mutationFn: feedbackAPI.createFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbacks'])
      setShowCreateModal(false)
      setNewFeedback({
        lecturer_id: '',
        subject: '',
        content: '',
        category: 'general',
        priority: 'normal',
        is_anonymous: false
      })
      notify('success', 'Feedback submitted successfully!')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to submit feedback')
    }
  })

  // Respond to feedback mutation
  const respondToFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      return feedbackAPI.respondToFeedback(selectedFeedback.id, data.response || responseText)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbacks'])
      setShowResponseModal(false)
      setSelectedFeedback(null)
      setResponseText('')
      notify('success', 'Response sent successfully!')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to send response')
    }
  })

  // Broadcast mutation
  const broadcastMutation = useMutation({
    mutationFn: feedbackAPI.broadcastFeedback,
    onSuccess: () => {
      setShowBroadcastModal(false)
      setBroadcastData({ target_role: 'student', subject: '', content: '' })
      notify('success', 'Broadcast sent successfully!')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to send broadcast')
    }
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ feedbackId, status }) => {
      return feedbackAPI.updateFeedbackStatus(feedbackId, status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbacks'])
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to update status')
    }
  })

  const handleCreateFeedback = (e) => {
    e.preventDefault()
    if (!newFeedback.lecturer_id || !newFeedback.subject || !newFeedback.content) {
      notify('error', 'Please fill in all required fields')
      return
    }
    createFeedbackMutation.mutate(newFeedback)
  }

  const handleRespond = (e) => {
    e.preventDefault()
    if (!responseText.trim()) {
      notify('error', 'Please enter a response')
      return
    }
    respondToFeedbackMutation.mutate({
      response: responseText,
      status: responseStatus
    })
  }

  const handleBroadcast = (e) => {
    e.preventDefault()
    if (!broadcastData.subject || !broadcastData.content) {
      notify('error', 'Please fill in all fields')
      return
    }
    broadcastMutation.mutate(broadcastData)
  }

  const handleUpdateStatus = async (feedbackId, status) => {
    const ok = await confirm(`Change status to "${status}"?`)
    if (!ok) return
    updateStatusMutation.mutate({ feedbackId, status })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="status-pending" />
      case 'acknowledged': return <FiCheckCircle className="status-acknowledged" />
      case 'resolved': return <FiCheckCircle className="status-resolved" />
      case 'closed': return <FiX className="status-closed" />
      default: return <FiAlertCircle />
    }
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      low: '#6b7280',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    }
    return (
      <span className="priority-badge" style={{ backgroundColor: colors[priority] || colors.normal }}>
        {priority?.toUpperCase() || 'NORMAL'}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isStudent = user?.role === 'student'
  const isLecturer = user?.role === 'teacher' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <div>
          <h1>Feedback & Grievances</h1>
          <p>
            {isAdmin
              ? 'View and manage all feedback and grievances from students across the system'
              : isStudent
                ? 'Share your feedback, concerns, or grievances with your lecturers'
                : 'View and respond to student feedback'}
          </p>
        </div>
        {(isStudent || isLecturer) && !isAdmin && (
          <button
            className="create-feedback-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus /> New Feedback
          </button>
        )}
        {isAdmin && (
          <button
            className="create-feedback-btn"
            onClick={() => setShowBroadcastModal(true)}
            style={{ backgroundColor: '#8b5cf6' }} // Purple for broadcast
          >
            <FiSend /> Broadcast Update
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="feedback-filters">
        <div className="search-filter">
          <FiSearch />
          <input
            type="text"
            placeholder="Search feedbacks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="general">General</option>
          <option value="academic">Academic</option>
          <option value="grievance">Grievance</option>
          <option value="suggestion">Suggestion</option>
          <option value="complaint">Complaint</option>
        </select>
      </div>

      {/* Feedbacks List */}
      <div className="feedbacks-list">
        {feedbacksLoading ? (
          <div className="no-feedbacks">
            <FiMessageSquare />
            <p>Loading feedbacks...</p>
          </div>
        ) : feedbacksError ? (
          <div className="no-feedbacks">
            <FiMessageSquare />
            <p>Error loading feedbacks: {feedbacksError.message || 'Failed to load feedbacks'}</p>
            <button onClick={() => refetchFeedbacks()}>
              Retry
            </button>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="no-feedbacks">
            <FiMessageSquare />
            <p>No feedbacks found</p>
            {(isStudent || isAdmin) && (
              <button onClick={() => setShowCreateModal(true)}>
                Submit your first feedback
              </button>
            )}
          </div>
        ) : (
          filteredFeedbacks.map(feedback => (
            <div
              key={feedback.id}
              className={`feedback-card ${feedback.status}`}
              onClick={() => setSelectedFeedback(feedback)}
            >
              <div className="feedback-card-header">
                <div className="feedback-title-row">
                  <h3>{feedback.subject}</h3>
                  <div className="feedback-meta">
                    {getStatusIcon(feedback.status)}
                    {getPriorityBadge(feedback.priority)}
                  </div>
                </div>
                <div className="feedback-category">
                  {feedback.category}
                </div>
              </div>

              <div className="feedback-content">
                <p>{feedback.content.substring(0, 200)}{feedback.content.length > 200 ? '...' : ''}</p>
              </div>

              <div className="feedback-card-footer">
                <div className="feedback-info">
                  {isStudent ? (
                    <span>
                      To: {feedback.lecturer?.first_name} {feedback.lecturer?.last_name} ({feedback.lecturer?.role})
                    </span>
                  ) : (
                    <span>
                      From: {feedback.is_anonymous ? 'Anonymous Student' :
                        `${feedback.student?.first_name || ''} ${feedback.student?.last_name || ''}`.trim() || feedback.student?.username || 'Unknown'}
                    </span>
                  )}
                  <span className="feedback-date">{formatDate(feedback.created_at)}</span>
                </div>

                {feedback.response && (
                  <div className="feedback-response-indicator">
                    <FiCheckCircle /> Replied
                  </div>
                )}
              </div>

              {((feedback.status === 'pending' && isLecturer) || (isAdmin && feedback.status !== 'closed')) && (
                <div className="feedback-actions">
                  <button
                    className="respond-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFeedback(feedback)
                      setShowResponseModal(true)
                    }}
                  >
                    <FiSend /> {feedback.response ? 'Update Response' : 'Respond'}
                  </button>
                  {isAdmin && (
                    <button
                      className="respond-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUpdateStatus(feedback.id, 'closed')
                      }}
                      style={{ backgroundColor: '#6b7280', marginLeft: '0.5rem' }}
                    >
                      Close
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Feedback Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Feedback</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCreateFeedback}>
              <div className="form-group">
                <label>Select Recipient *</label>
                <select
                  value={newFeedback.lecturer_id}
                  onChange={(e) => setNewFeedback({ ...newFeedback, lecturer_id: e.target.value })}
                  required
                >
                  <option value="">Choose a recipient...</option>
                  {recipients.map(recipient => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.first_name} {recipient.last_name} ({recipient.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={newFeedback.subject}
                  onChange={(e) => setNewFeedback({ ...newFeedback, subject: e.target.value })}
                  placeholder="Brief subject of your feedback..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={newFeedback.category}
                  onChange={(e) => setNewFeedback({ ...newFeedback, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="academic">Academic</option>
                  <option value="grievance">Grievance</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newFeedback.priority}
                  onChange={(e) => setNewFeedback({ ...newFeedback, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={newFeedback.content}
                  onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
                  placeholder="Describe your feedback, concern, or grievance in detail..."
                  rows={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newFeedback.is_anonymous}
                    onChange={(e) => setNewFeedback({ ...newFeedback, is_anonymous: e.target.checked })}
                  />
                  Submit anonymously
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={createFeedbackMutation.isPending}>
                  {createFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedFeedback && (
        <div className="modal-overlay" onClick={() => setShowResponseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Respond to Feedback</h2>
              <button onClick={() => setShowResponseModal(false)}>
                <FiX />
              </button>
            </div>

            <div className="feedback-detail">
              <h3>{selectedFeedback.subject}</h3>
              <p>{selectedFeedback.content}</p>
              <div className="feedback-detail-meta">
                <span>Category: {selectedFeedback.category}</span>
                <span>Priority: {selectedFeedback.priority}</span>
                <span>From: {selectedFeedback.is_anonymous ? 'Anonymous Student' :
                  `${selectedFeedback.student?.first_name || ''} ${selectedFeedback.student?.last_name || ''}`.trim() || 'Unknown'}
                </span>
              </div>
            </div>

            <form onSubmit={handleRespond}>
              <div className="form-group">
                <label>Your Response *</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter your response to the student..."
                  rows={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>Update Status</label>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value)}
                >
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowResponseModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={respondToFeedbackMutation.isPending}>
                  {respondToFeedbackMutation.isPending ? 'Sending...' : 'Send Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="modal-overlay" onClick={() => setShowBroadcastModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Broadcast Feedback Update</h2>
              <button onClick={() => setShowBroadcastModal(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleBroadcast}>
              <div className="form-group">
                <label>Target Audience *</label>
                <select
                  value={broadcastData.target_role}
                  onChange={(e) => setBroadcastData({ ...broadcastData, target_role: e.target.value })}
                  required
                >
                  <option value="student">All Students</option>
                  <option value="teacher">All Lecturers</option>
                  <option value="all">Everyone (Students & Lecturers)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={broadcastData.subject}
                  onChange={(e) => setBroadcastData({ ...broadcastData, subject: e.target.value })}
                  placeholder="Subject of the broadcast..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={broadcastData.content}
                  onChange={(e) => setBroadcastData({ ...broadcastData, content: e.target.value })}
                  placeholder="Message content..."
                  rows={6}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowBroadcastModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={broadcastMutation.isPending} style={{ backgroundColor: '#8b5cf6' }}>
                  {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

