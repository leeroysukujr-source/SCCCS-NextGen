import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
    FiArrowLeft, FiFileText, FiCheckCircle, FiAlertCircle, 
    FiDownload, FiExternalLink, FiMessageSquare, FiSave,
    FiUser, FiUsers, FiClock, FiActivity, FiSearch, FiFilter,
    FiX, FiMaximize2, FiZoomIn, FiZoomOut
} from 'react-icons/fi'
import { useNotify } from '../components/NotificationProvider'
import apiClient from '../api/client'
import './AssignmentGrading.css'

export default function AssignmentGrading() {
    const { assignmentId } = useParams()
    const navigate = useNavigate()
    const notify = useNotify()
    
    const [assignment, setAssignment] = useState(null)
    const [submissions, setSubmissions] = useState([])
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [loading, setLoading] = useState(true)
    const [grading, setGrading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    
    // Grading Form State
    const [score, setScore] = useState('')
    const [feedback, setFeedback] = useState('')
    const [rubricScores, setRubricScores] = useState({})
    const [previewFile, setPreviewFile] = useState(null)

    useEffect(() => {
        fetchData()
    }, [assignmentId])

    const fetchData = async () => {
        try {
            const [asgRes, subRes] = await Promise.all([
                apiClient.get(`/assignments/${assignmentId}`),
                apiClient.get(`/assignments/${assignmentId}/submissions`)
            ])
            setAssignment(asgRes.data)
            setSubmissions(subRes.data)
            setLoading(false)
        } catch (err) {
            notify('error', 'Failed to fetch grading data')
            setLoading(false)
        }
    }

    const handleSelectSubmission = (sub) => {
        setSelectedSubmission(sub)
        setScore(sub.grade?.score || '')
        setFeedback(sub.grade?.feedback || '')
        try {
            setRubricScores(sub.grade?.rubric_scores || {})
        } catch (e) {
            setRubricScores({})
        }
    }

    const handleGradeSubmit = async () => {
        if (!selectedSubmission) return
        setGrading(true)
        try {
            await apiClient.post(`/assignments/submissions/${selectedSubmission.id}/grade`, {
                score: parseFloat(score),
                feedback,
                rubric_scores: rubricScores,
                publish_to_channel: true // Default to true as per user request
            })
            notify('success', 'Grade published successfully')
            fetchData() // Refresh
            setGrading(false)
        } catch (err) {
            notify('error', 'Failed to publish grade')
            setGrading(false)
        }
    }

    const filteredSubmissions = submissions.filter(s => 
        (s.user_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.group_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (loading) return <div className="grading-loader">Initialising Grading Hub...</div>

    return (
        <div className="assignment-grading-page">
            <header className="grading-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <FiArrowLeft />
                    </button>
                    <div className="header-info">
                        <h1>{assignment?.title}</h1>
                        <span className="subtitle">Grading Command Center</span>
                    </div>
                </div>
                <div className="header-meta">
                    <div className="meta-item">
                        <FiUsers />
                        <span>{submissions.length} Submissions</span>
                    </div>
                    <div className="meta-item">
                        <FiClock />
                        <span>Due: {new Date(assignment?.due_date).toLocaleDateString()}</span>
                    </div>
                </div>
            </header>

            <main className="grading-container">
                {/* Left: Submission List */}
                <aside className="submission-sidebar">
                    <div className="search-box">
                        <FiSearch />
                        <input 
                            type="text" 
                            placeholder="Search students or groups..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="submission-list">
                        {filteredSubmissions.map(sub => (
                            <div 
                                key={sub.id} 
                                className={`submission-item ${selectedSubmission?.id === sub.id ? 'active' : ''} ${sub.grade ? 'graded' : ''}`}
                                onClick={() => handleSelectSubmission(sub)}
                            >
                                <div className="sub-icon">
                                    {sub.group_id ? <FiUsers /> : <FiUser />}
                                </div>
                                <div className="sub-info">
                                    <span className="sub-name">{sub.group_name || sub.user_name}</span>
                                    <span className="sub-date">
                                        {new Date(sub.submitted_at).toLocaleDateString()} 
                                        {sub.status === 'late' && <span className="late-tag">LATE</span>}
                                    </span>
                                </div>
                                {sub.grade && (
                                    <div className="sub-score">
                                        {sub.grade.score}%
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Right: Analysis & Marking Hub */}
                <section className="analysis-hub">
                    {selectedSubmission ? (
                        <div className="hub-content">
                            <div className="analysis-viewer">
                                <div className="viewer-header">
                                    <h2>Submission Analysis</h2>
                                    <div className="submission-type">
                                        {selectedSubmission.group_id ? 'Group Submission' : 'Individual Submission'}
                                    </div>
                                </div>
                                
                                <div className="assets-section">
                                    <h3>Attached Assets</h3>
                                    <div className="assets-grid">
                                        {selectedSubmission.files.map(file => (
                                            <div key={file.id} className="asset-card" onClick={() => setPreviewFile(file)}>
                                                <div className="asset-main">
                                                    <FiFileText className="file-icon" />
                                                    <div className="file-details">
                                                        <span className="file-name">{file.original_filename}</span>
                                                        <span className="file-size">{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                                    </div>
                                                </div>
                                                <div className="asset-actions">
                                                    <a 
                                                        href={`${apiClient.defaults.baseURL}/files/${file.id}?token=${localStorage.getItem('token')}&download=true`} 
                                                        download 
                                                        className="icon-btn"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <FiDownload />
                                                    </a>
                                                    <button 
                                                        className="icon-btn" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewFile(file);
                                                        }}
                                                    >
                                                        <FiMaximize2 />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="content-analysis">
                                    <h3>Summary & Content</h3>
                                    <div className="content-box">
                                        {selectedSubmission.content || "No text content provided."}
                                    </div>
                                </div>
                            </div>

                            <div className="marking-panel">
                                <div className="panel-header">
                                    <FiActivity />
                                    <h2>Evaluative Marking</h2>
                                </div>

                                {assignment?.rubric && assignment.rubric.length > 0 && (
                                    <div className="rubric-section">
                                        <h3>Rubric Criteria</h3>
                                        {assignment.rubric.map(crit => (
                                            <div key={crit.name} className="rubric-item">
                                                <div className="crit-header">
                                                    <span>{crit.name}</span>
                                                    <span className="crit-val">{rubricScores[crit.name] || 0} / {crit.max}</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max={crit.max} 
                                                    value={rubricScores[crit.name] || 0}
                                                    onChange={(e) => setRubricScores({
                                                        ...rubricScores,
                                                        [crit.name]: parseInt(e.target.value)
                                                    })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="final-marking">
                                    <div className="input-group">
                                        <label>Final Score (%)</label>
                                        <input 
                                            type="number" 
                                            placeholder="85" 
                                            value={score}
                                            onChange={(e) => setScore(e.target.value)}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Expert Feedback</label>
                                        <textarea 
                                            placeholder="Provide critical analysis and constructive feedback..."
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        className="publish-btn" 
                                        disabled={grading}
                                        onClick={handleGradeSubmit}
                                    >
                                        {grading ? 'Processing...' : <><FiSave /> Publish Grade & Notify</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-selection">
                            <FiActivity size={48} />
                            <h3>Select a submission to begin analysis</h3>
                            <p>All group and individual nodes will be notified upon publication.</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Premium File Preview Modal */}
            {previewFile && (
                <div className="file-preview-overlay" onClick={() => setPreviewFile(null)}>
                    <div className="preview-container" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-toolbar">
                            <div className="file-info">
                                <FiFileText />
                                <span>{previewFile.original_filename}</span>
                            </div>
                            <div className="toolbar-actions">
                                <a 
                                    href={`${apiClient.defaults.baseURL}/files/${previewFile.id}?token=${localStorage.getItem('token')}&download=true`} 
                                    download 
                                    className="toolbar-btn"
                                >
                                    <FiDownload /> Download
                                </a>
                                <button className="close-btn" onClick={() => setPreviewFile(null)}>
                                    <FiX />
                                </button>
                            </div>
                        </div>
                        <div className="preview-body">
                            {['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(previewFile.original_filename?.split('.').pop()?.toLowerCase()) ? (
                                <img 
                                    src={`${apiClient.defaults.baseURL}/files/${previewFile.id}?token=${localStorage.getItem('token')}`} 
                                    alt={previewFile.original_filename}
                                    className="preview-image"
                                />
                            ) : previewFile.original_filename?.toLowerCase().endsWith('.pdf') ? (
                                <iframe 
                                    src={`${apiClient.defaults.baseURL}/files/${previewFile.id}?token=${localStorage.getItem('token')}#toolbar=0`} 
                                    className="preview-pdf"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="no-preview">
                                    <FiAlertCircle size={48} />
                                    <h3>Advanced Preview Unavailable</h3>
                                    <p>Native browser rendering for this file type is restricted. Please use the download link for manual analysis.</p>
                                    <a 
                                        href={`${apiClient.defaults.baseURL}/files/${previewFile.id}?token=${localStorage.getItem('token')}&download=true`} 
                                        download 
                                        className="fallback-download"
                                    >
                                        <FiDownload /> Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
