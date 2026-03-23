import React, { useState, useEffect } from 'react';
import { FiFileText, FiPlus, FiClock, FiCpu, FiArchive, FiFolder } from 'react-icons/fi';
import apiClient from '../../../api/client';
import SmartDocEditor from '../../../components/creation/SmartDocEditor';
import './AssignmentDocs.css';

export default function AssignmentDocs({ groupId }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDoc, setActiveDoc] = useState(null);

    useEffect(() => {
        apiClient.get(`/documents/?group_id=${groupId}`)
            .then(res => setDocs(res.data))
            .catch(err => console.error("Failed to load group docs", err))
            .finally(() => setLoading(false));
    }, [groupId]);

    const handleCreateDoc = async (type = 'smart_doc') => {
        try {
            const res = await apiClient.post('/documents/', {
                title: `Mission Briefing - ${new Date().toLocaleDateString()}`,
                doc_type: type,
                group_id: groupId,
                visibility: 'private'
            });
            setDocs(prev => [res.data, ...prev]);
            setActiveDoc(res.data);
        } catch (err) {
            console.error("Failed to create doc", err);
        }
    };

    if (activeDoc) {
        return (
            <div className="doc-editor-frame-nexus animate-fadeIn">
                <button className="back-btn-nexus" onClick={() => setActiveDoc(null)}>
                    <FiFolder /> Back to Archive
                </button>
                <div className="editor-container-nexus">
                    <SmartDocEditor docId={activeDoc.id} onBack={() => setActiveDoc(null)} />
                </div>
            </div>
        );
    }

    return (
        <div className="assignment-docs-nexus">
            <header className="docs-header-premium">
                <div className="header-intel">
                    <FiCpu className="text-blue-400" />
                    <h3>Collaborative Intel</h3>
                </div>
                <button className="create-doc-btn" onClick={() => handleCreateDoc()}>
                    <FiPlus /> New Protocol
                </button>
            </header>

            <div className="docs-grid-premium scrollbar-hidden">
                {loading ? (
                    <div className="nexus-loading-state">
                        <div className="nexus-spinner"></div>
                        <span>Scanning Data Bank...</span>
                    </div>
                ) : docs.length === 0 ? (
                    <div className="nexus-empty-state">
                        <FiArchive size={50} className="opacity-20 mb-4" />
                        <p>Document archive is empty.</p>
                        <button onClick={() => handleCreateDoc()} className="secondary-action">
                            Initialize First Protocol
                        </button>
                    </div>
                ) : (
                    docs.map(doc => (
                        <div key={doc.id} className="doc-nexus-card" onClick={() => setActiveDoc(doc)}>
                            <div className="doc-type-icon">
                                <FiFileText />
                            </div>
                            <div className="doc-nexus-info">
                                <span className="doc-nexus-title">{doc.title}</span>
                                <div className="doc-nexus-meta">
                                    <FiClock /> 
                                    <span>Updated {new Date(doc.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="doc-card-glow"></div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
