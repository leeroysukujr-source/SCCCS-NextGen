import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groupsAPI } from '../../api/groups'
import { useAuthStore } from '../../store/authStore'
import { useSocket } from '../../contexts/SocketProvider'
import {
    FiArrowRight, FiVideo, FiMessageSquare, FiFileText, FiUsers,
    FiPaperclip, FiSend, FiEdit3, FiPenTool,
    FiFolder, FiLayers, FiMaximize2, FiMinimize2, FiPhoneOff,
    FiBookOpen, FiActivity, FiShield, FiMoreVertical, FiShare2, FiMonitor
} from 'react-icons/fi'
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer
} from '@livekit/components-react'
import '@livekit/components-styles'

import './AssignmentGroupRoom.css' 
import { Track } from 'livekit-client'

const Whiteboard = React.lazy(() => import('../video-buddy/Whiteboard'))

export default function StudyGroupDetail() {
    const { groupId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [activeTab, setActiveTab] = useState('chat')
    const [showCall, setShowCall] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)

    // Fetch Group Details
    const { data: group, isLoading: groupLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => groupsAPI.getGroup(groupId),
    })

    // Fetch LiveKit Token
    const { data: tokenData, isLoading: tokenLoading } = useQuery({
        queryKey: ['groupRoomToken', groupId],
        queryFn: () => groupsAPI.getGroupRoomToken(groupId),
        retry: 1,
        enabled: !!group 
    })

    if (groupLoading) return (
        <div className="nexus-loading">
            <div className="nexus-scanner"></div>
            <span>Synchronizing Study Node...</span>
        </div>
    )

    if (!group) return (
        <div className="nexus-loading">
            <FiShield size={48} className="text-red-500 mb-4" />
            <h2 className="text-2xl font-black">ACCESS DENIED</h2>
            <p className="opacity-50 mb-8">Unauthorized node entry or inactive guild.</p>
            <button className="btn btn-secondary px-8" onClick={() => navigate('/study-room')}>Return to Discovery</button>
        </div>
    )

    return (
        <div className="assignment-group-room">
            {/* Top Navigation Bar */}
            <header className="room-header-premium">
                <div className="header-left">
                     <div className="title-stack">
                        <div className="group-badge-nexus">{group.category || 'COLLABORATION NODE'}</div>
                        <h1>{group.name}</h1>
                        <div className="mission-status">
                            <FiActivity /> Uplink Status: <span>OPERATIONAL</span>
                        </div>
                    </div>
                </div>

                <div className="header-center">
                    <nav className="tab-nav-nexus">
                         <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
                            <div className="tab-icon-wrapper"><FiMessageSquare /></div>
                            <span>Comms</span>
                        </button>
                        <button className={activeTab === 'docs' ? 'active' : ''} onClick={() => setActiveTab('docs')}>
                            <div className="tab-icon-wrapper"><FiEdit3 /></div>
                            <span>Protocols</span>
                        </button>
                        <button className={activeTab === 'whiteboard' ? 'active' : ''} onClick={() => setActiveTab('whiteboard')}>
                            <div className="tab-icon-wrapper"><FiLayers /></div>
                            <span>Schematics</span>
                        </button>
                        <button className={activeTab === 'files' ? 'active' : ''} onClick={() => setActiveTab('files')}>
                            <div className="tab-icon-wrapper"><FiFolder /></div>
                            <span>Assets</span>
                        </button>
                        <button className={activeTab === 'members' ? 'active' : ''} onClick={() => setActiveTab('members')}>
                            <div className="tab-icon-wrapper"><FiUsers /></div>
                            <span>Nodes</span>
                        </button>
                    </nav>
                </div>

                <div className="header-right">
                    <div className="uplink-status">
                         <div className="uplink-pulse"></div>
                         <span>LIVE SYNC</span>
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
                    {activeTab === 'chat' && (
                        <GroupDiscussion group={group} user={user} />
                    )}
                    {activeTab === 'docs' && (
                        <GroupCollaborativeNotes group={group} />
                    )}
                    {activeTab === 'whiteboard' && (
                        <div className="w-full h-full relative">
                            <React.Suspense fallback={<div className="nexus-loading"><span>Booting Board...</span></div>}>
                                <Whiteboard roomId={`group-${group.id}`} isReadOnly={!group.is_member} />
                            </React.Suspense>
                        </div>
                    )}
                    {activeTab === 'files' && (
                        <GroupFiles group={group} />
                    )}
                    {activeTab === 'members' && (
                        <GroupMembers group={group} />
                    )}
                </div>

                {/* LiveKit Call Overlay */}
                {showCall && tokenData && (
                    <div className={`nexus-call-hub ${isMinimized ? 'minimized' : 'expanded'}`}>
                        <div className="hub-header">
                             <div className="hub-info">
                                <span className="live-tag">ENCRYPTED</span>
                                <span>Voice Uplink</span>
                            </div>
                            <div className="hub-actions">
                                <button className="action-btn" onClick={() => setIsMinimized(!isMinimized)}>
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
                                className="w-full h-full"
                            >
                                {isMinimized ? (
                                    <div className="hub-minimized-view px-6 flex items-center gap-4 h-full">
                                        <RoomAudioRenderer />
                                        <div className="audio-wave">
                                            <span></span><span></span><span></span><span></span>
                                        </div>
                                        <span className="voice-active-text uppercase tracking-widest text-[10px]">Sync Active</span>
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

function GroupDiscussion({ group, user }) {
    const { socket } = useSocket()
    const [message, setMessage] = useState('')
    const [realtimeMessages, setRealtimeMessages] = useState([])
    const feedRef = useRef(null)

    // Fetch History
    const { data: history, isLoading } = useQuery({
        queryKey: ['group-messages', group.id],
        queryFn: () => groupsAPI.getMessages(group.id),
        refetchOnWindowFocus: false
    })

    const allMessages = [
        ...(history || []).map(m => ({
            id: m.id,
            user: m.user?.username || 'Unknown',
            text: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            senderId: m.user_id,
        })),
        ...realtimeMessages
    ]

    useEffect(() => {
        if (socket) {
            socket.emit('join_group_room', { groupId: group.id, userId: user.id })
            const handleMsg = (msg) => {
                 if (msg.senderId !== user.id) {
                    setRealtimeMessages(prev => [...prev, msg])
                 }
            }
            socket.on('group_message', handleMsg)
            return () => socket.off('group_message', handleMsg)
        }
    }, [socket, group.id, user.id])

    useEffect(() => {
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
    }, [allMessages.length])

    const handleSend = (e) => {
        e.preventDefault()
        if (!message.trim()) return

        const newMessage = {
            id: Date.now(),
            user: user?.username || 'You',
            text: message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            senderId: user?.id
        }
        setRealtimeMessages(prev => [...prev, newMessage])
        if (socket) socket.emit('send_group_message', { groupId: group.id, message: newMessage })
        setMessage('')
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0f23]/40">
            <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={feedRef}>
                <div className="flex flex-col items-center py-8 opacity-20 select-none pointer-events-none">
                    <FiShield size={48} className="mb-4" />
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black">E2E Encryption Initialized</p>
                </div>
                
                {allMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                        <div className={`max-w-[80%] group ${msg.senderId === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className="flex items-center gap-2 mb-1 px-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${msg.senderId === user?.id ? 'text-blue-400' : 'text-slate-500'}`}>
                                    {msg.senderId === user?.id ? 'MY UPLINK' : msg.user}
                                </span>
                                <span className="text-[9px] opacity-30">{msg.time}</span>
                            </div>
                            <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                                msg.senderId === user?.id 
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-[0_10px_30px_rgba(37,99,235,0.2)]' 
                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <form className="p-6 bg-black/20 border-t border-white/5 flex gap-4" onSubmit={handleSend}>
                <button type="button" className="btn-icon bg-white/5 hover:bg-white/10">
                    <FiPaperclip />
                </button>
                <input 
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                    value={message} 
                    onChange={e => setMessage(e.target.value)} 
                    placeholder="Broadcast to node..." 
                />
                <button type="submit" className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg transition-all active:scale-90">
                    <FiSend />
                </button>
            </form>
        </div>
    )
}

function GroupCollaborativeNotes({ group }) {
    const [notes, setNotes] = useState("## Shared Protocols\n\n- Define project scope\n- Assign roles\n- Outline deliverables")
    return (
        <div className="flex flex-col h-full bg-[#0a0f23]/20">
            <div className="p-6 border-bottom border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FiEdit3 className="text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Collaborative Protocol Draft</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] text-green-500 font-bold">SAVED</span>
                </div>
            </div>
            <textarea 
                className="flex-1 bg-transparent p-10 font-mono text-sm leading-relaxed outline-none resize-none text-slate-300" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
            />
        </div>
    )
}

function GroupFiles({ group }) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-20 text-center space-y-6 opacity-30 select-none">
            <div className="w-32 h-32 rounded-[2rem] bg-slate-800 flex items-center justify-center text-4xl">
                <FiFolder />
            </div>
            <div>
                <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">Asset Vault</h3>
                <p className="text-sm max-w-sm mx-auto">Upload architectural diagrams, resource documents, or binary data to share with other nodes.</p>
            </div>
            <button className="btn btn-secondary px-8 border-white/10 bg-white/5">
                Initialize Upload
            </button>
        </div>
    )
}

function GroupMembers({ group }) {
    const { data: members } = useQuery({ queryKey: ['group-members', group.id], queryFn: () => groupsAPI.getMembers(group.id) })
    return (
        <div className="p-10">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-3">
                <FiUsers />
                <span>Synchronized Nodes ({members?.length || 0})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members?.map(m => (
                    <div key={m.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex items-center gap-6 hover:bg-white/10 transition-all group">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-xl group-hover:scale-110 transition-all">
                            {m.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg text-white mb-1">{m.username}</h4>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{m.role || 'Member'}</span>
                            </div>
                        </div>
                        <button className="btn-icon opacity-0 group-hover:opacity-100 transition-all">
                            <FiMoreVertical />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
