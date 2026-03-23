import React, { useState } from 'react'
import '../../pages/VideoBuddy.css'
import './VideoMeeting.css'
import { useQuery } from '@tanstack/react-query'
import { roomsAPI } from '../../api/rooms'
import { useNavigate } from 'react-router-dom'
import Meeting from '../../pages/MeetingEnhanced'
import { useNotify, usePrompt } from '../../components/NotificationProvider'
import { FaSignInAlt, FaExternalLinkAlt, FaWindowMaximize } from 'react-icons/fa'

export default function VideoMeeting(){
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['rooms', 'meeting-list'],
    queryFn: roomsAPI.getRooms,
  })
  const navigate = useNavigate()
  const [inlineRoomId, setInlineRoomId] = useState(null)
  const notify = useNotify()
  const prompt = usePrompt()
  const [inlineReady, setInlineReady] = useState(false)
  const [filter, setFilter] = useState('')

  const handleJoin = async (room) => {
    try {
      if (room && room.id) {
        try { await roomsAPI.joinRoom(room.id) } catch (err) { console.warn(err) }
        return navigate(`/meeting/${room.id}`)
      }
    } catch (err) { console.error('Failed to join room', err); notify('error','Unable to join room') }
  }

  const handleOpen = (room) => {
    try {
      if (room && room.id) return navigate(`/meeting/${room.id}`)
    } catch (err) { console.error(err); notify('error','Unable to open room') }
  }

  const handleOpenInline = (room) => {
    try {
      if (room && room.id) { setInlineRoomId(room.id); setInlineReady(false) }
    } catch (err) { console.error(err); notify('error','Unable to open inline room') }
  }

  const filtered = (rooms || []).filter(r => (r.name || r.title || '').toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="vb-meeting-root">
      <div className="vb-meeting-header">
        <h3>Active & Recent Meetings</h3>
        <div className="vb-meeting-search flex items-center gap-3">
          <button 
            onClick={async () => {
              try {
                const room = await roomsAPI.createRoom({ name: `Meeting ${new Date().toLocaleTimeString()}`, meeting_type: 'instant' });
                navigate(`/meeting/${room.id || room.room_code}`);
              } catch (e) {
                notify('error', 'Failed to create meeting');
              }
            }}
            className="vb-btn-primary py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg"
          >
            + Start Now
          </button>
          <input placeholder="Search meetings..." value={filter} onChange={(e)=>setFilter(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="vb-center">Loading meetings...</div>
      ) : error ? (
        <div className="vb-center">Error loading meetings</div>
      ) : (
        <div className="vb-meeting-grid">
          {filtered.map(r => (
            <div key={r.id || r.room_code} className="vb-meeting-card">
              <div className="vb-meeting-card-inner">
                <div className="vb-card-title flex items-center justify-between">
                  <span>{r.name || r.title || `Meeting ${r.room_code || r.id}`}</span>
                  {(r.participant_count > 0 || r.is_active) && (
                    <span className="live-badge bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                  )}
                </div>
                <div className="vb-card-sub">{r.participant_count ? `${r.participant_count} participants • ` : ''}{r.start_time ? new Date(r.start_time).toLocaleString() : 'Recent'}</div>
                <div className="vb-card-actions">
                  <button className="vb-btn-icon join" onClick={() => handleJoin(r)} title="Join" aria-label="Join">
                    <FaSignInAlt />
                  </button>
                  <button className="vb-btn-icon open" onClick={() => handleOpen(r)} title="Open" aria-label="Open">
                    <FaExternalLinkAlt />
                  </button>
                  <button className="vb-btn-icon inline" onClick={() => handleOpenInline(r)} title="Open inline" aria-label="Open inline">
                    <FaWindowMaximize />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calls are handled inside MeetingEnhanced component */}

      {inlineRoomId && (
        <div className="vb-inline card">
          <div className="vb-inline-header">
            <div>Inline meeting: {inlineRoomId}</div>
            <div>
              <button className="vb-action" onClick={() => setInlineRoomId(null)}>Close</button>
            </div>
          </div>
          {!inlineReady ? (
            <div className="vb-loader-wrap">
              <div className="vb-spinner" />
              <div>Initializing meeting…</div>
            </div>
          ) : null}
          <div style={{display: inlineReady ? 'block' : 'none'}}>
            <Meeting roomId={inlineRoomId} onReady={() => setInlineReady(true)} />
          </div>
        </div>
      )}
    </div>
  )
}
