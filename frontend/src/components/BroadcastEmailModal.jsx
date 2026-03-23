import { useState, useEffect } from 'react'
import { adminAPI } from '../api/admin'
import { FiMail, FiX, FiSend, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import './BroadcastEmailModal.css'

export default function BroadcastEmailModal({ isOpen, onClose }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [recipients, setRecipients] = useState({
    students: false,
    teachers: false,
    cps: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [emailConfig, setEmailConfig] = useState(null)

  useEffect(() => {
    if (isOpen) {
      // Check email config when modal opens
      adminAPI.getEmailConfig()
        .then(config => {
          setEmailConfig(config)
          if (!config.configured) {
            setError('Email server is not configured. Please configure SMTP settings in the backend.')
          }
        })
        .catch(err => {
          console.error('Failed to check email config:', err)
          setError('Failed to check email configuration')
        })
    } else {
      // Reset state when modal closes
      setSubject('')
      setMessage('')
      setRecipients({ students: false, teachers: false, cps: false })
      setError('')
      setSuccess(null)
    }
  }, [isOpen])

  const handleToggleRecipient = (group) => {
    setRecipients(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required')
      return
    }

    const selectedRecipients = Object.keys(recipients).filter(key => recipients[key])
    if (selectedRecipients.length === 0) {
      setError('Please select at least one recipient group')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const result = await adminAPI.broadcastEmail({
        subject: subject.trim(),
        message: message.trim(),
        recipients: selectedRecipients
      })

      setSuccess({
        message: 'Broadcast email sent successfully!',
        sentCount: result.sent_count,
        failedCount: result.failed_count,
        totalRecipients: result.total_recipients
      })
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubject('')
        setMessage('')
        setRecipients({ students: false, teachers: false, cps: false })
        setTimeout(() => {
          onClose()
        }, 500)
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send broadcast email')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay broadcast-email-overlay" onClick={onClose}>
      <div className="broadcast-email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <FiMail className="modal-icon" />
            <h2>Broadcast Email</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {!emailConfig?.configured && (
          <div className="email-config-warning">
            <FiAlertCircle />
            <div>
              <strong>Email server not configured</strong>
              <p>Please configure SMTP settings in your backend .env file to enable email broadcasting.</p>
              <code>
                SMTP_SERVER=smtp.gmail.com<br />
                SMTP_PORT=587<br />
                SMTP_USERNAME=your-email@gmail.com<br />
                SMTP_PASSWORD=your-app-password<br />
                SMTP_FROM_EMAIL=your-email@gmail.com
              </code>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="broadcast-email-form">
          {/* Recipients Selection */}
          <div className="form-group">
            <label>Recipients *</label>
            <div className="recipients-grid">
              <label className="recipient-checkbox">
                <input
                  type="checkbox"
                  checked={recipients.students}
                  onChange={() => handleToggleRecipient('students')}
                  disabled={loading || !emailConfig?.configured}
                />
                <span className="checkmark"></span>
                <div className="recipient-label">
                  <strong>All Students</strong>
                  <span>Send to all active students</span>
                </div>
              </label>

              <label className="recipient-checkbox">
                <input
                  type="checkbox"
                  checked={recipients.teachers}
                  onChange={() => handleToggleRecipient('teachers')}
                  disabled={loading || !emailConfig?.configured}
                />
                <span className="checkmark"></span>
                <div className="recipient-label">
                  <strong>All Teachers/Lecturers</strong>
                  <span>Send to all active teachers</span>
                </div>
              </label>

              <label className="recipient-checkbox">
                <input
                  type="checkbox"
                  checked={recipients.cps}
                  onChange={() => handleToggleRecipient('cps')}
                  disabled={loading || !emailConfig?.configured}
                />
                <span className="checkmark"></span>
                <div className="recipient-label">
                  <strong>CPS Group</strong>
                  <span>Send to CPS members</span>
                </div>
              </label>
            </div>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label htmlFor="subject">Subject *</label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="input"
              disabled={loading || !emailConfig?.configured}
              required
            />
          </div>

          {/* Message */}
          <div className="form-group">
            <label htmlFor="message">Message *</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              className="textarea"
              rows={8}
              disabled={loading || !emailConfig?.configured}
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="alert alert-success">
              <FiCheckCircle />
              <div>
                <strong>{success.message}</strong>
                <p>
                  Sent to {success.sentCount} out of {success.totalRecipients} recipients.
                  {success.failedCount > 0 && ` ${success.failedCount} failed.`}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !emailConfig?.configured}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Sending...
                </>
              ) : (
                <>
                  <FiSend />
                  Send Broadcast Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

