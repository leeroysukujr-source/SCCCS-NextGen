import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { groupsAPI } from '../../../api/groups';
import { 
    FiTarget, FiCheckCircle, FiClock, FiActivity, 
    FiMessageSquare, FiUsers, FiArrowRight, FiZap,
    FiTrendingUp, FiShield, FiCpu
} from 'react-icons/fi';
import './AssignmentOverview.css';

const AssignmentOverview = ({ groupData, groupId, setActiveTab }) => {
    const { data: tasks = [] } = useQuery({
        queryKey: ['assignmentGroupTasks', groupId],
        queryFn: () => groupsAPI.getAssignmentGroupTasks(groupId)
    });

    const { data: members = [] } = useQuery({
        queryKey: ['assignmentGroupMembers', groupId],
        queryFn: () => groupsAPI.getAssignmentGroupMembers(groupId)
    });

    const stats = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'Done').length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
        return { total, done, progress };
    }, [tasks]);

    return (
        <div className="assignment-overview animate-in">
            <div className="overview-header">
                <div className="welcome-banner">
                    <div className="banner-content">
                        <FiZap className="zap-icon" />
                        <div>
                            <h2>Squad Mission Objective</h2>
                            <p>{groupData?.assignment_title || 'Project Collaboration Unit'}</p>
                        </div>
                    </div>
                    <div className="mission-status-chip">
                        <span className="pulse-dot"></span>
                        LIVE MISSION ACTIVE
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card glass-card group-hover-up" onClick={() => setActiveTab('tasks')}>
                    <div className="stat-icon"><FiTarget /></div>
                    <div className="stat-info">
                        <h3>{stats.progress}%</h3>
                        <p>Mission Completion</p>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${stats.progress}%` }}></div>
                    </div>
                </div>

                <div className="stat-card glass-card group-hover-up" onClick={() => setActiveTab('members')}>
                    <div className="stat-icon"><FiUsers /></div>
                    <div className="stat-info">
                        <h3>{members.length}</h3>
                        <p>Active Agents</p>
                    </div>
                    <div className="member-dots">
                        {members.slice(0, 5).map(m => (
                            <div key={m.id} className="small-dot" title={m.first_name}></div>
                        ))}
                    </div>
                </div>

                <div className="stat-card glass-card group-hover-up">
                    <div className="stat-icon"><FiShield /></div>
                    <div className="stat-info">
                        <h3>Secure</h3>
                        <p>Workplace Environment</p>
                    </div>
                </div>
            </div>

            <div className="main-overview-content">
                <div className="activity-section glass-card">
                    <div className="section-header">
                        <h3><FiActivity /> Live Activity Stream</h3>
                        <button onClick={() => setActiveTab('chat')}>View Intel <FiArrowRight /></button>
                    </div>
                    <div className="activity-list">
                        <div className="activity-item">
                            <div className="activity-marker"></div>
                            <div className="activity-text">
                                <span className="agent">SYSTEM</span> Initialized Mission Workspace
                            </div>
                            <span className="time">Just now</span>
                        </div>
                        {tasks.slice(0, 3).map(task => (
                            <div key={task.id} className="activity-item">
                                <div className="activity-marker success"></div>
                                <div className="activity-text">
                                    <span className="agent">LOGISTICS</span> Task "{task.title}" synced to grid
                                </div>
                                <span className="time">{task.status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="quick-access glass-card">
                    <h3><FiCpu /> Subsystem Quick-Link</h3>
                    <div className="action-buttons">
                        <button className="q-btn" onClick={() => setActiveTab('chat')}>
                            <FiMessageSquare /> Secure Comms
                        </button>
                        <button className="q-btn" onClick={() => setActiveTab('docs')}>
                            <FiActivity /> Asset Terminal
                        </button>
                        <button className="q-btn" onClick={() => setActiveTab('whiteboard')}>
                            <FiTrendingUp /> Strategy Board
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentOverview;
