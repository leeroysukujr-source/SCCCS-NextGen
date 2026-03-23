import { useState, useEffect, useRef } from 'react'
import { filesAPI } from '../api/files'
import {
  FiX, FiDownload, FiMaximize2, FiMinimize2, FiZoomIn, FiZoomOut,
  FiRotateCw, FiMonitor, FiEye, FiEyeOff, FiCpu, FiCast
} from 'react-icons/fi'
import './DocumentViewer.css'

export default function DocumentViewer({ file, onClose, onOpenAI }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const viewerRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (!file) return

    const loadFile = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get file as blob and create object URL for viewing
        const blob = await filesAPI.getFile(file.id)
        const objectUrl = URL.createObjectURL(blob)
        setFileUrl(objectUrl)
        setLoading(false)
      } catch (err) {
        console.error('Error loading file:', err)
        setError('Failed to load document. Please try again.')
        setLoading(false)
      }
    }

    loadFile()

    // Cleanup object URL on unmount
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [file])

  // Track mouse for laser pointer in presentation mode
  useEffect(() => {
    if (!isPresentationMode) return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPresentationMode]);


  const handleDownload = async () => {
    try {
      await filesAPI.downloadFile(file.id, file.original_filename || file.filename)
    } catch (error) {
      console.error('Error downloading file:', error)
      // Error message is already shown by downloadFile
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (viewerRef.current?.requestFullscreen) {
        viewerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
  }

  const togglePresentationMode = () => {
    const newState = !isPresentationMode;
    setIsPresentationMode(newState);
    if (newState && !isFullscreen) {
      toggleFullscreen();
    }
  }

  const getFileType = () => {
    if (!file?.mime_type) return 'unknown'
    if (file.mime_type.includes('pdf')) return 'pdf'
    if (file.mime_type.includes('word') || file.mime_type.includes('document')) return 'docx'
    if (file.mime_type.includes('text') || file.mime_type.includes('plain')) return 'text'
    return 'unknown'
  }

  const renderViewer = () => {
    const fileType = getFileType()

    if (fileType === 'pdf') {
      return (
        <iframe
          src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          className={isPresentationMode ? 'presentation-cursor-none' : ''}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            transform: `rotate(${rotation}deg) scale(${zoom / 100})`,
            transformOrigin: 'center center',
            transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            pointerEvents: isPresentationMode ? 'none' : 'auto' // Allow clicks only if not in laser mode
          }}
          title={file.original_filename || file.filename}
        />
      )
    } else if (fileType === 'text') {
      return (
        <div className="text-viewer" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
          <iframe
            src={fileUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title={file.original_filename || file.filename}
          />
        </div>
      )
    } else if (fileType === 'docx') {
      return (
        <div className="unsupported-viewer">
          <FiCpu size={48} />
          <p>Word documents cannot be previewed in the browser.</p>
          <button className="btn btn-primary glass-btn" onClick={handleDownload}>
            <FiDownload /> Download Document
          </button>
        </div>
      )
    } else {
      return (
        <div className="unsupported-viewer">
          <FiCast size={48} />
          <p>Preview not available for this file type</p>
          <button className="btn btn-primary glass-btn" onClick={handleDownload}>
            <FiDownload /> Download to view
          </button>
        </div>
      )
    }
  }

  if (!file) return null

  return (
    <div className={`document-viewer-overlay ${isFocusMode ? 'focus-mode' : ''}`} onClick={onClose}>

      {/* Laser Pointer */}
      {isPresentationMode && (
        <div
          className="laser-pointer"
          style={{
            left: mousePos.x,
            top: mousePos.y
          }}
        />
      )}

      <div
        className={`document-viewer ${isFocusMode ? 'focus-active' : ''}`}
        ref={viewerRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Navbar / Header */}
        <div className={`viewer-header ${isFocusMode ? 'hidden' : ''}`}>
          <div className="viewer-title">
            <h3>{file.original_filename || file.filename}</h3>
            {onOpenAI && (
              <button className="btn-ai-assistant glow-effect" onClick={() => onOpenAI(file)}>
                <FiCpu className="ai-icon" /> AI Study Assistant
              </button>
            )}
          </div>

          <div className="viewer-controls-dock">
            <div className="dock-group">
              <button className="dock-btn" onClick={handleZoomOut} title="Zoom Out">
                <FiZoomOut />
              </button>
              <span className="dock-label">{zoom}%</span>
              <button className="dock-btn" onClick={handleZoomIn} title="Zoom In">
                <FiZoomIn />
              </button>
            </div>

            <div className="dock-separator"></div>

            <div className="dock-group">
              <button className="dock-btn" onClick={handleRotate} title="Rotate">
                <FiRotateCw />
              </button>
              <button
                className={`dock-btn ${isFocusMode ? 'active' : ''}`}
                onClick={toggleFocusMode}
                title="Focus Mode"
              >
                {isFocusMode ? <FiEyeOff /> : <FiEye />}
              </button>
              <button
                className={`dock-btn ${isPresentationMode ? 'active' : ''}`}
                onClick={togglePresentationMode}
                title="Presentation Mode (Laser Pointer)"
              >
                <FiMonitor />
              </button>
            </div>

            <div className="dock-separator"></div>

            <div className="dock-group">
              <button className="dock-btn" onClick={toggleFullscreen} title="Fullscreen">
                {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
              </button>
              <button className="dock-btn" onClick={handleDownload} title="Download">
                <FiDownload />
              </button>
              <button className="dock-btn close-btn" onClick={onClose} title="Close">
                <FiX />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="viewer-content" ref={contentRef}>
          {loading && (
            <div className="viewer-loading">
              <div className="spinner-modern"></div>
              <p>Loading document...</p>
            </div>
          )}
          {error && (
            <div className="viewer-error">
              <p>{error}</p>
              <button className="btn btn-primary glass-btn" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}
          {!loading && !error && fileUrl && renderViewer()}

          {/* Focus Mode Exits Hint */}
          {isFocusMode && (
            <div className="focus-exit-hint">
              <button onClick={toggleFocusMode}>Exit Focus</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

