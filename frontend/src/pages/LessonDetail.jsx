import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lessonsAPI } from '../api/lessons'
import { filesAPI } from '../api/files'
import { useAuthStore } from '../store/authStore'
import { 
  FiArrowRight, FiUpload, FiDownload, FiFile, FiX, FiCheckCircle,
  FiFileText, FiImage, FiVideo, FiMusic, FiArchive, FiTrash2
} from 'react-icons/fi'
import './LessonDetail.css'
import { useNotify, useConfirm } from '../components/NotificationProvider'

export default function LessonDetail() {
  const { classId, lessonId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const notify = useNotify()
  const confirm = useConfirm()

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonsAPI.getLesson(lessonId),
    enabled: !!lessonId,
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['lesson-materials', lessonId],
    queryFn: () => lessonsAPI.getLessonMaterials(lessonId),
    enabled: !!lessonId,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      return await filesAPI.uploadFile(file, null, null, lessonId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lesson-materials', lessonId])
      queryClient.invalidateQueries(['lesson', lessonId])
      setUploading(false)
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

  const handleDownload = async (file) => {
    try {
      await filesAPI.downloadFile(file.id, file.original_filename)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const canManageMaterials = 
    user?.role === 'admin' || 
    user?.role === 'teacher' || 
    lesson?.created_by === user?.id

  const getFileIcon = (fileType, mimeType) => {
    if (mimeType?.startsWith('image/')) return <FiImage />
    if (mimeType?.startsWith('video/')) return <FiVideo />
    if (mimeType?.startsWith('audio/')) return <FiMusic />
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileType)) return <FiArchive />
    return <FiFileText />
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="lesson-detail">
        <div className="loading">Loading lesson...</div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="lesson-detail">
        <div className="error">Lesson not found</div>
      </div>
    )
  }

  return (
    <div className="lesson-detail">
      <button className="back-btn" onClick={() => navigate(`/classes/${classId}`)}>
        <FiArrowRight /> Back to Class
      </button>

      <div className="lesson-header">
        <div>
          <h1>{lesson.title}</h1>
          <p className="lesson-description">{lesson.description || 'No description'}</p>
          {lesson.due_date && (
            <div className="lesson-due">
              Due: {new Date(lesson.due_date).toLocaleString()}
            </div>
          )}
        </div>
        {canManageMaterials && (
          <div className="lesson-actions">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp4,.zip,.rar,.7z,.tar,.gz"
            />
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <FiUpload /> {uploading ? 'Uploading...' : 'Upload Materials'}
            </button>
          </div>
        )}
      </div>

      {lesson.content && (
        <div className="lesson-content-section">
          <h2>Content</h2>
          <div className="lesson-content-text">
            {lesson.content.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      <div className="materials-section">
        <div className="section-header">
          <h2>
            <FiFile /> Course Materials
            {materials.length > 0 && <span className="count">({materials.length})</span>}
          </h2>
          {canManageMaterials && (
            <button
              className="btn-icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <FiUpload /> Add Files
            </button>
          )}
        </div>

        {materials.length === 0 ? (
          <div className="empty-materials">
            <FiFile className="empty-icon" />
            <p>No course materials uploaded yet</p>
            {canManageMaterials && (
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload /> Upload Materials
              </button>
            )}
          </div>
        ) : (
          <div className="materials-grid">
            {materials.map((file) => (
              <div key={file.id} className="material-card">
                <div className="material-icon">
                  {getFileIcon(file.file_type, file.mime_type)}
                </div>
                <div className="material-info">
                  <h3 className="material-name" title={file.original_filename}>
                    {file.original_filename}
                  </h3>
                  <div className="material-meta">
                    <span className="material-size">{formatFileSize(file.file_size)}</span>
                    <span className="material-type">{file.file_type?.toUpperCase()}</span>
                  </div>
                </div>
                <div className="material-actions">
                  <button
                    className="btn-icon download-btn"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >
                    <FiDownload />
                  </button>
                  {canManageMaterials && (
                    <button
                      className="btn-icon delete-btn"
                      onClick={async () => {
                        const ok = await confirm('Are you sure you want to delete this file?')
                        if (ok) deleteFileMutation.mutate(file.id)
                      }}
                      title="Delete"
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
    </div>
  )
}

