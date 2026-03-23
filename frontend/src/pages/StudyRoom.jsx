import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUsers, FiVideo, FiMessageCircle, FiBookOpen, FiClock, FiCpu } from 'react-icons/fi'
import './StudyRoom.css'

export default function StudyRoom() {
    const navigate = useNavigate()

    const features = [
        {
            id: 'group-study',
            title: 'Group Study Rooms',
            description: 'Join virtual spaces for collaborative learning with voice, video, and whiteboards.',
            icon: <FiVideo />,
            color: 'var(--primary-purple)',
            path: '/study-room/group'
        },
        {
            id: 'peer-tutoring',
            title: 'Peer Tutoring',
            description: 'Connect with student tutors for one-on-one help or volunteer to teach others.',
            icon: <FiUsers />,
            color: 'var(--primary-blue)',
            path: '/study-room/tutoring'
        },
        {
            id: 'discussion-boards',
            title: 'Topic Discussions',
            description: 'Topic-based forums for Q&A, sharing notes, and academic discussions.',
            icon: <FiMessageCircle />,
            color: 'var(--success-green)',
            path: '/study-room/discussions'
        }
    ]

    return (
        <div className="study-room-container">
            <header className="study-room-header">
                <h1>Study Room</h1>
                <p> collaborative space for peer-to-peer learning and academic excellence.</p>
            </header>

            <div className="study-features-grid">
                {features.map(feature => (
                    <div
                        key={feature.id}
                        className="study-feature-card"
                        onClick={() => navigate(feature.path)}
                    >
                        <div className="feature-icon" style={{ backgroundColor: feature.color }}>
                            {feature.icon}
                        </div>
                        <div className="feature-content">
                            <h2>{feature.title}</h2>
                            <p>{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="study-room-stats">
                <div className="stat-card">
                    <FiClock className="stat-icon" />
                    <div className="stat-info">
                        <span className="stat-value">24/7</span>
                        <span className="stat-label">Access</span>
                    </div>
                </div>
                <div className="stat-card">
                    <FiBookOpen className="stat-icon" />
                    <div className="stat-info">
                        <span className="stat-value">100+</span>
                        <span className="stat-label">Topics</span>
                    </div>
                </div>
                <div className="stat-card">
                    <FiCpu className="stat-icon" />
                    <div className="stat-info">
                        <span className="stat-value">AI</span>
                        <span className="stat-label">Assisted</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
