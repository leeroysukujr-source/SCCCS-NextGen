import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { roomsAPI } from '../api/rooms'
import { useNavigate } from 'react-router-dom'
import { FiVideo, FiPlay, FiX } from 'react-icons/fi'
import Meeting from '../pages/MeetingEnhanced'

export default function ActiveRooms({ max = 5 }) {
  const navigate = useNavigate()
  const [previewRoom, setPreviewRoom] = useState(null)
  const { data: rooms = [], isLoading, error } = useQuery({
    queryKey: ['rooms', 'active'],
    queryFn: async () => {
      const all = await roomsAPI.getRooms()
      // return only currently active rooms (is_active flag) or recent
      return (all || []).filter(r => r.is_active).slice(0, max)
    },
    staleTime: 10000,
    refetchInterval: 15000,
  })

  if (isLoading) return <div style={{padding:12}}>Loading rooms…</div>
  if (error) return <div style={{padding:12,color:'#c53030'}}>Failed to load rooms</div>

  if (!rooms || rooms.length === 0) {
    return (
      <div style={{padding:12}}>
        <div style={{fontWeight:700, marginBottom:6}}>Active Rooms</div>
        <div style={{color:'#6b7280',fontSize:13}}>No active rooms right now</div>
      </div>
    )
  }

  return (
    <div style={{padding:8}}>
      <div style={{fontWeight:700, marginBottom:8, display:'flex', alignItems:'center', gap:8}}>
        <FiVideo />
        <span>Active Rooms</span>
      </div>
      {rooms.map(room => (
        <div key={room.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'8px 6px',borderRadius:8}}>
          <div style={{flex:1,overflow:'hidden',cursor:'pointer'}} onClick={() => setPreviewRoom(room)}>
            <div style={{fontWeight:600,whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden'}}>{room.name || room.title || `Room ${room.room_code || room.id}`}</div>
            <div style={{fontSize:12,color:'#6b7280'}}>{room.start_time ? new Date(room.start_time).toLocaleString() : (room.room_code ? `Code: ${room.room_code}` : '')}</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button
              className="btn"
              onClick={() => navigate(`/meeting/${room.id}`)}
              title="Open room"
            >
              <FiPlay />
            </button>
          </div>
        </div>
      ))}

      {previewRoom && (
        <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1400}} onClick={() => setPreviewRoom(null)}>
          <div style={{width:'min(1000px,95%)',height:'min(620px,90%)',background:'#fff',borderRadius:12,overflow:'hidden',position:'relative'}} onClick={(e)=>e.stopPropagation()}>
            <button onClick={() => setPreviewRoom(null)} style={{position:'absolute',right:12,top:12,zIndex:10,border:'none',background:'transparent',fontSize:20,cursor:'pointer'}} title="Close preview"><FiX /></button>
            <Meeting roomId={previewRoom.id} />
          </div>
        </div>
      )}
    </div>
  )
}
