import React, { useState, useEffect } from 'react'
import { 
    FiUpload, FiFile, FiCheck, FiClock, FiAlertCircle, 
    FiMessageSquare, FiPaperclip, FiX, FiSend
} from 'react-icons/fi'
import apiClient from '../../../api/client'
import { useNotify } from '../../../components/NotificationProvider'
import './AssignmentSubmission.css'

export default function AssignmentSubmission({ assignmentId, groupId }) {
    const [submission, setSubmission] = useState(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [content, setContent] = useState('')
    const [files, setFiles] = useState([])
    const notify = useNotify()

    useEffect(() => {
        fetchSubmission()
    }, [assignmentId])

    const fetchSubmission = async () => {
        try {
            const res = await apiClient.get(`/assignments/${assignmentId}/my-submission`)
            setSubmission(res.data)
            setContent(res.data.content || '')
            setLoading(false)
        } catch (err) {
            // 404 is fine, means no submission yet
            setLoading(false)
        }
    }

    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files)
        setUploading(true)
        
        try {
            const uploadedFileIds = []
            for (const file of selectedFiles) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('assignment_id', assignmentId)
                if (groupId) formData.append('group_id', groupId)
                
                const res = await apiClient.post('/files/upload', formData)
                uploadedFileIds.push(res.data.id)
            }
            
            setFiles([...files, ...selectedFiles.map((f, i) => ({ 
                id: uploadedFileIds[i], 
                name: f.name,
                size: f.size
            }))])
            
            notify('success', `Uploaded ${selectedFiles.length} files`)
        } catch (err) {
            notify('error', 'File upload failed')
        } finally {
            setUploading(false)
        }
    }

    const removeFile = (id) => {
        setFiles(files.filter(f => f.id !== id))
    }

    const handleSubmit = async () => {
        try {
            const res = await apiClient.post(`/assignments/${assignmentId}/submit`, {
                content,
                file_ids: files.map(f => f.id),
                group_id: groupId
            })
            setSubmission(res.data)
            notify('success', 'Mission Accomplished: Assignment Submitted')
        } catch (err) {
            notify('error', 'Submission failed. Check your uplink.')
        }
    }

    if (loading) return <div className="submission-loading">Syncing submission data...</div>

    return (
        <div className="assignment-submission-container">
            {submission ? (
                <div className="submission-status-card">
                    <div className="status-header">
                        <div className={`status-badge ${submission.status}`}>
                            {submission.status === 'late' ? <FiAlertCircle /> : <FiCheck />}
                            <span>{submission.status.toUpperCase()}</span>
                        </div>
                        <span className="submitted-at">
                            On {new Date(submission.submitted_at).toLocaleString()}
                        </span>
                    </div>

                    {submission.grade ? (
                        <div className="grade-report">
                            <div className="grade-header">
                                <div className="score-circle">
                                    <span className="score">{submission.grade.score}%</span>
                                    <span className="label">Grade</span>
                                </div>
                                <div className="feedback-section">
                                    <h3>Lecturer Analysis</h3>
                                    <p>{submission.grade.feedback || "Excellent work on this mission."}</p>
                                </div>
                            </div>
                            
                            {submission.grade.rubric_scores && Object.keys(submission.grade.rubric_scores).length > 0 && (
                                <div className="rubric-summary">
                                    <h4>Rubric Breakdown</h4>
                                    <div className="rubric-grid">
                                        {Object.entries(submission.grade.rubric_scores).map(([key, val]) => (
                                            <div key={key} className="rubric-pill">
                                                <span className="crit-name">{key}</span>
                                                <span className="crit-val">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="awaiting-grade">
                            <FiClock />
                            <p>Uplink active. Awaiting lecturer analysis and marking...</p>
                        </div>
                    )}
                    
                    <div className="submitted-content">
                        <h3>Your Submission</h3>
                        <p className="sub-content-preview">{submission.content}</p>
                        <div className="sub-files-list">
                            {submission.files?.map(f => (
                                <div key={f.id} className="sub-file-item">
                                    <FiFile />
                                    <span>{f.original_filename}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="submission-form">
                    <div className="form-section">
                        <h3><FiMessageSquare /> Content & Comments</h3>
                        <textarea 
                            placeholder="Add your analysis, notes, or direct answers here..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="form-section">
                        <h3><FiPaperclip /> Supporting Assets</h3>
                        <div className="file-uplink-zone">
                            <input 
                                type="file" 
                                multiple 
                                id="file-upload" 
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <label htmlFor="file-upload" className="upload-btn">
                                {uploading ? 'Uploading...' : <><FiUpload /> Ingest Files</>}
                            </label>
                        </div>

                        <div className="queued-files">
                            {files.map(f => (
                                <div key={f.id} className="queued-file">
                                    <FiFile />
                                    <span className="name">{f.name}</span>
                                    <button onClick={() => removeFile(f.id)}><FiX /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button 
                        className="final-submit-btn"
                        onClick={handleSubmit}
                        disabled={uploading || (!content && files.length === 0)}
                    >
                        <FiSend /> Submit to Vault
                    </button>
                </div>
            )}
        </div>
    )
}
