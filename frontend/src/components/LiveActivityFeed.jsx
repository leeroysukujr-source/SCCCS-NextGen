import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditAPI } from '../api/audit'
import { FiActivity, FiRefreshCw, FiZap, FiTrash2, FiPlus, FiEdit, FiUser, FiSettings } from 'react-icons/fi'
import './LiveActivityFeed.css'

export default function LiveActivityFeed({ limit = 10, workspaceId }) {
    const { data, refetch, isLoading, isRefetching } = useQuery({
        queryKey: ['auditLogs', workspaceId],
        queryFn: () => auditAPI.getLogs({ limit, page: 1, per_page: limit }),
        refetchInterval: 10000, // Live update every 10s
    })

    const logs = data?.logs || []

    const getIcon = (action) => {
        const lower = action.toLowerCase()
        if (lower.includes('delete')) return <FiTrash2 />
        if (lower.includes('create') || lower.includes('add')) return <FiPlus />
        if (lower.includes('update') || lower.includes('edit')) return <FiEdit />
        if (lower.includes('login')) return <FiUser />
        return <FiZap />
    }

    const formatTime = (isoString) => {
        if (!isoString) return ''
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="live-activity-feed">
            <header className="feed-header">
                <div className="feed-title">
                    <FiActivity className="title-icon" />
                    <span>Live Activity Feed</span>
                    <div className="live-indicator" title="Live updates active"></div>
                </div>
                <button
                    className={`refresh-btn ${isRefetching ? 'animate-spin' : ''}`}
                    onClick={() => refetch()}
                >
                    <FiRefreshCw /> Refresh
                </button>
            </header>

            <div className="feed-list">
                {isLoading ? (
                    <div className="p-4 text-center text-slate-400">Loading activity...</div>
                ) : logs.length === 0 ? (
                    <div className="empty-feed">No recent activity</div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="feed-item">
                            <div className="item-icon">
                                {getIcon(log.action)}
                            </div>
                            <div className="item-content">
                                <div className="item-text">
                                    <span className="username">{log.username}</span>
                                    <span className="action"> performed </span>
                                    <span className="target">{log.action}</span>
                                </div>
                                <div className="json-snippet">
                                    {JSON.stringify(log.details || {}, null, 0).slice(0, 50)}
                                    {(JSON.stringify(log.details || {}).length > 50) ? '...' : ''}
                                </div>
                            </div>
                            <div className="item-time">
                                {formatTime(log.created_at)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
