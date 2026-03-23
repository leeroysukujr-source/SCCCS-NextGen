import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classesAPI } from '../../api/classes'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { FiBook, FiSearch, FiTrash2, FiEye, FiUsers, FiX } from 'react-icons/fi'
import './AdminPages.css'
import { useConfirm, useNotify } from '../../components/NotificationProvider'

export default function ManageClasses() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: classesAPI.getAllClasses,
    enabled: user?.role === 'admin' || user?.role === 'super_admin'
  })

  const notify = useNotify()
  const confirm = useConfirm()

  const deleteMutation = useMutation({
    mutationFn: classesAPI.deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-classes'])
      queryClient.invalidateQueries(['classes'])
      notify('success', 'Class deleted successfully')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to delete class')
    }
  })

  const handleDelete = (classId, className) => {
    ;(async () => {
      const ok = await confirm(`Are you sure you want to delete "${className}"? This action cannot be undone and all members and lessons will be removed.`)
      if (ok) deleteMutation.mutate(classId)
    })()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const filteredClasses = classes.filter(classItem => {
    return (
      classItem.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.teacher?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.teacher?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="error-message">
            <FiX size={48} />
            <h2>Access Denied</h2>
            <p>You do not have permission to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div className="header-left">
            <h1>
              <FiBook /> Manage Courses
            </h1>
            <p>View and delete courses created in the system</p>
          </div>
        </div>

        {/* Search */}
        <div className="admin-filters">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search courses by name, code, description, or teacher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Classes Table */}
        <div className="admin-table-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading courses...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="empty-state">
              <FiBook size={48} />
              <h3>No courses found</h3>
              <p>{searchTerm ? 'Try adjusting your search' : 'No courses have been created yet'}</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Teacher</th>
                  <th>Members</th>
                  <th>Lessons</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((classItem) => (
                  <tr key={classItem.id}>
                    <td>
                      <div className="class-name-cell">
                        <strong>{classItem.name}</strong>
                        {classItem.description && (
                          <span className="class-description">{classItem.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <code className="class-code">{classItem.code}</code>
                    </td>
                    <td>
                      {classItem.teacher?.first_name || classItem.teacher?.username || 'Unknown'}
                    </td>
                    <td>
                      <span className="member-count">
                        <FiUsers /> {classItem.member_count || 0}
                      </span>
                    </td>
                    <td>{classItem.lesson_count || 0}</td>
                    <td>{formatDate(classItem.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          onClick={() => navigate(`/classes/${classItem.id}`)}
                          title="View Course"
                        >
                          <FiEye />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(classItem.id, classItem.name)}
                          disabled={deleteMutation.isLoading}
                          title="Delete Course"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-label">Total Courses</span>
            <span className="stat-value">{classes.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Members</span>
            <span className="stat-value">
              {classes.reduce((sum, c) => sum + (c.member_count || 0), 0)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Lessons</span>
            <span className="stat-value">
              {classes.reduce((sum, c) => sum + (c.lesson_count || 0), 0)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Filtered</span>
            <span className="stat-value">{filteredClasses.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

