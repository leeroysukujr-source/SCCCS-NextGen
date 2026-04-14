import React, { useEffect, useState } from 'react';
import { Tldraw } from 'tldraw';
import { useYjsStore } from './useYjsStore';
import 'tldraw/tldraw.css';
import { FiSave } from 'react-icons/fi';
import apiClient from '../../api/client';
import { getCollabUrl } from '../../utils/api';
import './Whiteboard.css'; // Keep existing CSS for container styles if needed

export default function Whiteboard({ roomId = 'global', isReadOnly = false }) {
  const [featureConfig, setFeatureConfig] = useState(null);

  useEffect(() => {
    // Fetch feature config to check governance
    apiClient.get('/features/config').then(res => {
      // Expecting { whiteboard: { config: ... }, ... } or similar
      if (Array.isArray(res.data)) {
        const wbFeature = res.data.find(f => f.name === 'whiteboard');
        if (wbFeature) setFeatureConfig(wbFeature.config);
      } else if (res.data.whiteboard) {
        setFeatureConfig(res.data.whiteboard.config || res.data.whiteboard);
      }
    }).catch(err => console.error("Failed to load flags", err));
  }, []);

  const store = useYjsStore({
    roomId: roomId,
    hostUrl: getCollabUrl(),
  });

  const [saving, setSaving] = useState(false);

  // Computed ReadOnly State (Prop + Feature Flag)
  const effectiveReadOnly = isReadOnly || (featureConfig?.collaboration_enabled === false) || false;

  const handleSnapshotSave = async () => {
    if (effectiveReadOnly) return;
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

  // Auto-save every 60 seconds
  useEffect(() => {
    if (effectiveReadOnly) return;
    const interval = setInterval(() => {
      if (store) handleSnapshotSave();
    }, 60000);
    return () => clearInterval(interval);
  }, [store, roomId, effectiveReadOnly]);

  const [editor, setEditor] = useState(null);

  // Update Tldraw ReadOnly State dynamically
  useEffect(() => {
    if (editor) {
      editor.updateInstanceState({ isReadonly: effectiveReadOnly });
    }
  }, [editor, effectiveReadOnly]);

  return (
    <div className="whiteboard-container" style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <Tldraw
        store={store}
        onMount={(app) => {
          setEditor(app);
          app.updateInstanceState({ isReadonly: effectiveReadOnly });
        }}
      />
      {!effectiveReadOnly && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 300 }}>
          <button onClick={handleSnapshotSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 transition-colors">
            <FiSave />
            {saving ? 'Saving...' : 'Save Snapshot'}
          </button>
        </div>
      )}
      {effectiveReadOnly && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 300, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '5px 10px', borderRadius: 5 }}>
          <span className="text-xs font-bold">Read Only Mode</span>
        </div>
      )}
    </div>
  );
}
