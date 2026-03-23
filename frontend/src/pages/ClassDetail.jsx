import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classesAPI } from '../api/classes'
import { lessonsAPI } from '../api/lessons'
import { useAuthStore } from '../store/authStore'
import { FiPlus, FiBook, FiCalendar, FiUsers, FiArrowLeft, FiFile, FiEye, FiZap, FiEdit3, FiUsers as FiGroups } from 'react-icons/fi'
import { assignmentsAPI } from '../api/assignments'
import GroupJoiningInterface from '../components/assignments/GroupJoiningInterface'
import './ClassDetail.css'

export default function ClassDetail() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    content: '',
    due_date: '',
  })
  const [activeTab, setActiveTab] = useState('lessons')
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const queryClient = useQueryClient()

  const { data: classItem } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classesAPI.getClass(classId),
    enabled: !!classId,
  })

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', classId],
    queryFn: () => lessonsAPI.getLessons(classId),
    enabled: !!classId,
  })

  // We assume classItem.channel_id or similar exists. 
  // If not, we might need to filter assignments by some other criteria.
  // For now let's try to get them by classId if possible or workspace.
  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', classId],
    queryFn: () => assignmentsAPI.getAssignments(), // Getting all for now, we'll filter in UI or backend
    enabled: !!classId,
  })

  const createLessonMutation = useMutation({
    mutationFn: (data) => lessonsAPI.createLesson(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons', classId])
      setShowCreateModal(false)
      setNewLesson({ title: '', description: '', content: '', due_date: '' })
    },
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createLessonMutation.mutate(newLesson)
  }

  const canCreateLesson =
    user?.role === 'admin' ||
    user?.role === 'teacher' ||
    user?.role === 'super_admin' ||
    classItem?.teacher_id === user?.id

  return (
    <div className="class-detail">
      <button className="back-btn" onClick={() => navigate('/classes')}>
        <FiArrowLeft /> Back to Classes
      </button>

      <div className="class-header">
        <div>
          <h1>{classItem?.name}</h1>
          <p>{classItem?.description || 'No description'}</p>
          <div className="class-info">
            <span>
              <FiUsers /> {classItem?.member_count || 0} members
            </span>
            <span>Code: {classItem?.code}</span>
          </div>
        </div>
        {canCreateLesson && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus /> Create Lesson
          </button>
        )}
      </div>

      <div className="class-tabs">
        <button 
          className={`tab-btn ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => { setActiveTab('lessons'); setSelectedAssignment(null); }}
        >
          <FiBook /> Lessons
        </button>
        <button 
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <FiEdit3 /> Assignments
        </button>
      </div>

      {activeTab === 'lessons' ? (
        <div className="lessons-section">
          <h2>Lessons</h2>
          <div className="lessons-list">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="lesson-card"
              >
                <div 
                  className="lesson-main"
                  onClick={() => navigate(`/classes/${classId}/lessons/${lesson.id}`)}
                >
                  <div className="lesson-icon">
                    <FiBook />
                  </div>
                  <div className="lesson-content">
                    <h3>{lesson.title}</h3>
                    <p>{lesson.description || 'No description'}</p>
                    <div className="lesson-meta">
                      {lesson.due_date && (
                        <div className="lesson-due">
                          <FiCalendar /> Due: {new Date(lesson.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {lesson.attachments && lesson.attachments.length > 0 && (
                        <div className="lesson-attachments">
                          <FiFile /> {lesson.attachments.length} file{lesson.attachments.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="lesson-actions">
                  <button
                    className="lesson-action-btn materials-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/lessons/${lesson.id}/materials`)
                    }}
                    title="View Materials"
                  >
                    <FiEye /> Materials
                  </button>
                  <button
                    className="lesson-action-btn ai-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/lessons/${lesson.id}/materials`, { state: { openAI: true } })
                    }}
                    title="AI Study Assistant"
                  >
                    <FiZap /> AI
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="assignments-section">
          {selectedAssignment ? (
            <div>
              <button 
                className="back-to-list-btn"
                onClick={() => setSelectedAssignment(null)}
              >
                <FiArrowLeft /> Back to Assignments
              </button>
              <GroupJoiningInterface assignment={selectedAssignment} />
            </div>
          ) : (
            <div>
              <h2>Assignments</h2>
              <div className="assignments-list">
                {assignments.filter(a => a.status === 'published').map((assignment) => (
                  <div 
                    key={assignment.id} 
                    className="assignment-card"
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    <div className="assignment-icon">
                      <FiEdit3 />
                    </div>
                    <div className="assignment-content">
                      <h3>{assignment.title}</h3>
                      <p>{assignment.description || 'No description'}</p>
                      <div className="assignment-meta">
                        {assignment.due_date && (
                          <div className="assignment-due">
                            <FiCalendar /> Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </div>
                        )}
                        {assignment.settings?.groupConfig?.enabled && (
                          <div className="assignment-groups-badge">
                            <FiGroups /> Groups Enabled
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {assignments.filter(a => a.status === 'published').length === 0 && (
                  <div className="empty-state">
                    <FiEdit3 className="empty-icon" />
                    <p>No assignments posted yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Lesson</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newLesson.title}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, title: e.target.value })
                  }
                  required
                  className="input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newLesson.description}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, description: e.target.value })
                  }
                  className="input"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  value={newLesson.content}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, content: e.target.value })
                  }
                  className="input"
                  rows="5"
                />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="datetime-local"
                  value={newLesson.due_date}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, due_date: e.target.value })
                  }
                  className="input"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

