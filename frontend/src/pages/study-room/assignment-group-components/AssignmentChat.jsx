import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useSocket } from '../../../contexts/SocketProvider';
import { FiSend, FiPaperclip, FiSmile, FiShield, FiUsers } from 'react-icons/fi';
import { groupsAPI } from '../../../api/groups';
import { getFullImageUrl } from '../../../utils/api';
import './AssignmentChat.css';

export default function AssignmentChat({ groupId }) {
    const { user } = useAuthStore();
    const { socket, status } = useSocket();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const scrollRef = useRef();

    useEffect(() => {
        // Fetch existing messages
        groupsAPI.getAssignmentGroupMessages(groupId).then(data => {
            if (Array.isArray(data)) setMessages(data);
        }).catch(err => console.error("Failed to fetch messages", err));

        if (!socket) return;

        socket.emit('join_assignment_group', { groupId });

        const handleNewMessage = (msg) => {
            if (msg.group_id === parseInt(groupId)) {
                setMessages(prev => [...prev, msg]);
            }
        };

        socket.on('asg_message_received', handleNewMessage);

        return () => {
            socket.off('asg_message_received', handleNewMessage);
        };
    }, [groupId, socket]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const msgData = {
            groupId,
            message: { text: newMessage }
        };

        socket.emit('send_assignment_group_message', msgData);
        setNewMessage('');
    };

    return (
        <div className="assignment-chat-premium">
            <div className="chat-header-info">
                <div className="info-left">
                    <FiShield className="text-indigo-400" />
                    <span>Secure Tactical Channel</span>
                </div>
                <div className={`status-indicator ${status}`}>
                    <div className="dot"></div>
                    <span>{status.toUpperCase()}</span>
                </div>
            </div>

            <div className="chat-messages-scroll custom-scrollbar">
                {messages.length === 0 && (
                    <div className="empty-chat-state">
                        <FiUsers size={40} className="opacity-20 mb-4" />
                        <p>No transmissions yet. Field agents are standing by.</p>
                    </div>
                )}
                {messages.map((msg, idx) => {
                    const isOwn = msg.user_id === user.id;
                    return (
                        <div key={msg.id || idx} className={`msg-block ${isOwn ? 'own' : 'other'}`}>
                            <div className="msg-avatar">
                                {msg.user?.avatar_url ? (
                                    <img src={getFullImageUrl(msg.user.avatar_url)} alt="" />
                                ) : (
                                    <div className="avatar-letter">{msg.user?.first_name?.[0] || msg.user?.username?.[0] || '?'}</div>
                                )}
                            </div>
                            <div className="msg-content-wrapper">
                                <div className="msg-meta">
                                    <span className="author">{msg.user?.first_name || msg.user?.username}</span>
                                    <span className="time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="msg-bubble">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            <form className="chat-input-premium" onSubmit={handleSendMessage}>
                <div className="input-actions-left">
                    <button type="button" className="action-icn"><FiPaperclip /></button>
                </div>
                <input
                    type="text"
                    placeholder="Enter command or message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <div className="input-actions-right">
                    <button type="button" className="action-icn"><FiSmile /></button>
                    <button type="submit" className="send-btn-nexus" disabled={!newMessage.trim() || !socket}>
                        <FiSend />
                    </button>
                </div>
            </form>
        </div>
    );
}
