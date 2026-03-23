import React from 'react'
import { FiMessageCircle, FiHash } from 'react-icons/fi'
import '../StudyRoom.css'

export default function TopicDiscussions() {
    return (
        <div className="study-room-container">
            <header className="study-room-header">
                <h1>Topic Discussions</h1>
                <p>Join the conversation on various academic topics.</p>
            </header>

            <div className="study-features-grid">
                <div className="study-feature-card">
                    <div className="feature-icon" style={{ backgroundColor: 'var(--success-green)' }}>
                        <FiHash />
                    </div>
                    <div className="feature-content">
                        <h2>Computer Science</h2>
                        <p>Programming, Algorithms, AI</p>
                    </div>
                </div>
                <div className="study-feature-card">
                    <div className="feature-icon" style={{ backgroundColor: '#ec4899' }}>
                        <FiHash />
                    </div>
                    <div className="feature-content">
                        <h2>Mathematics</h2>
                        <p>Calculus, Algebra, Statistics</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
