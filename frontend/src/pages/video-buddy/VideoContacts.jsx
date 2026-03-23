import React, { useState } from 'react'
import '../../pages/VideoBuddy.css'
import './VideoContacts.css'
import { useQuery } from '@tanstack/react-query'
import { usersAPI } from '../../api/users'
import { roomsAPI } from '../../api/rooms'
import { useNavigate } from 'react-router-dom'
import { useNotify } from '../../components/NotificationProvider'

export default function VideoContacts(){
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users', 'contacts'],
    queryFn: usersAPI.getUsers,
  })
  const navigate = useNavigate()
  const notify = useNotify()
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState(null)

  const handleCall = async (user) => {
    try {
      const room = await roomsAPI.createDirectRoom(user.id, 'video')
      if (room && room.id) navigate(`/meeting/${room.id}`)
    } catch (err) {
      console.error('Failed to create direct room:', err)
      notify('error', 'Failed to start direct call')
    }
  }

  const filtered = (users || []).filter(u => (`${u.first_name || ''} ${u.last_name || ''} ${u.username || ''}`).toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="vb-contacts-root">
      <div className="vb-contacts-list card">
        <div className="contacts-search">
          <input placeholder="Search contacts..." value={filter} onChange={(e)=>setFilter(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="vb-center">Loading contacts...</div>
        ) : error ? (
          <div className="vb-center">Error loading contacts</div>
        ) : (
          <div className="contacts-grid">
            {filtered.map(u => (
              <div key={u.id} className={`contact-card ${selected && selected.id===u.id ? 'active' : ''}`} onClick={()=>setSelected(u)}>
                <div className="contact-avatar">{(u.first_name||u.username||'U')[0].toUpperCase()}</div>
                <div className="contact-info">
                  <div className="contact-name">{u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username}</div>
                  <div className="contact-meta">{u.email || u.role || ''}</div>
                </div>
                <div>
                  <button className="vb-action small" onClick={(e)=>{e.stopPropagation(); handleCall(u)}}>Call</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="vb-contacts-detail card">
        {selected ? (
          <div className="contact-detail-inner">
            <div className="detail-top">
              <div className="detail-avatar">{(selected.first_name||selected.username||'U')[0].toUpperCase()}</div>
              <div>
                <h3>{selected.first_name ? `${selected.first_name} ${selected.last_name || ''}`.trim() : selected.username}</h3>
                <div className="contact-meta">{selected.email || 'No email'}</div>
              </div>
            </div>
            <div className="detail-actions">
              <button className="vb-action" onClick={()=>notify('info','Chat feature coming soon')}>Start chat</button>
              <button className="vb-action primary" onClick={()=>handleCall(selected)}>Start meeting</button>
            </div>
            <div className="detail-section">
              <h4>About</h4>
              <p>{selected.bio || 'No bio available.'}</p>
            </div>
          </div>
        ) : (
          <div className="vb-center">Select a contact to see details</div>
        )}
      </div>
    </div>
  )
}
