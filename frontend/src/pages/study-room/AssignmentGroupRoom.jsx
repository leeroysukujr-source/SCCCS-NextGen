import React, { useState, useEffect, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groupsAPI } from '../../api/groups'
import { useAuthStore } from '../../store/authStore'
import {
    FiUsers, FiVideo, FiMessageSquare, FiFileText, FiLayers,
    FiSettings, FiMaximize2, FiMinimize2, FiPhoneOff, FiMic, FiVideo as FiVideoIcon,
    FiCheckSquare, FiFolder, FiActivity, FiTarget, FiSmartphone, FiCpu, FiGrid
} from 'react-icons/fi'
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
} from '@livekit/components-react'
import '@livekit/components-styles'

import AssignmentChat from './assignment-group-components/AssignmentChat'
import AssignmentDocs from './assignment-group-components/AssignmentDocs'
import AssignmentWhiteboard from './assignment-group-components/AssignmentWhiteboard'
import AssignmentTasks from './assignment-group-components/AssignmentTasks'
import AssignmentAssets from './assignment-group-components/AssignmentAssets'
import AssignmentMembers from './assignment-group-components/AssignmentMembers'
import AssignmentOverview from './assignment-group-components/AssignmentOverview'

import './AssignmentGroupRoom.css'

export default function AssignmentGroupRoom() {
    const { groupId } = useParams()
    const navigate = useNavigate()
    const { user, token: authToken } = useAuthStore()
    const [activeTab, setActiveTab] = useState('overview')
    const [showCall, setShowCall] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    // Fetch Assignment Group Details
    const { data: groupData } = useQuery({
        queryKey: ['assignmentGroup', groupId],
        queryFn: () => groupsAPI.getAssignmentGroup(groupId),
        retry: 1
    })

    const { data: tokenData, isLoading, error } = useQuery({
        queryKey: ['assignmentGroupToken', groupId],
        queryFn: () => groupsAPI.getAssignmentGroupToken(groupId),
        retry: 1,
        staleTime: 60000
    })

    if (isLoading) return (
        <div className="loading-screen">
            <div className="loader"></div>
            <span>Synchronizing workspace...</span>
        </div>
    )

    if (error) return (
        <div className="error-screen">
            <h2>Access Denied</h2>
            <p>You are not a member of this assignment group or the link is invalid.</p>
            <button onClick={() => navigate('/study-room/group')}>Back to Groups</button>
        </div>
    )

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <FiActivity /> },
        { id: 'chat', label: 'Chat', icon: <FiMessageSquare /> },
        { id: 'docs', label: 'Documents', icon: <FiFileText /> },
        { id: 'whiteboard', label: 'Whiteboard', icon: <FiLayers /> },
        { id: 'tasks', label: 'Missions', icon: <FiTarget /> },
        { id: 'assets', label: 'Vault', icon: <FiFolder /> },
        { id: 'members', label: 'Team', icon: <FiUsers /> },
    ]

    return (
        <div className="assignment-group-room animate-in">
            {/* Top Navigation Bar - Ultra Sleek */}
            <header className="room-header-premium">
                <div className="header-left">
                    <div className="group-badge-nexus">{groupData?.assignment_title || 'Project Strike'}</div>
                    <div className="title-stack">
                        <h1>{groupData?.name || `Squad ${groupId}`}</h1>
                        <div className="mission-status">
                            <FiTarget /> <span>PHASE: COLLABORATION</span>
                        </div>
                    </div>
                </div>

                <div className="header-center">
                    <nav className="tab-nav-nexus">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={activeTab === tab.id ? 'active' : ''}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <div className="tab-icon-wrapper">{tab.icon}</div>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="header-right">
                    <div className="uplink-status">
                        <div className="uplink-pulse"></div>
                        <span>ENCRYPTED UPLINK</span>
                    </div>
                    {!showCall && (
                        <button className="establish-comms-btn" onClick={() => setShowCall(true)}>
                            <FiVideo /> Establish Comms
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="room-main-content">
                <div className={`content-canvas-nexus ${showCall && !isMinimized ? 'with-call' : ''}`}>
                    <Suspense fallback={
                        <div className="nexus-loading">
                            <div className="nexus-scanner"></div>
                            <span>SYNCHRONIZING SUBSYSTEMS...</span>
                        </div>
                    }>
                        {activeTab === 'overview' && <AssignmentOverview groupData={groupData} groupId={groupId} setActiveTab={setActiveTab} />}
                        {activeTab === 'chat' && <AssignmentChat groupId={groupId} />}
                        {activeTab === 'docs' && <AssignmentDocs groupId={groupId} />}
                        {activeTab === 'whiteboard' && <AssignmentWhiteboard groupId={groupId} />}
                        {activeTab === 'tasks' && <AssignmentTasks groupId={groupId} />}
                        {activeTab === 'assets' && <AssignmentAssets groupId={groupId} />}
                        {activeTab === 'members' && <AssignmentMembers groupId={groupId} user={user} />}
                    </Suspense>
                </div>

                {/* LiveKit Call Overlay - Re-engineered as a Floating Hub */}
                {showCall && tokenData && (
                    <div className={`nexus-call-hub ${isMinimized ? 'minimized' : 'expanded'}`}>
                        <div className="hub-header">
                            <div className="hub-info">
                                <div className="live-tag">LIVE</div>
                                <span>SQUAD COMMS</span>
                            </div>
                            <div className="hub-actions">
                                <button onClick={() => setIsMinimized(!isMinimized)} className="action-btn">
                                    {isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
                                </button>
                                <button className="terminate-btn" onClick={() => setShowCall(false)}>
                                    <FiPhoneOff />
                                </button>
                            </div>
                        </div>
                        <div className="hub-body">
                            <LiveKitRoom
                                video={true}
                                audio={true}
                                token={tokenData.token}
                                serverUrl={tokenData.url}
                                data-lk-theme="dark"
                                className="nexus-video-container"
                            >
                                {isMinimized ? (
                                    <div className="hub-minimized-view">
                                        <RoomAudioRenderer />
                                        <div className="audio-wave">
                                            <span></span><span></span><span></span><span></span>
                                        </div>
                                        <div className="voice-active-text">Voice Channel Active</div>
                                    </div>
                                ) : (
                                    <>
                                        <VideoConference />
                                        <RoomAudioRenderer />
                                    </>
                                )}
                            </LiveKitRoom>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
