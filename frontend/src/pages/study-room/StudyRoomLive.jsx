
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    LiveKitRoom,
    VideoConference,
    LayoutContextProvider,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { useAuthStore } from '../../store/authStore'
import Whiteboard from '../video-buddy/Whiteboard'
import MeetingControlBar from './MeetingControlBar'
import StudyDocsPanel from '../../features/study-room-docs/StudyDocsPanel'
import GoalsWidget from '../../features/study-room-docs/GoalsWidget'
import './StudyRoomLive.css'
import { FiEdit2, FiClock, FiGrid, FiArrowRight, FiArrowLeft, FiAlertTriangle, FiFileText } from 'react-icons/fi'
import { features } from '../../config/features'

export default function StudyRoomLive() {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [token, setToken] = useState('')
    const [liveKitUrl, setLiveKitUrl] = useState(import.meta.env.VITE_LIVEKIT_URL || "wss://scccs-nextgen-v888916d.livekit.cloud")

    // Determine active tab from URL path
    const isDocsRoute = window.location.pathname.endsWith('/docs')
    const [activeTab, setActiveTab] = useState(isDocsRoute && features.studyDocsEnabled ? 'docs' : 'whiteboard')

    const [roomName, setRoomName] = useState(roomId)
    const [error, setError] = useState(null)
    const [pomodoro, setPomodoro] = useState({ time: 25 * 60, isActive: false, mode: 'focus' })

    // Control bar states
    const [muted, setMuted] = useState(false)
    const [videoOff, setVideoOff] = useState(false)
    const [screenSharing, setScreenSharing] = useState(false)
    const [recording, setRecording] = useState(false)
    const [handRaised, setHandRaised] = useState(false)
    const [chatActive, setChatActive] = useState(false)
    const [participantsActive, setParticipantsActive] = useState(false)
    const [moreMenuOpen, setMoreMenuOpen] = useState(false)
    const [layout, setLayout] = useState('grid') // 'grid' | 'speaker' | 'focus'

    // Pomodoro Logic
    useEffect(() => {
        let interval = null
        if (pomodoro.isActive && pomodoro.time > 0) {
            interval = setInterval(() => {
                setPomodoro(p => ({ ...p, time: p.time - 1 }))
            }, 1000)
        } else if (pomodoro.time === 0) {
            clearInterval(interval)
            setPomodoro(p => ({
                ...p,
                isActive: false,
                mode: p.mode === 'focus' ? 'break' : 'focus',
                time: p.mode === 'focus' ? 5 * 60 : 25 * 60
            }))
        }
        return () => clearInterval(interval)
    }, [pomodoro.isActive, pomodoro.time])

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    const toggleTimer = () => setPomodoro(p => ({ ...p, isActive: !p.isActive }))

    // Fetch Token
    useEffect(() => {
        const fetchToken = async () => {
            if (!user) return

            try {
                // Determine a clean display name
                const username = user.username || `User-${user.id}`
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

                // Use a consistent, sanitized room ID
                const liveKitRoomName = roomId.replace(/[^a-zA-Z0-9-_]/g, '_')
                setRoomName(liveKitRoomName)

                const response = await fetch(`${apiUrl}/meeting-livekit/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${useAuthStore.getState().token}` // Include auth token if needed by backend
                    },
                    body: JSON.stringify({
                        room_id: liveKitRoomName,
                        user_id: username
                    })
                })

                if (!response.ok) {
                    throw new Error(`Failed to get token: ${response.statusText}`)
                }

                const data = await response.json()
                if (data.token) {
                    setToken(data.token)
                    if (data.url) {
                        setLiveKitUrl(data.url)
                    }
                } else {
                    throw new Error("No token received from server")
                }
            } catch (e) {
                console.error("Error fetching token:", e)
                setError(e.message)
            }
        }
        fetchToken()
    }, [roomId, user])

    if (error) {
        return (
            <div className="study-live-loading">
                <div className="error-state">
                    <FiAlertTriangle size={48} color="#ef4444" />
                    <h3>Connection Failed</h3>
                    <p>{error}</p>
                    <button onClick={() => navigate(-1)} className="back-btn-error">Go Back</button>
                    <small style={{ marginTop: 10, display: 'block', color: '#888' }}>
                        Check backend .env KEYS if using Cloud
                    </small>
                </div>
            </div>
        )
    }

    if (!token) {
        return (
            <div className="study-live-loading">
                <div className="spinner-modern"></div>
                <p>Connecting to Secure Study Room...</p>
                <small>{roomId}</small>
            </div>
        )
    }

    // Disconnection logic
    const handleDisconnect = () => {
        setToken('') // Clear token
        navigate(-1) // Go back
    }

    return (
        <div className="study-live-container">
            <div className="study-live-sidebar">
                <div className="sidebar-header">
                    <button onClick={handleDisconnect} className="back-btn"><FiArrowLeft /></button>
                    <h3 title={roomName}>{roomName.length > 12 ? roomName.substring(0, 12) + '...' : roomName}</h3>
                </div>

                <div className="nav-pills">
                    <button className={activeTab === 'whiteboard' ? 'active' : ''} onClick={() => setActiveTab('whiteboard')}>
                        <FiEdit2 /> Whiteboard
                    </button>
                    <button className={activeTab === 'video' ? 'active' : ''} onClick={() => {
                        setActiveTab('video')
                        navigate(`/study-room/live/${roomId}`)
                    }}>
                        <FiGrid /> Video Grid
                    </button>
                    {features.studyDocsEnabled && (
                        <button className={activeTab === 'docs' ? 'active' : ''} onClick={() => {
                            setActiveTab('docs')
                            navigate(`/study-room/live/${roomId}/docs`)
                        }}>
                            <FiFileText /> Docs
                        </button>
                    )}
                </div>

                <div className="pomodoro-widget" style={{ marginTop: 'auto', marginBottom: '1rem' }}>
                    <div className="pomodoro-display">
                        <FiClock /> {formatTime(pomodoro.time)}
                    </div>
                    <div className="pomodoro-controls">
                        <button onClick={toggleTimer}>{pomodoro.isActive ? 'Pause' : 'Start'}</button>
                        <span>{pomodoro.mode === 'focus' ? 'Focus Time' : 'Break Time'}</span>
                    </div>
                </div>

                {features.studyDocsEnabled && <GoalsWidget roomId={roomId} />}
            </div>

            <div className="study-live-main">
                <RoomControlledContent
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    token={token}
                    roomId={roomId}
                    liveKitUrl={liveKitUrl}
                    handleDisconnect={handleDisconnect}
                    onError={(e) => {
                        console.error("LiveKit Error:", e)
                        setError(e.message || "Failed to connect to media server")
                    }}
                    layout={layout}
                    onLayoutChange={setLayout}
                    muted={muted}
                    onMuteToggle={() => setMuted(!muted)}
                    videoOff={videoOff}
                    onVideoToggle={() => setVideoOff(!videoOff)}
                    screenSharing={screenSharing}
                    onScreenShare={() => setScreenSharing(!screenSharing)}
                    recording={recording}
                    onRecordingToggle={() => setRecording(!recording)}
                    handRaised={handRaised}
                    onHandRaise={() => setHandRaised(!handRaised)}
                    chatActive={chatActive}
                    onChat={() => setChatActive(!chatActive)}
                    participantsActive={participantsActive}
                    onParticipants={() => setParticipantsActive(!participantsActive)}
                    moreMenuOpen={moreMenuOpen}
                    onMoreMenu={() => setMoreMenuOpen(!moreMenuOpen)}
                    onLeave={handleDisconnect}
                />
            </div>
        </div>
    )
}

