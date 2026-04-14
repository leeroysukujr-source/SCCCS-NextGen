import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
    FiCheckCircle, FiClock, FiUsers, FiBook, FiSearch, 
    FiFilter, FiArrowRight, FiActivity, FiLayers, FiZap
} from 'react-icons/fi'
import { useNotify } from '../components/NotificationProvider'
import apiClient from '../api/client'
import './GradingHub.css'

export default function GradingHub() {
    const navigate = useNavigate()
    const notify = useNotify()
    
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState('all') // all, pending, completed

    useEffect(() => {
        fetchAssignments()
    }, [])

    const fetchAssignments = async () => {
        try {
            const res = await apiClient.get('/assignments')
            setAssignments(res.data)
            setLoading(false)
        } catch (err) {
            notify('error', 'Failed to fetch assignments for grading')
            setLoading(false)
        }
    }

    const filteredAssignments = assignments.filter(asg => {
        const matchesSearch = asg.title.toLowerCase().includes(searchQuery.toLowerCase())
        if (filter === 'pending') return matchesSearch && asg.pending_count > 0
        if (filter === 'completed') return matchesSearch && asg.pending_count === 0 && asg.submission_count > 0
        return matchesSearch
    })

    const stats = {
        total: assignments.length,
        pending: assignments.reduce((sum, a) => sum + (a.pending_count || 0), 0),
        submissions: assignments.reduce((sum, a) => sum + (a.submission_count || 0), 0)
    }

    if (loading) return <div className="grading-hub-loading">Synthesizing Academic Data...</div>

    return (
        <div className="grading-hub-page">
            <header className="hub-header">
                <div className="header-content">
                    <h1>Academic Grading Hub</h1>
                    <p>Orchestrate and evaluate student submissions across all courses</p>
                </div>
                <div className="hub-stats">
                    <div className="hub-stat-card">
                        <span className="stat-label">Active Missions</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                    <div className="hub-stat-card warning">
                        <span className="stat-label">Pending Review</span>
                        <span className="stat-value">{stats.pending}</span>
                    </div>
                    <div className="hub-stat-card success">
                        <span className="stat-label">Total Submissions</span>
                        <span className="stat-value">{stats.submissions}</span>
                    </div>
                </div>
            </header>

            <div className="hub-controls">
                <div className="search-bar">
                    <FiSearch />
                    <input 
                        type="text" 
                        placeholder="Filter by mission title..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button 
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >All Assignments</button>
                    <button 
                        className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    ><FiZap /> Needs Grading</button>
                    <button 
                        className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilter('completed')}
                    ><FiCheckCircle /> Fully Evaluated</button>
                </div>
            </div>

            <main className="hub-grid">
                {filteredAssignments.length > 0 ? (
                    filteredAssignments.map(asg => (
                        <div key={asg.id} className="hub-card">
                            <div className="card-top">
                                <div className="card-icon">
                                    <FiBook />
                                </div>
                                <div className="card-badge">
                                    {asg.status.toUpperCase()}
                                </div>
                            </div>
                            <div className="card-body">
                                <h3>{asg.title}</h3>
                                <p className="asg-meta">
                                    <FiLayers /> {asg.submission_count} Total Submissions
                                </p>
                                <div className="progress-container">
                                    <div className="progress-header">
                                        <span>Grading Progress</span>
                                        <span>{asg.submission_count > 0 ? Math.round((asg.graded_count / asg.submission_count) * 100) : 0}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${asg.submission_count > 0 ? (asg.graded_count / asg.submission_count) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer">
                                <div className="footer-info">
                                    <FiClock />
                                    <span>Due: {new Date(asg.due_date).toLocaleDateString()}</span>
                                </div>
                                <button 
                                    className="grade-btn" 
                                    onClick={() => navigate(`/assignment/${asg.id}/grading`)}
                                >
                                    Grade <FiArrowRight />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="hub-empty">
                        <FiActivity size={64} />
                        <h2>No assignments found</h2>
                        <p>Adjust your search/filters or check back later for new student submissions.</p>
                    </div>
                )}
            </main>
        </div>
    )
}
