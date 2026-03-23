
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiFileText, FiPlus, FiTrash2, FiSave, FiX, FiCheck, FiShare2 } from 'react-icons/fi';
import api from '../../api/client';
import './StudyDocsPanel.css';
import CollaborativeEditor from './CollaborativeEditor';
import CollaboratorModal from './CollaboratorModal';

export default function StudyDocsPanel({ roomId, onClose }) {
    const queryClient = useQueryClient();
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [collabDocId, setCollabDocId] = useState(null);

    // --- Data Fetching ---
    const { data: documents, isLoading } = useQuery({
        queryKey: ['study-docs', roomId],
        queryFn: async () => {
            const res = await api.get(`/study-rooms/${roomId}/documents`);
            return res.data;
        }
    });

    // --- Session Memory (Segment 8) ---
    useEffect(() => {
        const lastDocId = localStorage.getItem(`study-docs-last-${roomId}`);
        if (lastDocId && documents && !selectedDoc) {
            const doc = documents.find(d => d.id.toString() === lastDocId);
            if (doc) {
                setSelectedDoc(doc);
                setIsEditing(true);
                setCollabDocId(null); // Clear modal if set
            }
        }
    }, [documents, roomId, selectedDoc]);

    const handleSelectDoc = (doc) => {
        setSelectedDoc(doc);
        setIsEditing(true);
        localStorage.setItem(`study-docs-last-${roomId}`, doc.id);
    };

    const createDocMutation = useMutation({
        mutationFn: async (title) => {
            const res = await api.post(`/study-rooms/${roomId}/documents`, {
                title,
                content: '<h1>New Document</h1><p>Start typing...</p>' // Simple initial content
            });
            return res.data;
        },
        onSuccess: (newDoc) => {
            queryClient.invalidateQueries(['study-docs', roomId]);
            setSelectedDoc(newDoc);
            setIsEditing(true);
        }
    });

    const updateDocMutation = useMutation({
        mutationFn: async ({ id, content, title }) => {
            const res = await api.put(`/documents/${id}`, { content, title });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['study-docs', roomId]);
        }
    });

    // --- Handlers ---
    const handleCreate = () => {
        const title = prompt("Enter document title:");
        if (title) createDocMutation.mutate(title);
    };

    const handleSave = (content) => {
        if (selectedDoc) {
            updateDocMutation.mutate({
                id: selectedDoc.id,
                content: content,
                title: selectedDoc.title
            });
        }
    };

    return (
        <>
            <div className="study-docs-panel">
                <div className="docs-header">
                    <h3>Study Documents</h3>
                    <div className="docs-actions">
                        {!isEditing && (
                            <button onClick={handleCreate} className="btn-icon" title="New Document">
                                <FiPlus />
                            </button>
                        )}
                        <button onClick={onClose} className="btn-icon" title="Close">
                            <FiX />
                        </button>
                    </div>
                </div>

                <div className="docs-content">
                    {isLoading && <div className="loading-spinner">Loading docs...</div>}

                    {!isEditing ? (
                        <div className="doc-list">
                            {documents?.length === 0 && <p className="empty-state">No documents yet. Create one to start collaborating!</p>}
                            {documents?.map(doc => (
                                <div
                                    key={doc.id}
                                    className="doc-item"
                                    onClick={() => handleSelectDoc(doc)}
                                >
                                    <FiFileText className="doc-icon" />
                                    <div className="doc-info">
                                        <span className="doc-title">{doc.title}</span>
                                        <span className="doc-date">{new Date(doc.updated_at).toLocaleDateString()}</span>
                                    </div>
                                    <button
                                        className="btn-icon share-btn"
                                        onClick={(e) => { e.stopPropagation(); setCollabDocId(doc.id); }}
                                        title="Manage Access"
                                    >
                                        <FiShare2 />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="doc-editor-container">
                            <div className="editor-toolbar">
                                <button onClick={() => setIsEditing(false)} className="back-btn">Back</button>
                                <span className="current-doc-title">{selectedDoc?.title}</span>
                                <span className="save-status">
                                    {updateDocMutation.isLoading ? 'Saving...' : <FiCheck />}
                                </span>
                            </div>
                            <CollaborativeEditor
                                docId={selectedDoc?.id}
                                initialContent={selectedDoc?.content}
                                onSave={handleSave}
                            />
                        </div>
                    )}
                </div>
            </div>
            {collabDocId && (
                <CollaboratorModal
                    documentId={collabDocId}
                    onClose={() => setCollabDocId(null)}
                />
            )}
        </>
    );
}
