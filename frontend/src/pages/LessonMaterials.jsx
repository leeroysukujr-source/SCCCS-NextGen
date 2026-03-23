import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { lessonsAPI } from '../api/lessons'
import { filesAPI } from '../api/files'
import { classesAPI } from '../api/classes'
import { useAuthStore } from '../store/authStore'
import DocumentViewer from '../components/DocumentViewer'
import AIStudyAssistant from '../components/AIStudyAssistant'
import { FiArrowLeft, FiFile, FiDownload, FiEye, FiZap, FiBook, FiFileText } from 'react-icons/fi'
import './LessonMaterials.css'
import { useNotify } from '../components/NotificationProvider'

export default function LessonMaterials() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [selectedFile, setSelectedFile] = useState(null)
  const [showAI, setShowAI] = useState(false)

  const { data: lesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonsAPI.getLesson(lessonId),
    enabled: !!lessonId,
  })

  const { data: classItem } = useQuery({
    queryKey: ['class', lesson?.class_id],
    queryFn: () => classesAPI.getClass(lesson?.class_id),
    enabled: !!lesson?.class_id,
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['lesson-materials', lessonId],
    queryFn: () => filesAPI.getLessonMaterials(lessonId),
    enabled: !!lessonId,
  })

  // Check if AI should be opened from navigation state
  useEffect(() => {
    if (location.state?.openAI && materials.length > 0) {
      setShowAI(true)
      if (materials[0]) {
        setSelectedFile(materials[0])
      }
    }
  }, [location.state, materials])

  const notify = useNotify()

  const handleOpenFile = async (file) => {
    try {
      setSelectedFile(file)
    } catch (error) {
      console.error('Error opening file:', error)
      notify('error', 'Failed to open file. Please try again.')
    }
  }

  const handleDownload = async (file, event) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      await filesAPI.downloadFile(file.id, file.original_filename || file.filename)
    } catch (error) {
      console.error('Error downloading file:', error)
      // Error message is already shown by downloadFile
    }
  }

  const handleOpenAI = (file) => {
    setSelectedFile(file)
    setShowAI(true)
  }

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FiFile />
    if (mimeType.includes('pdf')) return <FiFileText />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FiFileText />
    if (mimeType.includes('image')) return <FiFile />
    return <FiFile />
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (!lesson) {
    return (
      <div className="lesson-materials-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading lesson...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lesson-materials-page">
      {/* Header */}
      <div className="materials-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        <div className="header-content">
          <h1>{lesson.title}</h1>
          {classItem && <p className="class-name">{classItem.name}</p>}
        </div>
        {materials.length > 0 && (
          <button 
            className="ai-assistant-btn"
            onClick={() => setShowAI(true)}
          >
            <FiZap /> AI Study Assistant
          </button>
        )}
      </div>

      {/* Lesson Info */}
      <div className="lesson-info-card">
        {lesson.description && (
          <div className="info-section">
            <h3>Description</h3>
            <p>{lesson.description}</p>
          </div>
        )}
        {lesson.content && (
          <div className="info-section">
            <h3>Content</h3>
            <div className="content-text" dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </div>
        )}
      </div>

      {/* Materials Section */}
      <div className="materials-section">
        <div className="section-header">
          <h2>
            <FiBook /> Course Materials
          </h2>
          <span className="material-count">{materials.length} file{materials.length !== 1 ? 's' : ''}</span>
        </div>

        {materials.length === 0 ? (
          <div className="empty-materials">
            <FiFileText className="empty-icon" />
            <p>No course materials uploaded yet</p>
          </div>
        ) : (
          <div className="materials-grid">
            {materials.map((file) => (
              <div key={file.id} className="material-card">
                <div className="material-icon">
                  {getFileIcon(file.mime_type)}
                </div>
                <div className="material-info">
                  <h3>{file.original_filename || file.filename}</h3>
                  <div className="material-meta">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{file.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                  </div>
                </div>
                <div className="material-actions">
                  <button
                    className="action-btn view-btn"
                    onClick={() => handleOpenFile(file)}
                    title="View Document"
                  >
                    <FiEye /> View
                  </button>
                  <button
                    className="action-btn ai-btn"
                    onClick={() => handleOpenAI(file)}
                    title="Open with AI Assistant"
                  >
                    <FiZap /> AI
                  </button>
                  <button
                    className="action-btn download-btn"
                    onClick={(e) => handleDownload(file, e)}
                    title="Download"
                  >
                    <FiDownload />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer */}
      {selectedFile && !showAI && (
        <DocumentViewer
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onOpenAI={(file) => handleOpenAI(file)}
        />
      )}

      {/* AI Study Assistant */}
      {showAI && (
        <AIStudyAssistant
          file={selectedFile}
          lesson={lesson}
          classItem={classItem}
          onClose={() => {
            setShowAI(false)
            setSelectedFile(null)
          }}
        />
      )}
    </div>
  )
}

