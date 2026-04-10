import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../../api/users'
import { presenceAPI } from '../../api/presence'
import { useAuthStore } from '../../store/authStore'
import { FiUsers, FiSearch, FiEdit, FiTrash2, FiShield, FiDownload, FiSettings, FiX, FiCheck, FiPlus, FiFilePlus, FiUpload } from 'react-icons/fi'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { useConfirm, useNotify } from '../../components/NotificationProvider'
import './AdminPages.css'

export default function ManageUsers() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const notify = useNotify()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showPrivilegeModal, setShowPrivilegeModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [availablePrivileges, setAvailablePrivileges] = useState([])
  const [userPrivileges, setUserPrivileges] = useState({})
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    role: 'student',
    password: ''
  })
  const [bulkData, setBulkData] = useState([])
  const exportMenuRef = useRef(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getUsers,
    enabled: user?.role === 'admin' || user?.role === 'super_admin'
  })

  // Fetch online users
  const { data: onlineUsers = [] } = useQuery({
    queryKey: ['onlineUsers'],
    queryFn: presenceAPI.getOnlineUsers,
    refetchInterval: 30000, // Refresh every 30s
    enabled: user?.role === 'admin' || user?.role === 'super_admin'
  })

  // Create a set of online user IDs for fast lookup
  const onlineUserIds = new Set(onlineUsers.map(u => u.user.id))

  const { data: privilegesList = [] } = useQuery({
    queryKey: ['privileges'],
    queryFn: usersAPI.getAvailablePrivileges,
    enabled: (user?.role === 'admin' || user?.role === 'super_admin') && showPrivilegeModal
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => usersAPI.updateUserRole(userId, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['users'])
      setShowRoleModal(false)
      setSelectedUser(null)

      // Show professional success notification
      showNotification('success', `User role updated successfully to ${data.user.role}. The user's dashboard will update automatically.`)
    },
    onError: (error) => {
      showNotification('error', error.response?.data?.error || 'Failed to update user role')
    }
  })

  const updatePrivilegesMutation = useMutation({
    mutationFn: ({ userId, privileges }) => usersAPI.updateUserPrivileges(userId, privileges),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['users'])
      setShowPrivilegeModal(false)
      setSelectedUser(null)
      setUserPrivileges({})

      // Show professional success notification
      showNotification('success', 'User privileges updated successfully. Changes are now active for the user.')
    },
    onError: (error) => {
      showNotification('error', error.response?.data?.error || 'Failed to update user privileges')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (userId) => usersAPI.deleteUser(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['users'])
      notify('success', data.message || 'User deleted successfully')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to delete user')
    }
  })

  const createUserMutation = useMutation({
    mutationFn: (userData) => usersAPI.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      setShowCreateModal(false)
      setNewUser({ email: '', username: '', first_name: '', last_name: '', role: 'student', password: '' })
      notify('success', 'User created successfully')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to create user')
    }
  })

  const bulkCreateMutation = useMutation({
    mutationFn: (users) => usersAPI.bulkCreateUsers(users),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['users'])
      setShowBulkModal(false)
      setBulkData([])
      notify('success', `Successfully created ${data.created?.length || 0} users`)
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to bulk create users')
    }
  })

  const handleDelete = (userId) => {
    confirm('Are you sure you want to delete this user? This action cannot be undone.').then(ok => {
      if (!ok) return
      deleteMutation.mutate(userId, {
        onError: (error) => {
          notify('error', error.message || 'Failed to delete user')
        }
      })
    })
  }

  const showNotification = (type, message) => {
    const notification = document.createElement('div')
    notification.className = `admin-notification admin-notification-${type}`
    notification.innerHTML = `
      <div class="notification-icon">${type === 'success' ? '✓' : '✕'}</div>
      <div class="notification-message">${message}</div>
    `
    document.body.appendChild(notification)

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10)

    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show')
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 5000)
  }

  const handleEditRole = (userToEdit) => {
    if (userToEdit.id === user?.id) {
      showNotification('error', 'Cannot change your own role')
      return
    }
    setSelectedUser(userToEdit)
    setShowRoleModal(true)
  }

  const handleEditPrivileges = async (user) => {
    setSelectedUser(user)
    setUserPrivileges(user.privileges || {})
    try {
      const privileges = await usersAPI.getAvailablePrivileges()
      setAvailablePrivileges(privileges)
      setShowPrivilegeModal(true)
    } catch (error) {
      notify('error', 'Failed to load available privileges')
    }
  }

  const handleRoleUpdate = (e) => {
    e.preventDefault()
    if (selectedUser && selectedUser.id !== user?.id) {
      const newRole = e.target.querySelector('select')?.value || selectedUser.role
      updateRoleMutation.mutate({
        userId: selectedUser.id,
        role: newRole
      })
    } else if (selectedUser?.id === user?.id) {
      notify('error', 'Cannot change your own role')
    }
  }

  const handlePrivilegeToggle = (privilegeKey) => {
    setUserPrivileges(prev => ({
      ...prev,
      [privilegeKey]: !prev[privilegeKey]
    }))
  }

  const handlePrivilegesUpdate = (e) => {
    e.preventDefault()
    if (selectedUser) {
      updatePrivilegesMutation.mutate({
        userId: selectedUser.id,
        privileges: userPrivileges
      })
    }
  }

  const handleCreateUser = (e) => {
    e.preventDefault()
    createUserMutation.mutate(newUser)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    const extension = file.name.split('.').pop().toLowerCase()

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setBulkData(results.data)
        }
      })
    } else if (['xlsx', 'xls'].includes(extension)) {
      reader.onload = (evt) => {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        setBulkData(data)
      }
      reader.readAsBinaryString(file)
    } else {
      notify('error', 'Unsupported file format. Please use CSV or Excel.')
    }
  }

  const handleBulkSubmit = () => {
    if (bulkData.length === 0) {
      notify('error', 'No data found in file')
      return
    }
    bulkCreateMutation.mutate(bulkData)
  }

  const handleExport = async (role, format) => {
    try {
      const { getApiUrl } = await import('../../utils/api')
      const baseURL = getApiUrl()
      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage')).state.token
        : ''

      const response = await fetch(`${baseURL}/users/export/${role}/${format}`, {
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
      a.download = `${role}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      notify('error', `Failed to export ${role} list`)
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

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="admin-page">
        <div className="admin-error">Unauthorized. Admin access required.</div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><FiUsers /> Manage Users</h1>
        <div className="header-actions">
          <div className="export-dropdown" ref={exportMenuRef}>
            <button
              className="btn-secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <FiDownload /> Export Teachers
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => { handleExport('teachers', 'xlsx'); setShowExportMenu(false); }}>
                  <FiDownload /> Excel (.xlsx)
                </button>
                <button onClick={() => { handleExport('teachers', 'pdf'); setShowExportMenu(false); }}>
                  <FiDownload /> PDF (.pdf)
                </button>
                <button onClick={() => { handleExport('teachers', 'docx'); setShowExportMenu(false); }}>
                  <FiDownload /> Word (.docx)
                </button>
              </div>
            )}
          </div>
          <button className="btn-secondary" onClick={() => setShowBulkModal(true)}>
            <FiFilePlus /> Bulk Import
          </button>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> Create User
          </button>
        </div>
      </div>

      <div className="admin-filters">
        <div className="admin-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </div>

      {isLoading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Account</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No users found</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-name-cell">
                        {u.first_name} {u.last_name}
                      </div>
                    </td>
                    <td>
                      {onlineUserIds.has(u.id) ? (
                        <span className="status-badge active" style={{ backgroundColor: '#10b981', color: 'white' }}>
                          Online
                        </span>
                      ) : (
                        <span className="status-badge inactive" style={{ opacity: 0.7 }}>
                          Offline
                        </span>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>
                        <FiShield /> {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                        {u.is_active ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          onClick={() => handleEditRole(u)}
                          title="Update Role"
                        >
                          <FiEdit />
                        </button>
                        <button
                          className="action-btn view"
                          onClick={() => handleEditPrivileges(u)}
                          title="Manage Privileges"
                        >
                          <FiSettings />
                        </button>
                        {u.id !== user?.id && (
                          <button
                            className="action-btn delete"
                            onClick={() => handleDelete(u.id)}
                            title="Delete User"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Update Modal */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update User Role</h2>
              <button className="modal-close" onClick={() => setShowRoleModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleRoleUpdate} className="modal-body">
              <div className="form-group">
                <label>User</label>
                <p><strong>{selectedUser.first_name} {selectedUser.last_name}</strong> ({selectedUser.email})</p>
              </div>
              <div className="form-group">
                <label>Current Role</label>
                <p>{selectedUser.role}</p>
              </div>
              <div className="form-group">
                <label>New Role *</label>
                <select
                  required
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                  className="role-select"
                >
                  <option value="admin">Admin - Full system access</option>
                  <option value="teacher">Teacher - Can manage classes and students</option>
                  <option value="student">Student - Basic access</option>
                </select>
                <p className="form-hint">
                  The user's dashboard will automatically update to reflect the new role.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowRoleModal(false)
                    setSelectedUser(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updateRoleMutation.isLoading || selectedUser.id === user?.id}
                >
                  {updateRoleMutation.isLoading ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Privileges Management Modal */}
      {showPrivilegeModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPrivilegeModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Privileges - {selectedUser.first_name} {selectedUser.last_name}</h2>
              <button className="modal-close" onClick={() => setShowPrivilegeModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handlePrivilegesUpdate} className="modal-body">
              <div className="form-group">
                <p className="modal-description">
                  Select the privileges you want to assign to this user. Changes take effect immediately.
                </p>
              </div>
              <div className="privileges-list">
                {privilegesList.map((privilege) => (
                  <div key={privilege.key} className="privilege-item">
                    <label className="privilege-checkbox">
                      <input
                        type="checkbox"
                        checked={!!userPrivileges[privilege.key]}
                        onChange={() => handlePrivilegeToggle(privilege.key)}
                      />
                      <div className="privilege-content">
                        <strong>{privilege.label}</strong>
                        <span className="privilege-description">{privilege.description}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowPrivilegeModal(false)
                    setSelectedUser(null)
                    setUserPrivileges({})
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updatePrivilegesMutation.isLoading}
                >
                  {updatePrivilegesMutation.isLoading ? 'Updating...' : 'Update Privileges'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New User</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Username (optional)</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Auto-generated if blank"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Initial Password (optional)</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Randomized if blank"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={createUserMutation.isLoading}>
                  {createUserMutation.isLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bulk User Import</h2>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="bulk-upload-zone">
                <input type="file" id="bulk-file-input" hidden accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                <label htmlFor="bulk-file-input" className="upload-label">
                  <FiUpload className="upload-icon" />
                  <span>Click to select CSV or Excel file</span>
                  <small>Expected columns: first_name, last_name, email, role, (optional) password, reg_no</small>
                </label>
              </div>

              {bulkData.length > 0 && (
                <div className="preview-container">
                  <h3>Preview ({bulkData.length} users)</h3>
                  <div className="table-wrapper mini">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkData.slice(0, 5).map((d, i) => (
                          <tr key={i}>
                            <td>{d.first_name} {d.last_name}</td>
                            <td>{d.email}</td>
                            <td>{d.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkData.length > 5 && <p className="more-count">... and {bulkData.length - 5} more</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="btn-primary" 
                disabled={bulkCreateMutation.isLoading || bulkData.length === 0}
                onClick={handleBulkSubmit}
              >
                {bulkCreateMutation.isLoading ? 'Processing...' : `Create ${bulkData.length} Users`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

