import React, { useState, useEffect } from 'react'
import { FiUpload, FiFile, FiImage, FiVideo, FiMusic, FiTrash2, FiDownload, FiCpu, FiHardDrive, FiActivity } from 'react-icons/fi'
import apiClient from '../../../api/client'
import './AssignmentAssets.css'

export default function AssignmentAssets({ groupId }) {
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        fetchFiles()
    }, [groupId])

    const fetchFiles = async () => {
        try {
            const res = await apiClient.get(`/files/group/${groupId}`)
            setFiles(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('group_id', groupId)

        try {
            await apiClient.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            fetchFiles()
        } catch (err) {
            console.error(err)
        } finally {
            setUploading(false)
        }
    }

    const getFileIcon = (mime) => {
        if (mime?.startsWith('image/')) return <FiImage />
        if (mime?.startsWith('video/')) return <FiVideo />
        if (mime?.startsWith('audio/')) return <FiMusic />
        return <FiFile />
    }

    if (loading) return (
        <div className="assets-loading-nexus">
            <div className="nexus-spinner"></div>
            <span>Scanning File System...</span>
        </div>
    )

    return (
        <div className="assignment-assets-nexus">
            <header className="assets-header-premium">
                <div className="header-intel">
                    <FiHardDrive className="text-purple-400" />
                    <div>
                        <h2>Secure Asset Node</h2>
                        <p>Encrypted data storage and retrieval</p>
                    </div>
                </div>
                <label className="upload-nexus-btn">
                    <FiUpload /> {uploading ? 'Transmitting...' : 'Upload Data'}
                    <input type="file" hidden onChange={handleUpload} disabled={uploading} />
                </label>
            </header>

            <div className="assets-grid-premium custom-scrollbar">
                {files.length === 0 ? (
                    <div className="nexus-empty-assets">
                        <FiCpu size={60} className="mb-6 opacity-20" />
                        <p>No telemetry data available.</p>
                        <button onClick={() => document.querySelector('input[type="file"]').click()}>
                            Initialize First Shipment
                        </button>
                    </div>
                ) : (
                    files.map(file => (
                        <div key={file.id} className="asset-nexus-card">
                            <div className="asset-nexus-preview">
                                {file.mime_type?.startsWith('image/') ? (
                                    <img src={`${apiClient.defaults.baseURL}/files/${file.id}`} alt={file.original_filename} />
                                ) : (
                                    <div className="file-nexus-icon">
                                        {getFileIcon(file.mime_type)}
                                    </div>
                                )}
                            </div>
                            <div className="asset-nexus-info">
                                <span className="asset-nexus-name" title={file.original_filename}>
                                    {file.original_filename}
                                </span>
                                <div className="asset-nexus-actions">
                                    <a href={`${apiClient.defaults.baseURL}/files/${file.id}?download=true`} target="_blank" rel="noreferrer" title="Download">
                                        <FiDownload />
                                    </a>
                                    <button onClick={async () => {
                                        if (confirm('Decommission this asset?')) {
                                            await apiClient.delete(`/files/${file.id}`)
                                            fetchFiles()
                                        }
                                    }} title="Purge">
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                            <div className="card-scanline"></div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
