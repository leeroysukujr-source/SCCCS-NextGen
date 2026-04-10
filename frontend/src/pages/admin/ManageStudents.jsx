import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsAPI } from '../../api/students'
import { presenceAPI } from '../../api/presence'
import { useAuthStore } from '../../store/authStore'
import { FiUsers, FiPlus, FiEdit, FiTrash2, FiSearch, FiX, FiDownload } from 'react-icons/fi'
import './AdminPages.css'
import { useConfirm, useNotify } from '../../components/NotificationProvider'

export default function ManageStudents() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: ''
  })

  const { data: students = [], isLoading, error, isError } = useQuery({
    queryKey: ['students'],
    queryFn: studentsAPI.getStudents,
    enabled: user?.role === 'admin'
  })

  // Fetch online users
  const { data: onlineUsers = [] } = useQuery({
    queryKey: ['onlineUsers'],
    queryFn: presenceAPI.getOnlineUsers,
    refetchInterval: 30000,
    enabled: user?.role === 'admin'
  })
  const onlineUserIds = new Set(onlineUsers.map(u => u.user.id))

  const notify = useNotify()
  const confirm = useConfirm()

  const addMutation = useMutation({
    mutationFn: studentsAPI.addStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
      setShowAddModal(false)
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentsAPI.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
      setEditingStudent(null)
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: studentsAPI.removeStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['students'])
    }
  })

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      first_name: '',
      last_name: '',
      password: ''
    })
  }

  const handleAdd = (e) => {
    e.preventDefault()
    addMutation.mutate(formData)
  }

  const handleUpdate = (e) => {
    e.preventDefault()
    const updateData = { ...formData }
    if (!updateData.password) delete updateData.password
    updateMutation.mutate({ id: editingStudent.id, data: updateData })
  }

  const handleEdit = (student) => {
    setEditingStudent(student)
    setFormData({
      email: student.email,
      username: student.username,
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      password: ''
    })
    setShowAddModal(true)
  }

  const handleDelete = async (studentId) => {
    const ok = await confirm('Are you sure you want to delete this student?')
    if (ok) deleteMutation.mutate(studentId)
  }

  const handleExport = async (format) => {
    try {
      const { getApiUrl } = await import('../../utils/api')
      const baseURL = getApiUrl()
      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage')).state.token
        : ''

      const response = await fetch(`${baseURL}/users/export/students/${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `students_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      notify('error', 'Failed to export students list')
    }
  }

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  const filteredStudents = students.filter(student =>
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (user?.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="admin-error">Unauthorized. Admin access required.</div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><FiUsers /> Manage Students</h1>
        <div className="header-actions">
          <div className="export-dropdown" ref={exportMenuRef}>
            <button
              className="btn-secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <FiDownload /> Export
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => { handleExport('xlsx'); setShowExportMenu(false); }}>
                  <FiDownload /> Excel (.xlsx)
                </button>
                <button onClick={() => { handleExport('pdf'); setShowExportMenu(false); }}>
                  <FiDownload /> PDF (.pdf)
                </button>
                <button onClick={() => { handleExport('docx'); setShowExportMenu(false); }}>
                  <FiDownload /> Word (.docx)
                </button>
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={() => { setShowAddModal(true); setEditingStudent(null); resetForm(); }}>
            <FiPlus /> Add Student
          </button>
        </div>
      </div>

      <div className="admin-search">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isError && (
        <div className="admin-error" style={{ margin: '1rem', padding: '1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '0.5rem' }}>
          <strong>Error loading students:</strong> {error?.response?.status === 403 ? 'Access Denied' : (error?.message || 'Unknown error')}
          <br />
          {error?.response?.status === 403 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p>Your session may have expired or you do not have permission.</p>
              <button
                onClick={() => {
                  localStorage.removeItem('auth-storage');
                  window.location.href = '/login';
                }}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '5px'
                }}
              >
                Log Out & Retry
              </button>
            </div>
          )}
          <br />
          <small>Technical details: {JSON.stringify(error?.response?.data || error?.message)}</small>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading students...</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Email</th>
                <th>Username</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    No students found using term "{searchTerm}".
                    (Total loaded: {students?.length || 0})
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.first_name} {student.last_name}</td>
                    <td>
                      {onlineUserIds.has(student.id) ? (
                        <span className="status-badge active" style={{ backgroundColor: '#10b981', color: 'white' }}>
                          Online
                        </span>
                      ) : (
                        <span className="status-badge inactive" style={{ opacity: 0.7 }}>
                          Offline
                        </span>
                      )}
                    </td>
                    <td>{student.email}</td>
                    <td>{student.username}</td>
                    <td>
                      <button className="btn-icon" onClick={() => handleEdit(student)} title="Edit student" aria-label="Edit student">
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => handleDelete(student.id)} title="Delete student" aria-label="Delete student">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {
        showAddModal && (
          <div className="modal-overlay" onClick={() => { setShowAddModal(false); setEditingStudent(null); resetForm(); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingStudent ? 'Edit Student Details' : 'Register New Student'}</h2>
                <button className="modal-close" onClick={() => { setShowAddModal(false); setEditingStudent(null); resetForm(); }} title="Close">
                  <FiX />
                </button>
              </div>
              <form onSubmit={editingStudent ? handleUpdate : handleAdd}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="e.g. John"
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="e.g. Doe"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="student@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Leave blank to auto-generate"
                    />
                  </div>
                  <div className="form-group">
                    <label>{editingStudent ? 'Update Password' : 'Initial Password *'}</label>
                    <input
                      type="password"
                      required={!editingStudent}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingStudent ? "•••••••• (only to change)" : "••••••••"}
                    />
                    <p className="form-hint">
                      {editingStudent 
                        ? "Leave this field empty if you don't wish to change the student's password." 
                        : "Ensure the student is provided with this password for their initial login."}
                    </p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => { setShowAddModal(false); setEditingStudent(null); resetForm(); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={addMutation.isLoading || updateMutation.isLoading}>
                    {addMutation.isLoading || updateMutation.isLoading ? 'Processing...' : (editingStudent ? 'Update Student' : 'Register Student')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  )
}

