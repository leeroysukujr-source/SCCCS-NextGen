import { useState, useEffect, useRef } from 'react'
import { aiStudyAPI } from '../api/aiStudy'
import { 
  FiSend, FiX, FiBook, FiFileText, FiHelpCircle, FiList, 
  FiCheckCircle, FiLoader, FiZap, FiCopy, FiTrash2, FiDownload
} from 'react-icons/fi'
import './AIStudyAssistant.css'
import { useConfirm, useNotify, usePrompt } from './NotificationProvider'

export default function AIStudyAssistant({ file, lesson, classItem, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeFeature, setActiveFeature] = useState(null)
  const [aiStatus, setAiStatus] = useState(null)
  const [uploadedFileText, setUploadedFileText] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const confirm = useConfirm()
  const notify = useNotify()
  const promptHook = usePrompt()

  useEffect(() => {
    // Build welcome message with course context
    let welcomeContent = `Hello! I'm your AI Study Assistant, and I'm here to help you learn and understand your course materials.\n\nI can help you with:\n\n• Ask questions about any course material\n• Generate comprehensive study notes\n• Create quiz questions for practice\n• Summarize content effectively\n• Explain concepts in detail\n\n`
    
    if (classItem) {
      welcomeContent += `Current Course Context:\n`
      welcomeContent += `Course: ${classItem.name}\n`
      if (classItem.code) {
        welcomeContent += `Code: ${classItem.code}\n`
      }
    }
    
    if (lesson) {
      welcomeContent += `\nCurrent Lesson: ${lesson.title}\n`
    }
    
    welcomeContent += `\nI have access to all course materials for this lesson, so I can answer questions using information from all available documents. You can also upload additional files for me to analyze.\n\nWhat would you like to learn today?`
    
    setMessages([{
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date()
    }])

    // Check AI status
    aiStudyAPI.getStatus().then(setAiStatus).catch(() => {
      setAiStatus({ gemini_enabled: false })
    })
  }, [file, lesson, classItem])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0]
    if (!selectedFile) return

    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md']
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
    
    if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(fileExtension)) {
      notify('error', 'Please upload a PDF, DOCX, or TXT file')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      notify('error', 'File size must be less than 10MB')
      return
    }

    setLoading(true)
    const loadingMessage = {
      role: 'assistant',
      content: `Uploading and processing ${selectedFile.name}...`,
      timestamp: new Date(),
      loading: true
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      const response = await aiStudyAPI.uploadFile(formData)
      
      // Remove loading message
      setMessages(prev => prev.filter(m => !m.loading))
      
      setUploadedFileText(response.text)
      setUploadedFileName(selectedFile.name)
      
      const successMessage = {
        role: 'assistant',
        content: `✅ Successfully uploaded and processed "${selectedFile.name}" (${(response.size / 1024).toFixed(1)} KB of text extracted).\n\nYou can now ask questions about this document, or use it with any of the study features!`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, successMessage])
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(m => !m.loading)
        return [...filtered, {
          role: 'assistant',
          content: `❌ Error uploading file: ${error.response?.data?.error || error.message || 'Failed to upload file'}`,
          timestamp: new Date(),
          error: true
        }]
      })
    } finally {
      setLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      // Use uploaded file text if available, otherwise use file_id
      let fileTextToUse = uploadedFileText
      let fileIdToUse = file?.id
      
      // If we have uploaded file text, we need to pass it differently
      // For now, we'll use the file_id approach and add uploaded text to context
      let context = ''
      if (classItem) {
        context = `Course: ${classItem.name}`
        if (classItem.code) {
          context += ` (${classItem.code})`
        }
        if (classItem.description) {
          context += `\nCourse Description: ${classItem.description}`
        }
      }
      
      if (uploadedFileText) {
        context += `\n\nAdditional Document Content (from uploaded file "${uploadedFileName}"):\n${uploadedFileText.substring(0, 30000)}`
      }
      
      const response = await aiStudyAPI.chat({
        prompt: currentInput,
        file_id: fileIdToUse,
        lesson_id: lesson?.id,
        context: context,
        uploaded_file_text: uploadedFileText ? uploadedFileText.substring(0, 30000) : null
      })

      const assistantMessage = {
        role: 'assistant',
        content: response.response || response.error || 'Sorry, I encountered an error.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || error.message || 'Failed to get response'}`,
        timestamp: new Date(),
        error: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleFeature = async (feature, data = {}) => {
    setActiveFeature(feature)
    setLoading(true)

    const loadingMessage = {
      role: 'assistant',
      content: `Generating ${feature}...`,
      timestamp: new Date(),
      loading: true
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      let response
      const baseData = {
        file_id: file?.id,
        lesson_id: lesson?.id,
        ...data
      }

      // Add uploaded file text if available
      if (uploadedFileText) {
        baseData.uploaded_file_text = uploadedFileText.substring(0, 30000)
      }
      
      // Add uploaded file text to all requests
      if (uploadedFileText) {
        baseData.uploaded_file_text = uploadedFileText.substring(0, 30000)
      }
      
      switch (feature) {
        case 'notes':
          response = await aiStudyAPI.generateNotes(baseData)
          break
        case 'quiz':
          response = await aiStudyAPI.generateQuiz({ ...baseData, num_questions: 10 })
          break
        case 'summary':
          response = await aiStudyAPI.summarizeDocument({ ...baseData, summary_type: 'comprehensive' })
          break
        default:
          return
      }

      // Remove loading message
      setMessages(prev => prev.filter(m => !m.loading))

      const resultMessage = {
        role: 'assistant',
        content: response.response || response.error || 'Failed to generate',
        timestamp: new Date(),
        feature: feature
      }

      // If quiz, try to parse questions
      if (feature === 'quiz' && response.questions) {
        resultMessage.questions = response.questions
      }

      setMessages(prev => [...prev, resultMessage])
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(m => !m.loading)
        return [...filtered, {
          role: 'assistant',
          content: `Error: ${error.response?.data?.error || error.message || 'Failed to generate'}`,
          timestamp: new Date(),
          error: true
        }]
      })
    } finally {
      setLoading(false)
      setActiveFeature(null)
    }
  }

  const handleExplainConcept = async () => {
    const concept = await promptHook('Enter the concept you want explained:')
    if (!concept) return

    setLoading(true)
    const userMessage = {
      role: 'user',
      content: `Explain: ${concept}`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const explainData = {
        concept,
        file_id: file?.id,
        lesson_id: lesson?.id,
        level: 'intermediate'
      }
      
      // Add uploaded file text if available
      if (uploadedFileText) {
        explainData.uploaded_file_text = uploadedFileText.substring(0, 30000)
      }
      
      const response = await aiStudyAPI.explainConcept(explainData)

      const assistantMessage = {
        role: 'assistant',
        content: response.response || response.error || 'Failed to explain concept',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || error.message || 'Failed to explain'}`,
        timestamp: new Date(),
        error: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleCopyMessage = (content, event) => {
    navigator.clipboard.writeText(content).then(() => {
      // Show temporary feedback
      if (event) {
        const btn = event.target.closest('.copy-btn')
        if (btn) {
          const original = btn.innerHTML
          btn.innerHTML = '<FiCheckCircle />'
          setTimeout(() => {
            btn.innerHTML = original
          }, 2000)
        }
      }
    }).catch(() => {
      notify('error', 'Failed to copy to clipboard')
    })
  }
  const handleClearChat = async () => {
    const ok = await confirm('Clear all chat messages?')
    if (!ok) return
    setMessages([{
      role: 'assistant',
      content: `👋 Hello! I'm your AI Study Assistant. I can help you:\n\n• Ask questions about the document\n• Generate study notes\n• Create quiz questions\n• Summarize content\n• Explain concepts\n\nWhat would you like to learn today?`,
      timestamp: new Date()
    }])
  }

  const handleExport = (content, type = 'notes') => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${type}-${new Date().toISOString().split('T')[0]}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!aiStatus?.gemini_enabled) {
    return (
      <div className="ai-study-assistant">
        <div className="ai-header">
          <h3>🤖 AI Study Assistant</h3>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className="ai-error">
          <p>AI Study Assistant is not available.</p>
          <p className="error-detail">Please configure Google Gemini API key in the backend.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-study-assistant">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-title">
          <FiZap className="ai-icon" />
          <div>
            <h3>AI Study Assistant</h3>
            <p className="ai-subtitle">Powered by Google Gemini</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-action-btn" onClick={handleClearChat} title="Clear Chat">
            <FiTrash2 />
          </button>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="ai-quick-actions">
        <button 
          className="quick-action-btn" 
          onClick={() => handleFeature('notes')}
          disabled={loading}
          title="Generate Study Notes"
        >
          <FiBook /> Notes
        </button>
        <button 
          className="quick-action-btn" 
          onClick={() => handleFeature('quiz')}
          disabled={loading}
          title="Generate Quiz"
        >
          <FiCheckCircle /> Quiz
        </button>
        <button 
          className="quick-action-btn" 
          onClick={() => handleFeature('summary')}
          disabled={loading}
          title="Summarize Document"
        >
          <FiFileText /> Summary
        </button>
        <button 
          className="quick-action-btn" 
          onClick={handleExplainConcept}
          disabled={loading}
          title="Explain Concept"
        >
          <FiHelpCircle /> Explain
        </button>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.map((message, index) => (
          <div key={index} className={`ai-message ${message.role}`}>
            <div className="message-content">
              {message.role === 'assistant' && (
                <div className="message-avatar">
                  <FiZap />
                </div>
              )}
              <div className="message-text">
                {message.loading ? (
                  <div className="loading-indicator">
                    <FiLoader className="spinner" />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <div className="message-body">
                    <div className="message-actions">
                      <button 
                        className="copy-btn"
                        onClick={(e) => handleCopyMessage(message.content, e)}
                        title="Copy message"
                      >
                        <FiCopy />
                      </button>
                      {(message.feature === 'notes' || message.feature === 'summary') && (
                        <button 
                          className="export-btn"
                          onClick={() => handleExport(message.content, message.feature)}
                          title="Export"
                        >
                          <FiDownload />
                        </button>
                      )}
                    </div>
                    <div className="message-text-content">
                      {message.content.split('\n').map((line, i) => {
                        // Skip empty lines at start/end
                        if (i === 0 && !line.trim()) return null
                        if (i === message.content.split('\n').length - 1 && !line.trim()) return null
                        
                        // Format lists and paragraphs
                        if (line.trim().match(/^[-•]\s/) || line.trim().match(/^\d+\.\s/)) {
                          return <div key={i} className="message-list-item">{line}</div>
                        }
                        if (line.trim()) {
                          return <p key={i}>{line}</p>
                        }
                        return <br key={i} />
                      })}
                    </div>
                    {message.questions && (
                      <div className="quiz-questions">
                        <h4>Generated Quiz Questions:</h4>
                        {message.questions.map((q, qi) => (
                          <div key={qi} className="quiz-question">
                            <p><strong>Q{qi + 1}:</strong> {q.question}</p>
                            <ul>
                              {q.options?.map((opt, oi) => (
                                <li key={oi} className={oi === q.correct_answer ? 'correct' : ''}>
                                  {opt} {oi === q.correct_answer && '✓'}
                                </li>
                              ))}
                            </ul>
                            {q.explanation && <p className="explanation"><em>{q.explanation}</em></p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && activeFeature === null && (
          <div className="ai-message assistant">
            <div className="message-content">
              <div className="message-avatar">
                <FiZap />
              </div>
              <div className="message-text">
                <div className="loading-indicator">
                  <FiLoader className="spinner" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Indicator */}
      {uploadedFileName && (
        <div className="uploaded-file-indicator">
          <FiFileText />
          <span>{uploadedFileName}</span>
          <button 
            className="remove-file-btn"
            onClick={() => {
              setUploadedFileText(null)
              setUploadedFileName(null)
            }}
            title="Remove uploaded file"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Input */}
      <form className="ai-input-form" onSubmit={handleSend}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf,.docx,.doc,.txt,.md"
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="ai-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          title="Upload file for AI analysis"
        >
          <FiFileText />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={uploadedFileName ? `Ask about "${uploadedFileName}" or course materials...` : "Ask me anything about the document..."}
          disabled={loading}
          className="ai-input"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className="ai-send-btn"
        >
          <FiSend />
        </button>
      </form>
    </div>
  )
}

