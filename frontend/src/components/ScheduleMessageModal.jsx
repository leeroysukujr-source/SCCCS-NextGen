import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import { filesAPI } from '../api/files'
import { messagesAPI } from '../api/messages'
import { directMessagesAPI } from '../api/directMessages'
import { useNotify } from './NotificationProvider'

export default function ScheduleMessageModal({ isOpen, onClose, initialContent = '', selectedFiles = [], channelId, onScheduled, isDirectMessage = false, recipientId }) {
  const notify = useNotify()
  const [content, setContent] = useState(initialContent)
  const [scheduledFor, setScheduledFor] = useState('') // ISO local datetime string
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setContent(initialContent || '')
    setScheduledFor('')
  }, [isOpen, initialContent])

  if (!isOpen) return null

  const uploadFilesIfNeeded = async () => {
    const fileIds = []
    for (const f of selectedFiles || []) {
      // If already uploaded server file object (has id), keep it
      if (f && (f.id || f.file_id)) {
        fileIds.push(f.id || f.file_id)
        continue
      }

      // Otherwise, expected to be a File/Blob - upload it
      try {
        const uploaded = await filesAPI.uploadFile(f, channelId)
        if (uploaded && uploaded.id) fileIds.push(uploaded.id)
      } catch (err) {
        console.error('File upload failed during scheduling:', err)
        throw err
      }
    }
    return fileIds
  }

  const handleSchedule = async () => {
    if (!content || !content.trim()) {
      notify('error', 'Message content cannot be empty')
      return
    }
    if (!scheduledFor) {
      notify('error', 'Please choose a date and time to schedule the message')
      return
    }

    setLoading(true)
    try {
      const fileIds = await uploadFilesIfNeeded()

      const payload = {
        content: content.trim(),
        message_type: 'text',
        scheduled_for: new Date(scheduledFor).toISOString(),
        file_ids: fileIds,
      }

      let res
      if (isDirectMessage) {
        if (!recipientId) throw new Error('Recipient ID required for DM scheduling')
        res = await directMessagesAPI.scheduleMessage(recipientId, payload)
      } else {
        res = await messagesAPI.scheduleMessage(channelId, payload)
      }
      notify('success', 'Message scheduled')
      setLoading(false)
      onScheduled && onScheduled(res)
      onClose()
    } catch (err) {
      console.error('Scheduling failed:', err)
      notify('error', err?.response?.data?.error || 'Failed to schedule message')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-chatroom-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>Schedule Message</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Message</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="form-textarea" />
          </div>

          <div className="form-group">
            <label>Send At</label>
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="form-input" />
            <p className="form-hint">Times are interpreted in your local timezone.</p>
          </div>

          {selectedFiles && selectedFiles.length > 0 && (
            <div className="form-group">
              <label>Attachments</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedFiles.map((f, idx) => (
                  <div key={idx} style={{ padding: 6, background: '#f4f6f8', borderRadius: 6 }}>
                    {f.name || f.filename || `File ${idx + 1}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSchedule} disabled={loading}>
            {loading ? <div className="loading-spinner-small"></div> : 'Schedule Message'}
          </button>
        </div>
      </div>
    </div>
  )
}
