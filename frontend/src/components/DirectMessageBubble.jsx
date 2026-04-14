import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMoreVertical, FiHeart, FiCornerUpLeft, FiShare2, FiCopy, FiEdit2, FiTrash2, FiSmile, FiDownload, FiFile, FiImage, FiVideo, FiPaperclip } from 'react-icons/fi'
import { useAuthStore } from '../store/authStore'
import { filesAPI } from '../api/files'
import VoicePlayer from './VoicePlayer'

const DirectMessageBubble = ({
    message,
    listIndex,
    previousMessage,
    nextMessage,
    onReply,
    onEdit,
    onDelete,
    onReact,
    onCopy,
    onForward,
    reactions
}) => {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [showMenu, setShowMenu] = useState(false)

    const isOwn = message.sender_id === user?.id

    // Grouping logic
    const isGrouped = previousMessage && previousMessage.sender_id === message.sender_id &&
        new Date(message.created_at) - new Date(previousMessage.created_at) < 300000 // 5 mins

    const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id ||
        new Date(nextMessage.created_at) - new Date(message.created_at) > 300000

    // Date divider logic
    const showDate = !previousMessage ||
        new Date(message.created_at).toDateString() !== new Date(previousMessage.created_at).toDateString()

    // Avatar logic
    const showAvatar = !isOwn && (!previousMessage || previousMessage.sender_id !== message.sender_id || !isGrouped)

    // Call notification check
    const isCallNotification = message.message_type &&
        ['call_started', 'call_ended', 'call_missed', 'call_answered'].includes(message.message_type)

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const formatCallDuration = (seconds) => {
        if (!seconds) return ''
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const getFileIcon = (file) => {
        if (file.mime_type?.startsWith('image/')) return <FiImage />
        if (file.mime_type?.startsWith('video/')) return <FiVideo />
        return <FiFile />
    }

    if (isCallNotification) {
        return (
            <div className="message-row">
                {showDate && (
                    <div className="date-divider">
                        <span>{new Date(message.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                )}
                <div className="call-notification-message">
                    <div className="call-notification-content">
                        <span className="call-icon">
                            {message.message_type === 'call_started' && '📞'}
                            {message.message_type === 'call_answered' && '✅'}
                            {message.message_type === 'call_ended' && '📞'}
                            {message.message_type === 'call_missed' && '❌'}
                        </span>
                        <span>
                            {message.content}
                            {message.call_duration && message.message_type === 'call_ended' && (
                                <span className="call-duration"> • {formatCallDuration(message.call_duration)}</span>
                            )}
                        </span>
                        <span className="call-time">{formatTime(message.created_at)}</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="message-row">
            {showDate && (
                <div className="date-divider">
                    <span>{new Date(message.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
            )}

            <div className={`message-wrapper ${isOwn ? 'own' : 'other'} ${isGrouped ? 'grouped' : 'not-grouped'} ${isLastInGroup ? 'last-in-group' : ''}`}>

                {/* Avatar (Left side only) */}
                {!isOwn && (
                    <div className="message-avatar">
                        {showAvatar ? (
                            message.sender?.avatar_url ? (
                                <img
                                    src={message.sender.avatar_url}
                                    alt={message.sender.username}
                                    onClick={() => navigate(`/profile/${message.sender_id}`)}
                                    style={{ cursor: 'pointer' }}
                                />
                            ) : (
                                <div
                                    className="avatar-placeholder"
                                    onClick={() => navigate(`/profile/${message.sender_id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {message.sender?.first_name?.[0] || 'U'}
                                </div>
                            )
                        ) : (
                            <div className="message-avatar-spacer" />
                        )}
                    </div>
                )}

                <div className="message-content-container">
                    {/* Sender Name (First in group, other person) */}
                    {!isOwn && !isGrouped && (
                        <div className="message-sender-name">
                            {message.sender?.first_name || message.sender?.username}
                        </div>
                    )}

                    {/* Reply Preview */}
                    {message.reply_to && (
                        <div className="reply-preview-display" onClick={() => {
                            const el = document.getElementById(`msg-${message.reply_to.id}`)
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}>
                            <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: 2 }}>
                                {message.reply_to.sender?.first_name || 'User'}
                            </div>
                            <div style={{ fontStyle: 'italic', opacity: 0.8 }}>
                                {message.reply_to.content?.substring(0, 50) || 'Attachment'}
                            </div>
                        </div>
                    )}

                    <div
                        id={`msg-${message.id}`}
                        className={`message-bubble ${isOwn ? 'own' : 'other'}`}
                    >
                        {/* Message Actions (Hover) */}
                        <div className="message-actions">
                            <div className="action-icon" onClick={() => onReact(message, '❤️')} title="Like">
                                <FiHeart size={14} />
                            </div>
                            <div className="action-icon" onClick={() => onReply(message)} title="Reply">
                                <FiCornerUpLeft size={14} />
                            </div>
                            <div className="action-icon" onClick={() => onCopy(message)} title="Copy">
                                <FiCopy size={14} />
                            </div>
                            {isOwn && (
                                <>
                                    <div className="action-icon" onClick={() => onEdit(message)} title="Edit">
                                        <FiEdit2 size={14} />
                                    </div>
                                    <div className="action-icon" onClick={() => onDelete(message)} title="Delete" style={{ color: 'var(--dm-danger)' }}>
                                        <FiTrash2 size={14} />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Content */}
                        {message.content && String(message.content).trim().toLowerCase() !== '[file]' && (
                            <div className="message-text">
                                {message.content}
                            </div>
                        )}

                        {/* Voice Player */}
                        {(message.message_type === 'voice' || (message.attachments?.length > 0 && (message.attachments[0].mime_type?.startsWith('audio/') || message.attachments[0].original_filename?.match(/\.(webm|mp3|wav|m4a|ogg)$/i)))) && (
                            <div className="voice-message-container" style={{ marginTop: '4px' }}>
                                <VoicePlayer url={filesAPI.getFileUrl(message.attachments[0].id)} />
                            </div>
                        )}

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 &&
                            message.message_type !== 'voice' &&
                            !message.attachments[0].mime_type?.startsWith('audio/') &&
                            !message.attachments[0].original_filename?.match(/\.(webm|mp3|wav|m4a|ogg)$/i) && (
                                <div className="message-attachments" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {message.attachments.map(file => {
                                        const fileUrl = filesAPI.getFileUrl(file.id)
                                        const isImage = file.mime_type?.startsWith('image/')
                                        const isVideo = file.mime_type?.startsWith('video/')

                                        if (isImage) {
                                            return (
                                                <div key={file.id} className="attachment-media" style={{ borderRadius: '12px', overflow: 'hidden', width: 'fit-content', maxWidth: '100%', minWidth: '150px' }}>
                                                    <img
                                                        src={fileUrl}
                                                        alt={file.original_filename}
                                                        style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain', display: 'block', cursor: 'pointer' }}
                                                        onClick={() => window.open(fileUrl, '_blank')}
                                                    />
                                                </div>
                                            )
                                        }

                                        if (isVideo) {
                                            return (
                                                <div key={file.id} className="attachment-media" style={{ borderRadius: '12px', overflow: 'hidden', width: 'fit-content', maxWidth: '100%', minWidth: '150px' }}>
                                                    <video
                                                        src={fileUrl}
                                                        controls
                                                        style={{ width: '100%', height: 'auto', maxHeight: '400px', display: 'block' }}
                                                    />
                                                </div>
                                            )
                                        }

                                        return (
                                            <div key={file.id} className="attachment-file-card"
                                                onClick={() => window.open(fileUrl, '_blank')}
                                                style={{
                                                    background: isOwn ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    width: '100%',
                                                    minWidth: 'auto',
                                                    maxWidth: '320px',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                    cursor: 'pointer'
                                                }}>
                                                {/* Card Header (File Info) */}
                                                <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '42px', height: '42px',
                                                        background: '#10B981', color: 'white',
                                                        borderRadius: '8px', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '1.4rem', flexShrink: 0
                                                    }}>
                                                        {file.original_filename?.match(/\.(xlsx|xls|csv)$/i) ? <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>X</span> :
                                                            file.original_filename?.match(/\.(pdf)$/i) ? <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>PDF</span> :
                                                                file.original_filename?.match(/\.(doc|docx)$/i) ? <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>W</span> :
                                                                    <FiFile />}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isOwn ? 'white' : '#1F2937' }}>
                                                            {file.original_filename}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', marginTop: '2px', color: isOwn ? 'rgba(255,255,255,0.9)' : '#6B7280' }}>
                                                            {file.original_filename?.split('.').pop()} • {formatFileSize(file.file_size)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Footer Removed - One-click view enabled on card container */}

                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                        {/* Footer */}
                        <div className="message-footer">
                            <span className="message-time">
                                {formatTime(message.created_at)}
                            </span>
                            {message.is_edited && <span className="edited-flag">(edited)</span>}
                            {isOwn && (
                                <span className="read-status" title={message.is_read ? "Read" : "Sent"}>
                                    {message.is_read ? '✓✓' : '✓'}
                                </span>
                            )}
                        </div>

                        {/* Reactions */}
                        {reactions && Object.keys(reactions).length > 0 && (
                            <div className="message-reactions">
                                {Object.entries(reactions).map(([emoji, users]) => (
                                    <div
                                        key={emoji}
                                        className="reaction-badge"
                                        onClick={() => onReact && onReact(message, emoji)}
                                    >
                                        <span>{emoji}</span>
                                        <span className="count">{users.length}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DirectMessageBubble
