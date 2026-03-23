import React, { useState, useEffect } from 'react'
import { FiUserPlus, FiUserMinus, FiSearch, FiUser, FiMoreVertical } from 'react-icons/fi'
import { groupsAPI } from '../../../api/groups'
import { usersAPI } from '../../../api/users'
import './AssignmentMembers.css'

export default function AssignmentMembers({ groupId, user }) {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)

    const isAuthorized = ['admin', 'teacher', 'super_admin'].includes(user?.role)

    useEffect(() => {
        fetchMembers()
    }, [groupId])

    const fetchMembers = async () => {
        try {
            setLoading(true)
            const data = await groupsAPI.getAssignmentGroupMembers(groupId)
            setMembers(data)
        } catch (err) {
            console.error('Failed to fetch members:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (e) => {
        const query = e.target.value
        setSearchQuery(query)
        if (query.length > 1) {
            setIsSearching(true)
            try {
                const results = await usersAPI.searchUsers(query)
                // Filter out existing members
                const memberIds = members.map(m => m.id)
                setSearchResults(results.filter(u => !memberIds.includes(u.id)))
            } catch (err) {
                console.error('Search failed:', err)
            } finally {
                setIsSearching(false)
            }
        } else {
            setSearchResults([])
        }
    }

    const addMember = async (userId) => {
        try {
            await groupsAPI.addAssignmentGroupMembers(groupId, { user_id: userId })
            setSearchQuery('')
            setSearchResults([])
            fetchMembers()
        } catch (err) {
            alert('Failed to add member: ' + (err.response?.data?.error || err.message))
        }
    }

    const removeMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return
        try {
            await groupsAPI.removeAssignmentGroupMember(groupId, userId)
            fetchMembers()
        } catch (err) {
            alert('Failed to remove member: ' + (err.response?.data?.error || err.message))
        }
    }

    if (loading) return <div className="members-loading">Loading collaborators...</div>

    return (
        <div className="assignment-members">
            <div className="members-container">
                <header className="members-header">
                    <div className="header-info">
                        <h2>Team Members</h2>
                        <span className="member-count">{members.length} active</span>
                    </div>
                    {isAuthorized && (
                        <div className="search-wrapper">
                            <div className="search-input-box">
                                <FiSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search students to add..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                />
                            </div>
                            {searchResults.length > 0 && (
                                <div className="search-dropdown animate-in slide-in-from-top-2">
                                    {searchResults.map(u => (
                                        <div key={u.id} className="search-item">
                                            <div className="user-info">
                                                <div className="avatar-small">
                                                    {u.username[0].toUpperCase()}
                                                </div>
                                                <div className="name-meta">
                                                    <span className="username">{u.username}</span>
                                                    <span className="role-tag">{u.role}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => addMember(u.id)} className="add-btn">
                                                <FiUserPlus />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </header>

                <div className="members-grid">
                    {members.map(m => (
                        <div key={m.id} className="member-card premium-hover">
                            <div className="member-avatar-large">
                                {m.avatar_url ? (
                                    <img src={m.avatar_url} alt={m.username} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {m.username[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="status-dot online"></div>
                            </div>
                            <div className="member-content">
                                <h4 className="member-name">
                                    {m.first_name ? `${m.first_name} ${m.last_name}` : m.username}
                                </h4>
                                <span className={`member-role ${m.role}`}>{m.role}</span>
                            </div>
                            {isAuthorized && m.id !== user.id && (
                                <button className="remove-btn" onClick={() => removeMember(m.id)} title="Remove from group">
                                    <FiUserMinus />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
