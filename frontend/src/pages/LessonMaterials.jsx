import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { lessonsAPI } from '../api/lessons'
import { filesAPI } from '../api/files'
import { classesAPI } from '../api/classes'
import { useAuthStore } from '../store/authStore'
import DocumentViewer from '../components/DocumentViewer'
import AIStudyAssistant from '../components/AIStudyAssistant'
import { FiArrowRight, FiFile, FiDownload, FiEye, FiZap, FiBook, FiFileText, FiUpload, FiTrash2, FiPlus } from 'react-icons/fi'
import './LessonMaterials.css'
import { useNotify, useConfirm } from '../components/NotificationProvider'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function LessonMaterials() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showAI, setShowAI] = useState(false)
  const [uploading, setUploading] = useState(false)
  const notify = useNotify()
  const confirm = useConfirm()

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

  useEffect(() => {
    if (location.state?.openAI && materials.length > 0) {
      setShowAI(true)
      if (materials[0]) {
        setSelectedFile(materials[0])
      }
    }
  }, [location.state, materials])

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      return await filesAPI.uploadFile(file, null, null, lessonId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lesson-materials', lessonId])
      queryClient.invalidateQueries(['lesson', lessonId])
      setUploading(false)
      notify('success', 'File uploaded successfully')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error) => {
      console.error('Upload error:', error)
      notify('error', error.response?.data?.error || 'Failed to upload file')
      setUploading(false)
    }
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileId) => filesAPI.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries(['lesson-materials', lessonId])
      queryClient.invalidateQueries(['lesson', lessonId])
      notify('success', 'File deleted successfully')
    },
    onError: (error) => {
      notify('error', error.response?.data?.error || 'Failed to delete file')
    }
  })

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    try {
      for (const file of files) {
        await uploadMutation.mutateAsync(file)
      }
    } catch (error) {
      console.error('Error uploading files:', error)
    }
  }

  const canManageMaterials = 
    user?.role === 'admin' || 
    user?.role === 'teacher' || 
    user?.role === 'super_admin' ||
    user?.platform_role === 'SUPER_ADMIN' ||
    lesson?.created_by === user?.id

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
          <FiArrowRight /> Back
        </button>
        <div className="header-content">
          <h1>{lesson.title}</h1>
          {classItem && <p className="class-name">{classItem.name}</p>}
        </div>
        {canManageMaterials && (
          <div className="header-actions">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp4,.zip,.rar,.7z,.tar,.gz"
            />
            <button
              className="btn-upload-materials"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <FiUpload /> {uploading ? 'Uploading...' : 'Upload Materials'}
            </button>
          </div>
        )}
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
          <div className="section-meta">
            <span className="material-count">{materials.length} file{materials.length !== 1 ? 's' : ''}</span>
            {canManageMaterials && (
              <button 
                className="btn-add-materials"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <FiPlus /> Add Files
              </button>
            )}
          </div>
        </div>

        {materials.length === 0 ? (
          <div className="empty-materials">
            <FiFileText className="empty-icon" />
            <p>No course materials uploaded yet</p>
            {canManageMaterials && (
              <button 
                className="btn-upload-empty"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <FiUpload /> {uploading ? 'Uploading...' : 'Upload Materials'}
              </button>
            )}
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
                  {canManageMaterials && (
                    <button
                      className="action-btn delete-btn"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const ok = await confirm('Are you sure you want to delete this file?')
                        if (ok) deleteFileMutation.mutate(file.id)
                      }}
                      title="Delete File"
                    >
                      <FiTrash2 />
                    </button>
                  )}
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

