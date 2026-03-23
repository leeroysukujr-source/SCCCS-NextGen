import { useState, useEffect } from 'react'
import { FiX, FiTrash2 } from 'react-icons/fi'
import { messagesAPI } from '../api/messages'
import { useNotify } from './NotificationProvider'

export default function ScheduledMessagesModal({ isOpen, onClose, channelId }) {
  const notify = useNotify()
  const [loading, setLoading] = useState(false)
  const [scheduled, setScheduled] = useState([])

  const fetchScheduled = async () => {
    if (!channelId) return
    setLoading(true)
    try {
      const res = await messagesAPI.getScheduledMessages(channelId)
      setScheduled(res || [])
    } catch (err) {
      console.error('Failed to fetch scheduled messages:', err)
      notify('error', 'Failed to load scheduled messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchScheduled()
  }, [isOpen, channelId])

  if (!isOpen) return null

  const handleCancel = async (id) => {
    if (!confirm('Cancel this scheduled message?')) return
    try {
      await messagesAPI.cancelScheduledMessage(id)
      notify('success', 'Scheduled message cancelled')
      fetchScheduled()
    } catch (err) {
      console.error('Cancel failed:', err)
      notify('error', 'Failed to cancel scheduled message')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-chatroom-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth:720}}>
        <div className="modal-header">
          <h2>Scheduled Messages</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div>Loading...</div>
          ) : scheduled.length === 0 ? (
            <div style={{padding:20}}>No scheduled messages for this channel.</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {scheduled.map(s => (
                <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:10,background:'#fbfdff',borderRadius:6}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600}}>{s.content || '[Attachment]'} {s.message_type === 'voice' && <em style={{marginLeft:6}}>· Voice</em>}</div>
                    <div style={{fontSize:12,color:'#666',marginTop:4}}>{new Date(s.scheduled_for).toLocaleString()}</div>
                    {s.file_ids && s.file_ids.length > 0 && (
                      <div style={{marginTop:6,fontSize:12,color:'#444'}}>Attachments: {Array.isArray(s.file_ids) ? s.file_ids.join(', ') : s.file_ids}</div>
                    )}
                  </div>
                  <div style={{marginLeft:12}}>
                    <button className="btn btn-danger" onClick={() => handleCancel(s.id)} title="Cancel scheduled message"><FiTrash2 /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
