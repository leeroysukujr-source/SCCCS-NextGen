import React, { useState, useEffect } from 'react';
import { FiClock, FiRotateCcw, FiTag, FiX, FiCheck, FiSave } from 'react-icons/fi';
import apiClient from '../../api/client';

const VersionHistorySidebar = ({ docId, isOpen, onClose, onRestore }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [labelingId, setLabelingId] = useState(null);
    const [tempLabel, setTempLabel] = useState('');

    const fetchVersions = async () => {
        if (!docId) return;
        setLoading(true);
        try {
            const res = await apiClient.get(`/documents/${docId}/versions`);
            setVersions(res.data);
        } catch (err) {
            console.error("Failed to fetch versions", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchVersions();
    }, [isOpen, docId]);

    const handleRestore = async (v) => {
        if (window.confirm(`Restore to "${v.label || `Version ${v.version_number}`}"? Current unsaved changes will be lost.`)) {
            try {
                await apiClient.post(`/documents/${docId}/restore/${v.id}`);
                if (onRestore) onRestore(v);
                onClose();
            } catch (err) {
                console.error("Failed to restore", err);
            }
        }
    };

    const takeSnapshot = async () => {
        const label = prompt("Enter a label for this version (optional):", `Snapshot ${new Date().toLocaleTimeString()}`);
        if (label === null) return;

        try {
            await apiClient.post(`/documents/${docId}/versions`, { label });
            fetchVersions();
        } catch (err) {
            console.error("Failed to save version", err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 z-[100] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FiClock className="text-indigo-500" size={20} />
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">Version History</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <FiX size={20} />
                </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/50">
                <button
                    onClick={takeSnapshot}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    <FiSave size={14} /> Create New Snapshot
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Loading history...</span>
                    </div>
                ) : versions.length === 0 ? (
                    <div className="text-center py-20">
                        <FiClock className="mx-auto text-slate-100 dark:text-slate-800 mb-4" size={48} />
                        <p className="text-xs text-slate-400 italic">No snapshots saved yet.</p>
                    </div>
                ) : (
                    versions.map((v) => (
                        <div key={v.id} className="group bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:border-indigo-500/50 hover:shadow-md transition-all relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                    <FiTag size={12} />
                                </div>
                                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter">#{v.version_number}</span>
                            </div>

                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 line-clamp-1">{v.label || `Version ${v.version_number}`}</h4>
                            <p className="text-[10px] text-slate-400 font-medium mb-4">{new Date(v.created_at).toLocaleString()}</p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRestore(v)}
                                    className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <FiRotateCcw size={10} /> Restore
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">
                    Snapshots create a permanent record of the document's state. Restoring will replace the current active content for all collaborators.
                </p>
            </div>
        </div>
    );
};

export default VersionHistorySidebar;
