import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classesAPI } from '../api/classes'
import { channelsAPI } from '../api/channels'
import { useAuthStore } from '../store/authStore'
import { FiPlus, FiBook, FiUsers, FiSearch, FiBookOpen, FiArrowRight } from 'react-icons/fi'
import { useNotify } from '../components/NotificationProvider'
import './Classes.css'

export default function Classes() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [newClass, setNewClass] = useState({ name: '', description: '' })
  const queryClient = useQueryClient()
  const notify = useNotify()

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classesAPI.getClasses,
  })

  const createClassMutation = useMutation({
    mutationFn: classesAPI.createClass,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['classes'])
      setShowCreateModal(false)
      setNewClass({ name: '', description: '' }) // Reset form
      navigate(`/classes/${data.id}`)
    },
    onError: (error) => {
      console.error('Error creating class:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)

      let errorMessage = 'Failed to create class. Please try again.'

      // Check for network errors
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        errorMessage = 'Cannot connect to the server. Please verify your internet connection or try again later.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to create classes. Only teachers and admins can create classes.'
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid input. Please check your class name and try again.'
      } else if (error.response?.status === 500) {
        errorMessage = error.response.data?.error || 'Server error. Please try again later.'
      } else if (error.message) {
        errorMessage = error.message
      }

      notify('error', errorMessage)
    },
  })

  // Available Courses Logic
  const { data: availableCourses = [] } = useQuery({
    queryKey: ['availableCourses'],
    queryFn: channelsAPI.getAvailable,
  })

  const joinCourseMutation = useMutation({
    mutationFn: channelsAPI.joinChannel,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['availableCourses'])
      navigate(`/chat/${data.id}`)
    },
    onError: (err) => {
      notify('error', 'Failed to join course')
    }
  })

  const joinClassMutation = useMutation({
    mutationFn: classesAPI.joinClass,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['classes'])
      setShowJoinModal(false)
      setClassCode('')
      navigate(`/classes/${data.id}`)
    },
  })

  const handleCreate = (e) => {
    e.preventDefault()

    // Validate form
    if (!newClass.name || newClass.name.trim() === '') {
      notify('error', 'Please enter a class name')
      return
    }

    createClassMutation.mutate({
      name: newClass.name.trim(),
      description: newClass.description?.trim() || ''
    })
  }

  const handleJoin = (e) => {
    e.preventDefault()
    joinClassMutation.mutate(classCode)
  }

  const canCreateClass = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'super_admin'

  return (
    <div className="classes-page">
      <div className="classes-header">
        <div>
          <h1>Classes</h1>
          <p>Manage your classes and lessons</p>
        </div>
        <div className="header-actions">
          {canCreateClass && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus /> Create Class
            </button>
          )}
          <button
            className="btn btn-outline"
            onClick={() => setShowJoinModal(true)}
          >
            <FiSearch /> Join Class
          </button>
        </div>
      </div>

      <div className="classes-grid">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className="class-card"
            onClick={() => navigate(`/classes/${classItem.id}`)}
          >
            <div className="class-icon">
              <FiBook />
            </div>
            <h3>{classItem.name}</h3>
            <p>{classItem.description || 'No description'}</p>
            <div className="class-meta">
              <span>
                <FiUsers /> {classItem.member_count} members
              </span>
              <span>Code: {classItem.code}</span>
            </div>
          </div>
        ))}
      </div>

      {availableCourses.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div className="flex items-center gap-2 mb-4">
            <FiBookOpen className="text-indigo-600" size={24} />
            <h2>Available Courses</h2>
          </div>
          <div className="classes-grid">
            {availableCourses.map((course) => (
              <div key={course.id} className="class-card group" onClick={() => course.is_member ? navigate(`/chat/${course.id}`) : null}>
                <div className="class-icon bg-indigo-50 text-indigo-600">
                  <FiBookOpen />
                </div>
                <h3>{course.name}</h3>
                <p>{course.description || course.course_code || 'No description'}</p>
                <div className="class-meta">
                  <span>
                    {course.is_member ? <span className="text-green-600 font-bold">Enrolled</span> : <span>Click Join to enroll</span>}
                  </span>
                </div>
                {!course.is_member && (
                  <button
                    onClick={(e) => { e.stopPropagation(); joinCourseMutation.mutate(course.id); }}
                    className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
                  >
                    Join Course <FiArrowRight />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Class</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Class Name</label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) =>
                    setNewClass({ ...newClass, name: e.target.value })
                  }
                  required
                  className="input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newClass.description}
                  onChange={(e) =>
                    setNewClass({ ...newClass, description: e.target.value })
                  }
                  className="input"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createClassMutation.isLoading}
                >
                  {createClassMutation.isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Join Class</h2>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label>Class Code</label>
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  required
                  className="input"
                  placeholder="Enter class code"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

