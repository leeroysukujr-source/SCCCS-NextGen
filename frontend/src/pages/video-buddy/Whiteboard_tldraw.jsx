import React, { useEffect, useState } from 'react';
import { Tldraw } from 'tldraw';
import { useYjsStore } from './useYjsStore';
import 'tldraw/tldraw.css';
import { FiSave } from 'react-icons/fi';
import apiClient from '../../api/client';

export default function Whiteboard({ roomId = 'global', initialData = null }) {
    // If we have a roomId, we use the collaborative store
    // If not, we might be in a local mode or need to fetch

    // Note: We need a custom hook 'useYjsStore' to connect Tldraw to Yjs
    // I will implement this hook separately.

    const store = useYjsStore({
        roomId: roomId,
        hostUrl: window.location.hostname === 'localhost' ? 'ws://localhost:1234' : 'wss://' + window.location.host, // Adjust based on y-websocket setup
    });

    const [saving, setSaving] = useState(false);

    const handleSnapshotSave = async () => {
        setSaving(true);
        try {
            const snapshot = store.getSnapshot();
            // Save to backend
            await apiClient.post('/whiteboards/', {
                title: `Whiteboard ${roomId}`,
                data: JSON.stringify(snapshot),
                is_public: false
            });
            // Or update existing if we have an ID
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="tldraw__editor" style={{ position: 'relative', width: '100%', height: '100%', background: '#f8fafc' }}>
            {/* Real-time Collaboration Header */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 300,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 20px',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '99px',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981', animation: 'pulse 2s infinite' }}></div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', letterSpacing: '0.05em' }}>LIVE COLLABORATION</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Minimalist presence avatars will be handled by tldraw's internal awareness if synced, 
                        but we can add our own floating icons here for "Canva" feel */}
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Active in room: {roomId}</span>
                </div>
            </div>

            <Tldraw
                store={store}
                onMount={(editor) => {
                    editor.user.updateUserPreferences({ name: 'Collaborator' });
                }}
            />

            <div style={{ position: 'absolute', bottom: 30, right: 30, z_index: 300, display: 'flex', gap: '12px' }}>
                <button
                    onClick={handleSnapshotSave}
                    disabled={saving}
                    style={{
                        padding: '12px 24px',
                        background: '#6366f1',
                        color: 'white',
                        borderRadius: '16px',
                        fontWeight: '700',
                        fontSize: '14px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <FiSave /> {saving ? 'Syncing...' : 'Save Canvas'}
                </button>
            </div>
        </div>
    );
}
