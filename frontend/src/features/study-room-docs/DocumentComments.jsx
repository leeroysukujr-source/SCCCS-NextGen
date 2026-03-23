
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiSend } from 'react-icons/fi';
import api from '../../api/client';
import './StudyDocsPanel.css'; // Reuse styles or add specific ones

export default function DocumentComments({ docId }) {
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const bottomRef = useRef(null);

    const { data: comments, isLoading } = useQuery({
        queryKey: ['doc-comments', docId],
        queryFn: async () => {
            const res = await api.get(`/documents/${docId}/comments`);
            return res.data;
        },
        refetchInterval: 5000 // Poll every 5s for updates (simple real-time)
    });

    const postMutation = useMutation({
        mutationFn: async (text) => {
            await api.post(`/documents/${docId}/comments`, { content: text });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['doc-comments', docId]);
            setContent('');
        }
    });

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [comments]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        postMutation.mutate(content);
    };

    return (
        <div className="doc-comments-panel">
            <div className="comments-header">
                <h4>Comments</h4>
            </div>

            <div className="comments-list">
                {isLoading && <p className="loading-text">Loading...</p>}
                {comments?.length === 0 && <p className="empty-text">No comments yet.</p>}

                {comments?.map((c) => (
                    <div key={c.id} className="comment-item">
                        <div className="comment-avatar">
                            {c.avatar_url ? (
                                <img src={c.avatar_url} alt={c.username} />
                            ) : (
                                <div className="initial-avatar">{c.username[0].toUpperCase()}</div>
                            )}
                        </div>
                        <div className="comment-content">
                            <div className="comment-meta">
                                <span className="comment-author">{c.username}</span>
                                <span className="comment-time">
                                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="comment-text">{c.content}</div>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="comment-form">
                <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Add a comment..."
                    disabled={postMutation.isPending}
                />
                <button type="submit" disabled={postMutation.isPending || !content.trim()}>
                    <FiSend />
                </button>
            </form>
        </div>
    );
}
