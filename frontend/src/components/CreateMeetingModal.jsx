import { useState, useRef } from 'react'
import { FiX, FiVideo, FiCalendar, FiClock, FiUsers, FiLock, FiGlobe } from 'react-icons/fi'
import './CreateMeetingModal.css'
import { useNotify } from './NotificationProvider'

export default function CreateMeetingModal({ isOpen, onClose, onCreate, isScheduled = false }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(100)
  const [meetingType, setMeetingType] = useState(isScheduled ? 'scheduled' : 'instant')
  const [privacy, setPrivacy] = useState('private')
  const [duration, setDuration] = useState(60)

  const notify = useNotify()

  const handleCreate = () => {
    if (!name.trim()) {
      notify('error', 'Please enter a meeting name')
      return
    }

    if (meetingType === 'scheduled' && !scheduledAt) {
      notify('error', 'Please select a scheduled date and time')
      return
    }

    const meetingData = {
      name: name.trim(),
      description: description.trim(),
      meeting_type: meetingType,
      max_participants: maxParticipants,
      scheduled_at: meetingType === 'scheduled' ? scheduledAt : null,
      privacy: privacy,
      duration_minutes: duration
    }

    onCreate(meetingData)

    // Reset form
    setName('')
    setDescription('')
    setScheduledAt('')
    setMaxParticipants(100)
    setMeetingType(isScheduled ? 'scheduled' : 'instant')
    setDuration(60)
  }

  const scheduledRef = useRef(null)

  if (!isOpen) return null

  const minDateTime = new Date().toISOString().slice(0, 16)

  const openDatePicker = () => {
    try {
      // Prefill with now if empty
      if (!scheduledAt) {
        const now = new Date()
        // round up to next 15 minutes
        const mins = Math.ceil(now.getMinutes() / 15) * 15
        now.setMinutes(mins)
        now.setSeconds(0)
        const iso = now.toISOString().slice(0, 16)
        setScheduledAt(iso)
      }
      const input = scheduledRef.current
      if (input && typeof input.showPicker === 'function') {
        input.showPicker()
      } else if (input) {
        input.focus()
        // On browsers without showPicker, focusing will open the native picker on some devices
      }
    } catch (e) {
      console.warn('Date picker open failed', e)
      if (scheduledRef.current) scheduledRef.current.focus()
    }
  }

  const toLocalDateTimeInput = (date) => {
    // Convert a Date to a local datetime-local input value (YYYY-MM-DDTHH:MM)
    const tzOffset = date.getTimezoneOffset() * 60000
    const local = new Date(date.getTime() - tzOffset)
    return local.toISOString().slice(0, 16)
  }

  const applyPreset = (minutesOffset = 0, presetFn = null) => {
    let d
    if (typeof presetFn === 'function') d = presetFn()
    else d = new Date(Date.now() + minutesOffset * 60000)
    // round to next 5 minutes for nicer UX
    d.setSeconds(0)
    d.setMilliseconds(0)
    const mins = d.getMinutes()
    const round5 = Math.ceil(mins / 5) * 5
    d.setMinutes(round5)
    setScheduledAt(toLocalDateTimeInput(d))
    // focus the input so the user sees the value
    if (scheduledRef.current) scheduledRef.current.focus()
  }

  const presets = [
    { id: 'in15', label: 'In 15 min', handler: () => applyPreset(15) },
    { id: 'in60', label: 'In 1 hour', handler: () => applyPreset(60) },
    {
      id: 'tom9', label: 'Tomorrow 9:00', handler: () => applyPreset(0, () => {
        const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(9, 0, 0, 0); return t
      })
    },
    {
      id: 'nextMon9', label: 'Next Mon 9:00', handler: () => applyPreset(0, () => {
        const t = new Date(); const day = t.getDay(); const daysUntilMon = (8 - day) % 7 || 7; t.setDate(t.getDate() + daysUntilMon); t.setHours(9, 0, 0, 0); return t
      })
    }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-meeting-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {meetingType === 'scheduled' ? (
              <>
                <FiCalendar /> Schedule Meeting
              </>
            ) : (
              <>
                <FiVideo /> Create Meeting
              </>
            )}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Meeting Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter meeting name"
              className="form-input"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this meeting about?"
              className="form-textarea"
              rows="3"
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label>Meeting Type</label>
            <div className="meeting-type-options">
              <button
                className={`meeting-type-option ${meetingType === 'instant' ? 'active' : ''}`}
                onClick={() => setMeetingType('instant')}
              >
                <FiVideo />
                <div>
                  <strong>Instant</strong>
                  <p>Start immediately</p>
                </div>
              </button>
              <button
                className={`meeting-type-option ${meetingType === 'scheduled' ? 'active' : ''}`}
                onClick={() => setMeetingType('scheduled')}
              >
                <FiCalendar />
                <div>
                  <strong>Scheduled</strong>
                  <p>Plan for later</p>
                </div>
              </button>
            </div>
          </div>

          {meetingType === 'scheduled' && (
            <div className="form-group">
              <label>Scheduled Date & Time *</label>
              <div className="datetime-input">
                <input
                  ref={scheduledRef}
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="form-input"
                  min={minDateTime}
                />
                <button type="button" className="calendar-btn" onClick={openDatePicker} title="Pick date & time">
                  <FiCalendar />
                </button>
              </div>

              <div className="preset-row">
                {presets.map(p => (
                  <button key={p.id} type="button" className="preset-btn" onClick={p.handler} title={p.label}>
                    <FiClock /> {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Maximum Participants</label>
            <div className="participants-input">
              <FiUsers />
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                className="form-input"
                min="1"
                max="1000"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Duration (minutes)</label>
            <div className="participants-input">
              <FiClock />
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 60))}
                className="form-input"
                min="1"
                max="1440"
              />
            </div>
            <div className="preset-row" style={{ marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[15, 30, 45, 60, 90, 120].map(m => (
                <button key={m} type="button" className={`preset-btn ${duration === m ? 'active' : ''}`} onClick={() => setDuration(m)} style={{ opacity: duration === m ? 1 : 0.7, border: duration === m ? '1px solid var(--primary)' : '' }}>
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Privacy</label>
            <div className="privacy-options">
              <button
                className={`privacy-option ${privacy === 'private' ? 'active' : ''}`}
                onClick={() => setPrivacy('private')}
              >
                <FiLock />
                <div>
                  <strong>Private</strong>
                  <p>Only invited participants</p>
                </div>
              </button>
              <button
                className={`privacy-option ${privacy === 'public' ? 'active' : ''}`}
                onClick={() => setPrivacy('public')}
              >
                <FiGlobe />
                <div>
                  <strong>Public</strong>
                  <p>Anyone with link can join</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            {meetingType === 'scheduled' ? (
              <>
                <FiCalendar /> Schedule Meeting
              </>
            ) : (
              <>
                <FiVideo /> Create Meeting
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

