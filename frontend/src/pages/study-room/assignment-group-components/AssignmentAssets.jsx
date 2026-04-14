import React, { useState, useEffect, useCallback } from 'react'
import { 
    FiUpload, FiFile, FiImage, FiVideo, FiMusic, FiTrash2, 
    FiDownload, FiCpu, FiHardDrive, FiActivity, FiSearch,
    FiFilter, FiGrid, FiList, FiClock, FiUser, FiInfo,
    FiFileText, FiArchive, FiCode, FiX, FiCheckCircle, FiAlertTriangle
} from 'react-icons/fi'
import apiClient from '../../../api/client'
import { useNotify, useConfirm } from '../../../components/NotificationProvider'
import './AssignmentAssets.css'

export default function AssignmentAssets({ groupId }) {
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState('all') // all, docs, images, media, code, other
    const [viewMode, setViewMode] = useState('grid') // grid, list
    const [uploadProgress, setUploadProgress] = useState(0)
    const notify = useNotify()
    const confirm = useConfirm()

    useEffect(() => {
        fetchFiles()
    }, [groupId])

    const fetchFiles = async () => {
        try {
            const res = await apiClient.get(`/files/group/${groupId}`)
            setFiles(res.data)
        } catch (err) {
            console.error(err)
            notify('error', 'Failed to synchronize with Asset Node')
        } finally {
            setLoading(false)
        }
    }

    const processUpload = async (file) => {
        if (!file) return
        
        // Size check (e.g., 50MB limit)
        if (file.size > 50 * 1024 * 1024) {
            notify('warning', 'Payload too large. Max 50MB allowed.')
            return
        }

        setUploading(true)
        setUploadProgress(0)
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('group_id', groupId)

        try {
            await apiClient.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    setUploadProgress(percentCompleted)
                }
            })
            notify('success', `Asset "${file.name}" ingested successfully`)
            fetchFiles()
        } catch (err) {
            console.error(err)
            notify('error', 'Transmission intercepted. Upload failed.')
        } finally {
            setUploading(false)
            setUploadProgress(0)
        }
    }

    const handleDrag = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processUpload(e.dataTransfer.files[0])
        }
    }, [groupId])

    const getFileCategory = (mime, filename) => {
        const ext = filename?.split('.').pop().toLowerCase()
        if (mime?.startsWith('image/')) return 'images'
        if (mime?.startsWith('video/') || mime?.startsWith('audio/')) return 'media'
        if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'docs'
        if (['js', 'py', 'java', 'cpp', 'html', 'css', 'json', 'c', 'h'].includes(ext)) return 'code'
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archives'
        return 'other'
    }

    const getFileIcon = (category) => {
        switch (category) {
            case 'images': return <FiImage />
            case 'media': return <FiVideo />
            case 'docs': return <FiFileText />
            case 'code': return <FiCode />
            case 'archives': return <FiArchive />
            default: return <FiFile />
        }
    }

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const filteredFiles = files.filter(f => {
        const matchesSearch = f.original_filename?.toLowerCase().includes(searchQuery.toLowerCase())
        const category = getFileCategory(f.mime_type, f.original_filename)
        const matchesFilter = activeFilter === 'all' || activeFilter === category
        return matchesSearch && matchesFilter
    })

    if (loading) return (
        <div className="assets-loading-nexus">
            <div className="nexus-spinner"></div>
            <div className="loading-text-stack">
                <span className="matrix-text">DECRYPTING ASSET VAULT</span>
                <span className="sub-text">Establishing secure downlink...</span>
            </div>
        </div>
    )

    return (
        <div className={`assignment-assets-nexus ${dragActive ? 'drag-active' : ''}`}
             onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
            
            {/* Holographic Header */}
            <header className="assets-header-premium">
                <div className="header-intel">
                    <div className="intel-icon-box">
                        <FiHardDrive className="main-icon" />
                        <div className="icon-pulse"></div>
                    </div>
                    <div className="intel-text">
                        <div className="node-path">/ROOT/GROUPS/{groupId}/VAULT</div>
                        <h2>SECURE ASSET NODE</h2>
                        <p>Real-time encrypted storage for mission-critical data</p>
                    </div>
                </div>

                <div className="header-actions">
                    <div className="search-nexus-box">
                        <FiSearch />
                        <input 
                            type="text" 
                            placeholder="Search assets..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <label className={`upload-nexus-btn ${uploading ? 'uploading' : ''}`}>
                        <FiUpload /> {uploading ? `INGESTING ${uploadProgress}%` : 'INJECT DATA'}
                        <input type="file" hidden onChange={(e) => processUpload(e.target.files[0])} disabled={uploading} />
                    </label>
                </div>
            </header>

            {/* Tactical Control Bar */}
            <div className="tactical-control-bar">
                <div className="filter-chips">
                    {['all', 'docs', 'images', 'media', 'code', 'archives', 'other'].map(filter => (
                        <button 
                            key={filter}
                            className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
                            onClick={() => setActiveFilter(filter)}
                        >
                            {filter.toUpperCase()}
                        </button>
                    ))}
                </div>
                
                <div className="view-toggle">
                    <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><FiGrid /></button>
                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><FiList /></button>
                </div>
            </div>

            {/* Assets Display */}
            <div className={`assets-container-premium ${viewMode} custom-scrollbar`}>
                {uploading && (
                    <div className="upload-nexus-overlay">
                        <div className="ingestion-status">
                            <FiActivity className="animate-pulse" />
                            <span>ENCRYPTING PACKET: {uploadProgress}%</span>
                            <div className="progress-bar-nexus">
                                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {filteredFiles.length === 0 ? (
                    <div className="nexus-empty-assets">
                        <div className="empty-visual">
                            <FiCpu className="main-empty-icon" />
                            <div className="circles">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                        <h3>ZERO TELEMETRY DETECTED</h3>
                        <p>This node is currently void. Initialize a data injection to begin collaboration.</p>
                        <button className="primary-nexus-btn" onClick={() => document.querySelector('input[type="file"]').click()}>
                            START INJECTION
                        </button>
                    </div>
                ) : (
                    <div className="assets-grid-layout">
                        {filteredFiles.map(file => {
                            const category = getFileCategory(file.mime_type, file.original_filename)
                            return (
                                <div key={file.id} className={`asset-nexus-card ${category}`}>
                                    <div className="card-glimmer"></div>
                                    <div className="asset-nexus-preview">
                                        {file.mime_type?.startsWith('image/') ? (
                                            <div className="image-wrap">
                                                <img src={`${apiClient.defaults.baseURL}/files/${file.id}`} alt={file.original_filename} />
                                            </div>
                                        ) : (
                                            <div className="file-nexus-icon-large">
                                                {getFileIcon(category)}
                                                <div className="icon-shadow"></div>
                                            </div>
                                        )}
                                        <div className="preview-overlay">
                                            <div className="meta-tag">{file.mime_type?.split('/')[1]?.toUpperCase() || 'DATA'}</div>
                                        </div>
                                    </div>

                                    <div className="asset-nexus-info">
                                        <div className="name-row">
                                            <span className="asset-nexus-name" title={file.original_filename}>
                                                {file.original_filename}
                                            </span>
                                        </div>
                                        
                                        <div className="stats-row">
                                            <div className="stat-item"><FiHardDrive /> {formatSize(file.file_size)}</div>
                                            <div className="stat-item"><FiClock /> {new Date(file.created_at).toLocaleDateString()}</div>
                                        </div>

                                        <div className="asset-nexus-actions">
                                            <a href={`${apiClient.defaults.baseURL}/files/${file.id}?download=true`} target="_blank" rel="noreferrer" className="action-btn download" title="Extract Asset">
                                                <FiDownload />
                                            </a>
                                            <button onClick={async () => {
                                                if (await confirm('Permanently decommission this asset?')) {
                                                    try {
                                                        await apiClient.delete(`/files/${file.id}`)
                                                        notify('success', 'Asset purged from node')
                                                        fetchFiles()
                                                    } catch (err) {
                                                        notify('error', 'Purge sequence failed')
                                                    }
                                                }
                                            }} className="action-btn delete" title="Purge Node">
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="card-scanline"></div>
                                    <div className="card-border-glow"></div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Drag and Drop Overlay */}
            {dragActive && (
                <div className="drag-nexus-overlay">
                    <div className="drag-content">
                        <div className="portal-ring"></div>
                        <FiUpload className="portal-icon" />
                        <h2>DROP TO INJECT</h2>
                        <p>Release to transmit encrypted telemetry to this node</p>
                    </div>
                </div>
            )}
        </div>
    )
}
