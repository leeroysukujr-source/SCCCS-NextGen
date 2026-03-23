
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiX, FiTrash2, FiUserPlus, FiShield, FiUser } from 'react-icons/fi';
import api from '../../api/client';
import './StudyDocsPanel.css'; // Reuse existing styles or add new ones

export default function CollaboratorModal({ documentId, onClose }) {
    const queryClient = useQueryClient();
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('editor');
    const [error, setError] = useState('');

    const { data: collaborators, isLoading } = useQuery({
        queryKey: ['doc-collaborators', documentId],
        queryFn: async () => {
            const res = await api.get(`/documents/${documentId}/collaborators`);
            return res.data;
        }
    });

    const addMutation = useMutation({
        mutationFn: async (data) => {
            await api.post(`/documents/${documentId}/collaborators`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['doc-collaborators', documentId]);
            setUsername('');
            setError('');
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to add collaborator');
        }
    });

    const removeMutation = useMutation({
        mutationFn: async (userId) => {
            await api.delete(`/documents/${documentId}/collaborators/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['doc-collaborators', documentId]);
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to remove collaborator');
        }
    });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!username.trim()) return;
        addMutation.mutate({ username, role });
    };

    return (
        <div className="study-docs-modal-overlay">
            <div className="study-docs-modal">
                <div className="modal-header">
                    <h3>Manage Access</h3>
                    <button onClick={onClose} className="close-btn"><FiX /></button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleAdd} className="add-collab-form">
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Enter username..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="collab-input"
                            />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="role-select"
                            >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                            </select>
                            <button
                                type="submit"
                                className="add-btn"
                                disabled={addMutation.isPending}
                            >
                                <FiUserPlus /> Add
                            </button>
                        </div>
                        {error && <p className="error-msg">{error}</p>}
                    </form>

                    <div className="collaborators-list">
                        <h4>Who has access</h4>
                        {isLoading ? (
                            <p>Loading...</p>
                        ) : (
                            <ul className="collab-ul">
                                {collaborators?.map((c) => (
                                    <li key={c.user_id} className="collab-item">
                                        <div className="collab-info">
                                            {c.avatar_url ? (
                                                <img src={c.avatar_url} alt="" className="collab-avatar" />
                                            ) : (
                                                <div className="collab-initial">{c.username[0].toUpperCase()}</div>
                                            )}
                                            <div className="collab-details">
                                                <span className="collab-name">{c.username}</span>
                                                <span className={`collab-role role-${c.role}`}>{c.role}</span>
                                            </div>
                                        </div>
                                        {c.role !== 'owner' && (
                                            <button
                                                className="remove-btn"
                                                onClick={() => removeMutation.mutate(c.user_id)}
                                                title="Remove access"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="email-share-section" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                        <h4>Share via Email</h4>
                        <EmailShareForm documentId={documentId} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmailShareForm({ documentId }) {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState('');

    const handleSend = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.post(`/documents/${documentId}/email`, {
                recipients: [email],
                format: 'pdf'
            });
            setMsg('Sent successfully!');
            setEmail('');
        } catch (err) {
            setMsg('Failed to send.');
            console.error(err);
        } finally {
            setSending(false);
            setTimeout(() => setMsg(''), 3000);
        }
    };

    return (
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
                type="email"
                placeholder="recipient@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                required
            />
            <button
                type="submit"
                disabled={sending}
                style={{ padding: '8px 16px', borderRadius: '4px', background: '#6366f1', color: '#fff', border: 'none' }}
            >
                {sending ? 'Sending...' : 'Send'}
            </button>
            {msg && <span style={{ fontSize: '0.8rem', color: 'green', alignSelf: 'center' }}>{msg}</span>}
        </form>
    );
}
