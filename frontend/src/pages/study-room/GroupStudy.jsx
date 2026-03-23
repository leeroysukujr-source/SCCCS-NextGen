import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FiUsers, 
  FiPlus, 
  FiSearch, 
  FiLock, 
  FiGlobe, 
  FiArrowRight, 
  FiCheck, 
  FiX, 
  FiClock, 
  FiMoreVertical, 
  FiEdit2, 
  FiTrash2, 
  FiLogOut,
  FiBookOpen,
  FiCpu,
  FiActivity,
  FiAlertCircle,
  FiAward
} from 'react-icons/fi'
import { groupsAPI } from '../../api/groups'
import { assignmentsAPI } from '../../api/assignments'
import { useNotify } from '../../components/NotificationProvider'
import AssignmentGroupSelectionModal from './assignment-group-components/AssignmentGroupSelectionModal'
import './GroupStudyNexus.css'

export default function GroupStudy() {
    const navigate = useNavigate()
    const notify = useNotify()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectingAsgGroup, setSelectingAsgGroup] = useState(null)
    const [openMenuId, setOpenMenuId] = useState(null)

    // Fetch groups
    const { data: groups, isLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: groupsAPI.getGroups,
    })

    // Fetch Assignment Groups (GSR)
    const { data: assignmentGroups } = useQuery({
        queryKey: ['myAssignmentGroups'],
        queryFn: groupsAPI.getMyAssignmentGroups,
    })

    // Fetch All Assignments to see which ones needs enrollment
    const { data: allAssignments } = useQuery({
        queryKey: ['allAssignments'],
        queryFn: assignmentsAPI.getAssignments,
    })

    // Find assignments that are published but user is not in a group for
    const assignmentsToBeJoined = allAssignments?.filter(asg => {
        if (asg.status !== 'published') return false;
        const isInGroup = assignmentGroups?.some(item => item.assignment.id === asg.id);
        return !isInGroup;
    }) || [];

    // Filter for Study Groups only
    const studyGroups = groups?.filter(g =>
        (g.category === 'Study Group' || g.name?.toLowerCase().includes('study')) &&
        g.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    const joinMutation = useMutation({
        mutationFn: ({ groupId, type }) => groupsAPI.joinGroup(groupId, { type }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['groups'])
            notify('success', data.message || 'Request sent successfully')
            if (variables.type === 'direct') {
                navigate(`/study-room/group/${variables.groupId}`)
            }
        },
        onError: (err) => notify('error', 'Failed to join group')
    })

    const deleteGroupMutation = useMutation({
        mutationFn: groupsAPI.deleteGroup,
        onSuccess: () => {
            queryClient.invalidateQueries(['groups'])
            notify('success', 'Group deleted')
        },
        onError: () => notify('error', 'Failed to delete group')
    })

    const leaveGroupMutation = useMutation({
        mutationFn: groupsAPI.leaveGroup,
        onSuccess: () => {
            queryClient.invalidateQueries(['groups'])
            notify('success', 'Left group successfully')
        },
        onError: () => notify('error', 'Failed to leave group')
    })

    const handleGroupAction = (group) => {
        if (group.is_member) {
            navigate(`/study-room/group/${group.id}`)
        } else if (group.join_type === 'request') {
            if (group.has_pending_request) return
            joinMutation.mutate({ groupId: group.id, type: 'request' })
        } else {
            joinMutation.mutate({ groupId: group.id, type: 'direct' })
        }
    }

    return (
        <div className="nexus-study-container">
            <header className="nexus-header">
                <h1>Discovery Hub</h1>
                <p>Bridge your knowledge gaps by connecting with peers. Join established study guilds or initialize a new collaboration node.</p>

                <div className="nexus-controls">
                    <div className="nexus-search-bar">
                        <FiSearch className="nexus-search-icon" />
                        <input
                            className="nexus-search-input"
                            type="text"
                            placeholder="Find study guilds / topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary px-8" onClick={() => setShowCreateModal(true)}>
                        <FiPlus /> Initialize Guild
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="flex flex-col items-center py-20 opacity-40">
                    <div className="spinner-modern mb-4"></div>
                    <p className="animate-pulse tracking-widest uppercase text-xs font-bold">Synchronizing Nodes...</p>
                </div>
            ) : (
                <div className="nexus-group-grid">
                    
                    {/* Assignment Groups Section */}
                    {assignmentGroups?.length > 0 && (
                        <>
                            <h3 className="nexus-section-title">
                                <FiAward />
                                <span>Active Assignments</span>
                            </h3>
                            {assignmentGroups.map(item => (
                                <div key={`asg-${item.group.id}`} className="nexus-card scale-in">
                                    <div className="card-top">
                                        <div className="card-icon-box" style={{ background: 'var(--gradient-accent)' }}>
                                            <FiBookOpen />
                                        </div>
                                        <span className="card-status-pill active">Deployed</span>
                                    </div>
                                    <div className="card-body">
                                        <h2>{item.group.name}</h2>
                                        <p className="card-subtitle">{item.assignment.title}</p>
                                        <div className="card-meta">
                                            <div className="meta-item">
                                                <FiActivity />
                                                <span>Role: {item.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="card-action-btn btn-nexus-primary" onClick={() => navigate(`/study-room/assignment-group/${item.group.id}`)}>
                                        Enter Command Room <FiArrowRight />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Assignments needing enrollment */}
                    {assignmentsToBeJoined.length > 0 && (
                        <>
                            <h3 className="nexus-section-title">
                                <FiAlertCircle />
                                <span>Required Collaborations</span>
                            </h3>
                            {assignmentsToBeJoined.map(asg => (
                                <div
                                    key={`open-asg-${asg.id}`}
                                    className="nexus-card"
                                    onClick={() => setSelectingAsgGroup(asg)}
                                    style={{ borderStyle: 'dashed', borderColor: 'var(--warning)' }}
                                >
                                    <div className="card-top">
                                        <div className="card-icon-box" style={{ background: 'var(--gradient-gold)' }}>
                                            <FiUsers />
                                        </div>
                                        <span className="card-status-pill pending">Awaiting Node</span>
                                    </div>
                                    <div className="card-body">
                                        <h2>Pending Enrollment</h2>
                                        <p className="card-subtitle">{asg.title}</p>
                                        <div className="card-meta">
                                            <div className="meta-item text-amber-400 font-bold">
                                                <span>Enrollment Required</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="card-action-btn btn-nexus-secondary">
                                        Register Guild <FiArrowRight />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}

                    <h3 className="nexus-section-title">
                        <FiGlobe />
                        <span>Institutional Study Guilds</span>
                    </h3>

                    {/* Group List */}
                    {studyGroups.map(group => (
                        <div key={group.id} className="nexus-card">
                            {(group.is_member || group.member_role === 'admin') && (
                                <>
                                    <button
                                        className="nexus-manage-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === group.id ? null : group.id);
                                        }}
                                    >
                                        <FiMoreVertical />
                                    </button>

                                    {openMenuId === group.id && (
                                        <div className="nexus-dropdown animate-modalPop">
                                            {group.member_role === 'admin' ? (
                                                <>
                                                    <button onClick={() => {
                                                        const newName = prompt("Rename Hub:", group.name);
                                                        if (newName) groupsAPI.updateGroup(group.id, { name: newName }).then(() => queryClient.invalidateQueries(['groups']));
                                                        setOpenMenuId(null);
                                                    }}>
                                                        <FiEdit2 /> Protocol Rename
                                                    </button>
                                                    <button className="danger" onClick={() => {
                                                        if (confirm("Permanently deactivate this node?")) deleteGroupMutation.mutate(group.id);
                                                        setOpenMenuId(null);
                                                    }}>
                                                        <FiTrash2 /> Deactivate
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="danger" onClick={() => {
                                                    if (confirm("Sever link with this node?")) leaveGroupMutation.mutate(group.id);
                                                    setOpenMenuId(null);
                                                }}>
                                                    <FiLogOut /> Leave Guild
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="card-top">
                                <div className="card-icon-box" style={{ background: group.color || 'var(--gradient-primary)' }}>
                                    <FiUsers />
                                </div>
                                {group.is_member && <span className="card-status-pill active">Affiliated</span>}
                            </div>
                            
                            <div className="card-body">
                                <h2>{group.name}</h2>
                                <p className="card-subtitle">{group.description || 'Secure communication guild for collaborative learning.'}</p>
                                <div className="card-meta">
                                    <div className="meta-item">
                                        {group.join_type === 'request' ? <FiLock /> : <FiGlobe />}
                                        <span>{group.join_type === 'request' ? 'Private' : 'Open'}</span>
                                    </div>
                                    <div className="meta-item">
                                        <FiActivity />
                                        <span>{group.member_count || 0} Affiliated</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                className={`card-action-btn ${group.is_member ? 'btn-nexus-primary' : 'btn-nexus-secondary'}`}
                                onClick={() => handleGroupAction(group)}
                                disabled={group.has_pending_request}
                            >
                                {group.is_member ? <>Enter Hub <FiArrowRight /></> :
                                    group.has_pending_request ? <>Sync Request Sent <FiClock /></> :
                                        group.join_type === 'request' ? 'Request Link' : 'Establish Link'}
                            </button>
                        </div>
                    ))}

                    {studyGroups.length === 0 && !isLoading && (
                        <div className="nexus-empty-state">
                            <FiCpu className="empty-icon" />
                            <h3 className="text-xl font-bold mb-2">No Active Guilds Detected</h3>
                            <p className="opacity-50 text-sm">Initialize a new secure node to begin collaborating.</p>
                        </div>
                    )}
                </div>
            )}

            {showCreateModal && (
                <CreateGroupModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(newGroup) => {
                        queryClient.invalidateQueries(['groups'])
                        setShowCreateModal(false)
                        notify('success', 'Guild Initialized!')
                        navigate(`/study-room/group/${newGroup.id}`)
                    }}
                />
            )}

            {selectingAsgGroup && (
                <AssignmentGroupSelectionModal
                    assignment={selectingAsgGroup}
                    onClose={() => setSelectingAsgGroup(null)}
                    onSuccess={(groupId) => {
                        setSelectingAsgGroup(null);
                        navigate(`/study-room/assignment-group/${groupId}`);
                    }}
                />
            )}
        </div>
    )
}


function CreateGroupModal({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Study Group',
        join_type: 'request', // Default to private/request
        max_members: 10
    })

    const mutation = useMutation({
        mutationFn: groupsAPI.createGroup,
        onSuccess: onSuccess,
        onError: () => alert('Failed to create group') // Simplified error
    })

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <div className="modal-header">
                    <h2>Create Study Group</h2>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }}>
                    <div className="form-group">
                        <label>Group Name</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Advanced Physics Study"
                        />
                    </div>
                    <div className="form-group">
                        <label>Privacy Setting</label>
                        <select
                            value={formData.join_type}
                            onChange={e => setFormData({ ...formData, join_type: e.target.value })}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: 8 }}
                        >
                            <option value="request">Request Only (Private)</option>
                            <option value="direct">Open to All (Public)</option>
                            <option value="link">Invite Link Only</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What is this group about?"
                        />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="submit-btn glow-effect" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Creating...' : <>Create Group <FiCheck /></>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
