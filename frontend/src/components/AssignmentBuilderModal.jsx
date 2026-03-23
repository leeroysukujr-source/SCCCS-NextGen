import { useState, useEffect } from 'react'
import { FiX, FiPlus, FiTrash2, FiClock, FiFileText } from 'react-icons/fi'
import { useNotify } from './NotificationProvider'

export default function AssignmentBuilderModal({ isOpen, onClose, onCreated, channelId }) {
    const notify = useNotify()
    const [loading, setLoading] = useState(false)

    const [assignmentData, setAssignmentData] = useState({
        title: '',
        description: '',
        dueDate: '',
        totalPoints: 100,
        allowLateSubmission: true,
        instructions: ''
    })

    useEffect(() => {
        if (!isOpen) {
            setAssignmentData({
                title: '',
                description: '',
                dueDate: '',
                totalPoints: 100,
                allowLateSubmission: true,
                instructions: ''
            })
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleCreate = async () => {
        if (!assignmentData.title.trim()) {
            notify('error', 'Please provide an assignment title')
            return
        }
        if (!assignmentData.dueDate) {
            notify('error', 'Please set a due date')
            return
        }

        setLoading(true)
        try {
            // We will emit this as a structured message
            const payload = {
                content: JSON.stringify({
                    ...assignmentData,
                    type: 'assignment_details'
                }),
                message_type: 'assignment_card',
                channel_id: channelId
            }

            onCreated(payload)
            setLoading(false)
            onClose()
        } catch (err) {
            console.error('Failed to create assignment:', err)
            notify('error', 'Failed to generate assignment card')
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="create-chatroom-modal assignment-builder" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                <div className="modal-header">
                    <div className="header-icon academic"><FiFileText /></div>
                    <div>
                        <h2>Assignment Builder</h2>
                        <p className="modal-subtitle">Create a structured task for your students</p>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Assignment Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Mid-term Research Project"
                            value={assignmentData.title}
                            onChange={(e) => setAssignmentData({ ...assignmentData, title: e.target.value })}
                            className="form-input"
                        />
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Due Date & Time</label>
                            <div className="input-with-icon">
                                <FiClock className="inner-icon" />
                                <input
                                    type="datetime-local"
                                    value={assignmentData.dueDate}
                                    onChange={(e) => setAssignmentData({ ...assignmentData, dueDate: e.target.value })}
                                    className="form-input with-icon"
                                />
                            </div>
                        </div>
                        <div className="form-group" style={{ width: '120px' }}>
                            <label>Total Points</label>
                            <input
                                type="number"
                                value={assignmentData.totalPoints}
                                onChange={(e) => setAssignmentData({ ...assignmentData, totalPoints: parseInt(e.target.value) })}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Short Description</label>
                        <input
                            type="text"
                            placeholder="Brief summary of the assignment"
                            value={assignmentData.description}
                            onChange={(e) => setAssignmentData({ ...assignmentData, description: e.target.value })}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Detailed Instructions</label>
                        <textarea
                            rows={5}
                            placeholder="Provide step-by-step instructions or requirements..."
                            value={assignmentData.instructions}
                            onChange={(e) => setAssignmentData({ ...assignmentData, instructions: e.target.value })}
                            className="form-textarea"
                        />
                    </div>

                    <div className="form-checkbox">
                        <input
                            type="checkbox"
                            id="lateSub"
                            checked={assignmentData.allowLateSubmission}
                            onChange={(e) => setAssignmentData({ ...assignmentData, allowLateSubmission: e.target.checked })}
                        />
                        <label htmlFor="lateSub">Allow late submissions (penalty apply?)</label>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                        {loading ? <div className="loading-spinner-small"></div> : 'Publish Assignment'}
                    </button>
                </div>
            </div>
        </div>
    )
}