// Inner component that has access to room context
function RoomControlledContent({
    activeTab,
    token,
    roomId,
    liveKitUrl,
    handleDisconnect,
    onError,
    layout,
    onLayoutChange,
    muted,
    onMuteToggle,
    videoOff,
    onVideoToggle,
    screenSharing,
    onScreenShare,
    recording,
    onRecordingToggle,
    handRaised,
    onHandRaise,
    chatActive,
    onChat,
    participantsActive,
    onParticipants,
    moreMenuOpen,
    onMoreMenu,
    onLeave
}) {
    return (
        <LiveKitRoom
            video={!videoOff}
            audio={!muted}
            token={token}
            serverUrl={liveKitUrl}
            data-lk-theme="default"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            onDisconnected={handleDisconnect}
            onError={onError}
        >
            <LayoutContextProvider>
                <div className={`room-content layout-${layout}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {activeTab === 'whiteboard' && (
                        <div className="whiteboard-wrapper">
                            <Whiteboard />
                            {/* Hidden video conference to keep audio active while whiteboard is shown */}
                            <div style={{ display: 'none' }}>
                                <VideoConference />
                            </div>
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <VideoConference />
                    )}

                    {activeTab === 'docs' && (
                        <div className="docs-wrapper" style={{ height: '100%', width: '100%', background: '#fff' }}>
                            <StudyDocsPanel roomId={roomId} onClose={() => { /* Handle close */ }} />
                        </div>
                    )}

                    {/* Custom Control Bar */}
                    <MeetingControlBar
                        muted={muted}
                        onMuteToggle={onMuteToggle}
                        videoOff={videoOff}
                        onVideoToggle={onVideoToggle}
                        screenSharing={screenSharing}
                        onScreenShare={onScreenShare}
                        recording={recording}
                        onRecordingToggle={onRecordingToggle}
                        handRaised={handRaised}
                        onHandRaise={onHandRaise}
                        chatActive={chatActive}
                        onChat={onChat}
                        participantsActive={participantsActive}
                        onParticipants={onParticipants}
                        moreMenuOpen={moreMenuOpen}
                        onMoreMenu={onMoreMenu}
                        layout={layout}
                        onLayoutChange={onLayoutChange}
                        onLeave={onLeave}
                    />
                </div>
            </LayoutContextProvider>
        </LiveKitRoom>
    )
}
