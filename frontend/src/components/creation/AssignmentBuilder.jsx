import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { FiSave, FiArrowRight, FiPlus, FiTrash2, FiPieChart, FiCalendar, FiSearch, FiFileText, FiInfo, FiUpload, FiCheck, FiX, FiUser, FiCheckCircle, FiZap } from 'react-icons/fi';
import { useNotify } from '../NotificationProvider';

const AssignmentBuilder = ({ docId, onBack }) => {
    const [searchParams] = useSearchParams();
    const channelId = searchParams.get('channel');
    const user = useAuthStore(state => state.user);
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [points, setPoints] = useState(100);
    const [instructions, setInstructions] = useState('');
    const [rubric, setRubric] = useState([]);
    const [groupConfig, setGroupConfig] = useState({ enabled: false, mode: 'random', groupCount: 5, groupSize: null });
    const [assignmentId, setAssignmentId] = useState(null);
    const [matchedStudents, setMatchedStudents] = useState([]);
    const [manualGroups, setManualGroups] = useState([]);
    const [unassignedPool, setUnassignedPool] = useState([]);
    const [importing, setImporting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showRubricSelector, setShowRubricSelector] = useState(false);
    const [availableRubrics, setAvailableRubrics] = useState([]);
    const [jurisdictionCount, setJurisdictionCount] = useState(0);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [allocating, setAllocating] = useState(false);
    const notify = useNotify();

    useEffect(() => {
        if (docId && docId !== 'new') {
            apiClient.get(`/documents/${docId}`).then(res => {
                setTitle(res.data.title);
                if (res.data.content) {
                    try {
                        const parsed = JSON.parse(res.data.content);
                        setDueDate(parsed.dueDate || '');
                        setPoints(parsed.points || 100);
                        setInstructions(parsed.instructions || '');
                        setRubric(parsed.rubric || []);
                        setGroupConfig(parsed.groupConfig || { enabled: false, mode: 'random', groupCount: 5, groupSize: null });
                        setAssignmentId(parsed.assignmentId || null);
                    } catch (e) {
                        setInstructions(res.data.content);
                    }
                }
            });
        }

        if (channelId) {
            apiClient.get(`/channels/${channelId}/members`).then(res => {
                const students = res.data.filter(m => (m.user?.role === 'student' || m.role === 'student'));
                setJurisdictionCount(students.length);
            });
        } else {
            // Get all students in workspace as fallback
            apiClient.get(`/users`).then(res => {
                const students = res.data.filter(u => u.role === 'student');
                setJurisdictionCount(students.length);
            });
        }
    }, [docId, channelId]);

    const fetchRubrics = () => {
        apiClient.get('/documents/?type=rubric').then(res => setAvailableRubrics(res.data));
    };

    const handleImportRubric = (r) => {
        try {
            const content = JSON.parse(r.content);
            // Conversion if needed, but they should share the same criteria structure
            setRubric(content.criteria || []);
            setShowRubricSelector(false);
        } catch (e) { console.error(e); }
    };

    const handleAddRubric = () => {
        setRubric([...rubric, { criteria: '', points: 0, description: '' }]);
    };

    const updateRubric = (index, key, value) => {
        const newRubric = [...rubric];
        newRubric[index][key] = value;
        setRubric(newRubric);
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'))
                .flatMap(l => l.split(/[,;\t]/).map(c => c.trim()));

            const identifiers = [...new Set(lines)];
            if (identifiers.length === 0) return;

            const wsId = user.workspace_id;
            const res = await apiClient.post(`/workspaces/${wsId}/match-users`, { identifiers });
            if (res.data) {
                setMatchedStudents(res.data);
                setUnassignedPool(res.data);
                setManualGroups([[], [], []]);
            }
        } catch (err) {
            console.error(err);
            alert("Import failed");
        } finally {
            setImporting(false);
        }
    };

    const handleDragStart = (e, student, source) => {
        e.dataTransfer.setData('student', JSON.stringify(student));
        e.dataTransfer.setData('source', source);
    };

    const handleDrop = (e, targetGroupIdx) => {
        e.preventDefault();
        const student = JSON.parse(e.dataTransfer.getData('student'));
        const source = e.dataTransfer.getData('source');

        if (source === 'pool') {
            setUnassignedPool(prev => prev.filter(s => s.id !== student.id));
        } else {
            const oldGroupIdx = parseInt(source);
            setManualGroups(prev => {
                const newGroups = [...prev];
                newGroups[oldGroupIdx] = newGroups[oldGroupIdx].filter(s => s.id !== student.id);
                return newGroups;
            });
        }

        setManualGroups(prev => {
            const newGroups = [...prev];
            if (!newGroups[targetGroupIdx]) newGroups[targetGroupIdx] = [];
            if (!newGroups[targetGroupIdx].find(s => s.id === student.id)) {
                newGroups[targetGroupIdx].push(student);
            }
            return newGroups;
        });
    };

    const addGroup = () => setManualGroups([...manualGroups, []]);
    const removeGroup = (idx) => {
        const group = manualGroups[idx];
        setUnassignedPool(prev => [...prev, ...group]);
        setManualGroups(prev => prev.filter((_, i) => i !== idx));
    };

    const handleGenerateReport = async () => {
        if (!assignmentId) return;
        setGeneratingReport(true);
        try {
            const res = await apiClient.post(`/assignments/${assignmentId}/generate_report`);
            notify('success', 'Report generated successfully and saved to your vault!');
            // Optionally download it immediately
            // window.open(`${apiClient.defaults.baseURL}/files/${res.data.id}?token=${useAuthStore.getState().token}`, '_blank');
        } catch (err) {
            console.error(err);
            notify('error', 'Failed to generate report');
        } finally {
            setGeneratingReport(false);
        }
    };

    const handleGenerateGroupStructure = async () => {
        if (!assignmentId) {
            alert("Please save the assignment as a draft or publish it first to generate groups.");
            return;
        }
        
        const groupPayload = {
            mode: 'self_signup',
            group_count: groupConfig.groupCount,
            group_size: groupConfig.groupSize
        };

        try {
            await apiClient.post(`/assignments/${assignmentId}/groups`, groupPayload);
            notify('success', `${groupConfig.groupCount} empty groups created successfully.`);
        } catch (err) {
            notify('error', 'Failed to generate group structure');
        }
    };

    const handleMagicAllocate = async () => {
        if (!assignmentId) return notify('error', 'Please save/publish first');
        setAllocating(true);
        try {
            const res = await apiClient.post(`/assignments/${assignmentId}/auto-allocate`);
            notify('success', `Magic complete! ${res.data.allocated_count} students allocated.`);
            // Refresh counts if needed or just show success
        } catch (err) {
            notify('error', err.response?.data?.error || 'Magic failed');
        } finally {
            setAllocating(false);
        }
    };

    const handleSave = async (statusArg = 'draft') => {
        if (!title.trim()) return alert("Please add a title");

        try {
            setSaving(true);
            let currentAsgId = assignmentId;

            const asgPayload = {
                title,
                description: instructions,
                due_date: (dueDate && dueDate.trim() !== '') ? new Date(dueDate).toISOString() : null,
                status: statusArg,
                channel_id: channelId,
                settings: { rubric, groupConfig }
            };

            if (currentAsgId) {
                await apiClient.put(`/assignments/${currentAsgId}`, asgPayload);
            } else if (statusArg === 'published') {
                const res = await apiClient.post('/assignments/', asgPayload);
                currentAsgId = res.data.id;
                setAssignmentId(currentAsgId);
            }

            if (currentAsgId && groupConfig.enabled && statusArg === 'published') {
                const groupPayload = {
                    mode: groupConfig.mode,
                    group_count: groupConfig.groupCount,
                    group_size: groupConfig.groupSize
                };

                if (groupConfig.mode === 'manual') {
                    groupPayload.manual_groups = manualGroups.map(g => g.map(u => u.id));
                } else if (matchedStudents.length > 0) {
                    groupPayload.student_ids = matchedStudents.map(u => u.id);
                }

                await apiClient.post(`/assignments/${currentAsgId}/groups`, groupPayload);

                // Launch rooms automatically (Group Study Rooms)
                try {
                    await apiClient.post(`/assignments/${currentAsgId}/launch-rooms`, {});
                } catch (e) { console.warn("Room launch failed", e); }
            }

            const payload = {
                title,
                content: JSON.stringify({ dueDate, points, instructions, rubric, groupConfig, assignmentId: currentAsgId }),
                doc_type: 'assignment',
                visibility: statusArg === 'published' ? 'workspace' : 'private',
                status: 'active'
            };

            if (docId && docId !== 'new') {
                await apiClient.put(`/documents/${docId}`, payload);
            } else {
                await apiClient.post('/documents/', payload);
            }
            onBack();
        } catch (e) {
            console.error(e);
            alert("Failed to save assignment. Check network.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto font-sans">
            <div className="max-w-5xl mx-auto w-full p-8 lg:p-12 space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"><FiArrowRight size={24} /></button>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Assignment Builder</h1>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <FiCalendar className="text-indigo-500" /> Assessment Design Control
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => handleSave('draft')} disabled={saving} className="px-6 py-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[24px] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-black text-xs uppercase tracking-widest transition-all">
                            Save Draft
                        </button>
                        <button onClick={() => handleSave('published')} disabled={saving} className="px-10 py-4 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all">
                            <FiSave size={18} /> {saving ? 'SYNCING...' : 'Publish'}
                        </button>
                        {assignmentId && (
                            <button 
                                onClick={handleGenerateReport} 
                                disabled={generatingReport}
                                className="px-6 py-4 bg-green-600 text-white rounded-[24px] shadow-2xl shadow-green-500/30 hover:bg-green-700 font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all"
                            >
                                <FiFileText size={18} /> {generatingReport ? 'GENERATING...' : 'Generate Final Report'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Settings */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8 transition-all hover:shadow-xl">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Title</label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Enter assignment Title..."
                                    className="w-full px-6 py-4 rounded-[20px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-lg font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Instructions</label>
                                <textarea
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                    rows={8}
                                    className="w-full px-6 py-4 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none leading-relaxed"
                                    placeholder="Outline the steps and requirements for students..."
                                />
                            </div>
                        </div>

                        {/* Rubric Card */}
                        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8 transition-all hover:shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16"></div>
                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6">
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Grading Rubric</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assessment Criteria & Weights</p>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => { setShowRubricSelector(true); fetchRubrics(); }}
                                        className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline px-2"
                                    >
                                        Import Existing
                                    </button>
                                    <button onClick={handleAddRubric} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                                        + Manual Entry
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {rubric.length === 0 && (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-300 space-y-4">
                                        <FiPieChart size={48} className="opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No rubric attached</p>
                                    </div>
                                )}
                                {rubric.map((item, idx) => (
                                    <div key={idx} className="flex gap-6 items-start p-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-[28px] border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-all group">
                                        <div className="flex-1 space-y-3">
                                            <input
                                                placeholder="Criteria Name (e.g., Analysis)"
                                                value={item.criteria || item.name}
                                                onChange={e => updateRubric(idx, 'criteria', e.target.value)}
                                                className="w-full bg-transparent font-black text-sm border-none outline-none text-slate-800 dark:text-white"
                                            />
                                            <textarea
                                                placeholder="Level descriptors..."
                                                value={item.description}
                                                onChange={e => updateRubric(idx, 'description', e.target.value)}
                                                rows={1}
                                                className="w-full bg-transparent text-xs text-slate-400 font-medium border-none outline-none resize-none"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <input
                                                type="number"
                                                placeholder="Pts"
                                                value={item.points || item.weight}
                                                onChange={e => updateRubric(idx, 'points', e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 text-center text-xs font-black text-indigo-600 shadow-inner"
                                            />
                                        </div>
                                        <button onClick={() => setRubric(rubric.filter((_, i) => i !== idx))} className="p-3 text-slate-300 hover:text-red-500 rounded-xl transition-all"><FiTrash2 size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Group Configuration Card */}
                        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8 transition-all hover:shadow-xl relative overflow-hidden mt-8">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full -ml-16 -mt-16"></div>
                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6">
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Group Formation Rules</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Automated allocation heuristics</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Enable Automated Creation</span>
                                    <button
                                        onClick={() => setGroupConfig({ ...groupConfig, enabled: !groupConfig.enabled })}
                                        className={`w-12 h-6 rounded-full transition-all ${groupConfig.enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-all mt-1 ml-1 ${groupConfig.enabled ? 'translate-x-6' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {groupConfig.enabled && (
                                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setGroupConfig({ ...groupConfig, mode: 'random' })}
                                            className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${groupConfig.mode === 'random' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                                        >Auto-Random</button>
                                        <button
                                            onClick={() => setGroupConfig({ ...groupConfig, mode: 'self_signup' })}
                                            className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${groupConfig.mode === 'self_signup' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                                        >Self-Signup</button>
                                        <button
                                            onClick={() => setGroupConfig({ ...groupConfig, mode: 'manual' })}
                                            className={`flex-1 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${groupConfig.mode === 'manual' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                                        >Manual</button>
                                    </div>

                                    {(groupConfig.mode === 'random' || groupConfig.mode === 'self_signup') && (
                                        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                            <p className="text-xs font-bold text-slate-500 mb-2">
                                                {groupConfig.mode === 'random' ? 'Strategy' : 'Target Distribution'}
                                            </p>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="strategy"
                                                        checked={!!groupConfig.groupCount}
                                                        onChange={() => setGroupConfig({ ...groupConfig, groupCount: 5, groupSize: groupConfig.groupSize })}
                                                    />
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total Groups</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="strategy"
                                                        checked={!!groupConfig.groupSize}
                                                        onChange={() => setGroupConfig({ ...groupConfig, groupSize: 5, groupCount: groupConfig.groupCount })}
                                                    />
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Max Students per Group</span>
                                                </label>
                                            </div>

                                            <div className="pt-2 flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Number of Groups</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={groupConfig.groupCount || ''}
                                                        onChange={(e) => setGroupConfig({ ...groupConfig, groupCount: parseInt(e.target.value) })}
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-800"
                                                        placeholder="e.g., 5"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Max Students Per Group</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={groupConfig.groupSize || ''}
                                                        onChange={(e) => setGroupConfig({ ...groupConfig, groupSize: parseInt(e.target.value) })}
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-800"
                                                        placeholder="e.g., 4"
                                                    />
                                                </div>
                                            </div>

                                            {/* Capacity Logic & Suggester */}
                                            {groupConfig.groupCount && groupConfig.groupSize && (
                                                <div className="p-4 rounded-xl border transition-all duration-300 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capacity Check</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Jurisdiction: {jurisdictionCount} Students</span>
                                                    </div>
                                                    
                                                    { (groupConfig.groupCount * groupConfig.groupSize) < jurisdictionCount ? (
                                                        <div className="flex items-start gap-3 text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                                                            <FiInfo className="mt-1" />
                                                            <div className="flex-1">
                                                                <p className="text-xs font-bold leading-tight">Insufficient Capacity</p>
                                                                <p className="text-[10px] mt-1 opacity-80 leading-relaxed font-medium">
                                                                    Total capacity ({groupConfig.groupCount * groupConfig.groupSize}) is less than total students ({jurisdictionCount}).
                                                                    Some students will not be able to join a group.
                                                                </p>
                                                                <button 
                                                                    onClick={() => setGroupConfig({ ...groupConfig, groupCount: Math.ceil(jurisdictionCount / groupConfig.groupSize) })}
                                                                    className="mt-2 text-[10px] font-black underline uppercase"
                                                                >
                                                                    Suggest Optimal: {Math.ceil(jurisdictionCount / groupConfig.groupSize)} Groups
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3 text-green-600 bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-200 dark:border-green-800">
                                                            <FiCheckCircle />
                                                            <p className="text-[10px] font-bold uppercase tracking-widest">System Validated: {groupConfig.groupCount * groupConfig.groupSize} slots available</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="pt-4 flex flex-col gap-3 items-center">
                                                <button 
                                                    onClick={handleGenerateGroupStructure}
                                                    className="w-full px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                                                >
                                                    Generate Structure
                                                </button>
                                                
                                                {assignmentId && (
                                                    <button 
                                                        onClick={handleMagicAllocate}
                                                        disabled={allocating}
                                                        className="w-full px-8 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <FiZap className={allocating ? "animate-pulse" : ""} />
                                                        {allocating ? 'CASTING MAGIC...' : 'Magic Auto-Allocate'}
                                                    </button>
                                                )}
                                            </div>

                                            {groupConfig.mode === 'random' && (
                                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                                                    <p className="text-xs font-bold text-slate-500 mb-2">Population</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button onClick={() => setMatchedStudents([])} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${matchedStudents.length === 0 ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-200 text-slate-500'}`}>
                                                            All Students
                                                        </button>
                                                        <label className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${matchedStudents.length > 0 ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-200 text-slate-500'}`}>
                                                            <FiUpload /> {importing ? ' scanning...' : 'Limit by Upload'}
                                                            <input type="file" className="hidden" accept=".csv,.txt" onChange={handleImport} />
                                                        </label>
                                                    </div>
                                                    {matchedStudents.length > 0 && <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-2"><FiCheck className="bg-green-100 rounded-full p-0.5" /> Will process {matchedStudents.length} specific students</p>}
                                                </div>
                                            )}
                                            {groupConfig.mode === 'self_signup' && (
                                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                                                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl">
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2">
                                                            <FiInfo /> Student Portal View
                                                        </p>
                                                        <p className="text-[11px] text-indigo-400 mt-1 font-medium">
                                                            Empty rooms will be created. Students will choose their group upon entering the assignment space.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {groupConfig.mode === 'manual' && (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                            {/* Import Section */}
                                            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                                                <div className="flex justify-between items-center mb-4">
                                                    <p className="text-xs font-bold text-slate-500 uppercase">1. Import Student List (CSV/Text)</p>
                                                    <label className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                                                        <FiUpload /> {importing ? 'Scanning...' : 'Upload File'}
                                                        <input type="file" className="hidden" accept=".csv,.txt" onChange={handleImport} />
                                                    </label>
                                                </div>
                                                {matchedStudents.length > 0 && <p className="text-xs text-green-500 font-bold">✓ {matchedStudents.length} students identified</p>}
                                            </div>

                                            {/* Manual Editor */}
                                            <div className="grid grid-cols-2 gap-4 h-[400px]">
                                                {/* Unassigned */}
                                                <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl p-4 overflow-y-auto border border-dashed border-slate-300 dark:border-slate-800">
                                                    <h4 className="text-xs font-black uppercase text-slate-400 mb-4 sticky top-0 bg-slate-100 dark:bg-slate-950 py-2">Unassigned ({unassignedPool.length})</h4>
                                                    <div className="space-y-2">
                                                        {unassignedPool.map(s => (
                                                            <div draggable onDragStart={(e) => handleDragStart(e, s, 'pool')} key={s.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-move hover:border-indigo-400 hover:shadow-md transition-all">
                                                                <p className="text-xs font-bold truncate">{s.first_name} {s.last_name}</p>
                                                                <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Groups */}
                                                <div className="space-y-4 overflow-y-auto pr-2">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="text-xs font-black uppercase text-slate-400">Groups</h4>
                                                        <button onClick={addGroup} className="text-xs text-indigo-500 font-bold hover:underline">+ Add Group</button>
                                                    </div>
                                                    {manualGroups.map((group, gIdx) => (
                                                        <div
                                                            key={gIdx}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={(e) => handleDrop(e, gIdx)}
                                                            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[100px] transition-all hover:border-indigo-200"
                                                        >
                                                            <div className="flex justify-between mb-2 pb-2 border-b border-slate-50 dark:border-slate-800">
                                                                <span className="text-xs font-bold text-slate-600">Group {gIdx + 1} <span className="text-slate-300 font-normal">({group.length})</span></span>
                                                                <button onClick={() => removeGroup(gIdx)} className="text-slate-300 hover:text-red-500 transition-colors"><FiTrash2 size={12} /></button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {group.map(s => (
                                                                    <div draggable onDragStart={(e) => handleDragStart(e, s, gIdx)} key={s.id} className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-500/30 cursor-move">
                                                                        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 truncate">{s.first_name} {s.last_name}</p>
                                                                    </div>
                                                                ))}
                                                                {group.length === 0 && <p className="text-[10px] text-slate-300 text-center italic py-2">Drop students here</p>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Settings */}
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 pb-4">Logistics</h3>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">Due Date</label>
                                <input
                                    type="datetime-local"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="w-full px-4 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-xs focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">Max Grade</label>
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <input
                                        type="number"
                                        value={points}
                                        onChange={e => setPoints(e.target.value)}
                                        className="w-full bg-transparent text-center font-black text-lg text-slate-800 dark:text-white outline-none"
                                    />
                                    <span className="text-[10px] font-black text-slate-400 pr-4">PTS</span>
                                </div>
                            </div>

                            <div className="pt-4">
                                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[24px] border border-indigo-100 dark:border-indigo-900/30">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <FiInfo /> Publishing Rule
                                    </p>
                                    <p className="text-[11px] text-indigo-500 font-medium leading-relaxed">
                                        Saving will make this assignment visible in the creation hub. Publish to a course via the share menu to enable student submissions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rubric Selector Modal */}
            {showRubricSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-6">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Select Workspace Rubric</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Import institutional standards</p>
                            </div>
                            <button onClick={() => setShowRubricSelector(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Close</button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto">
                            {availableRubrics.length === 0 && <p className="text-center text-slate-400 font-bold py-10 uppercase text-xs tracking-widest">No rubrics found in your workspace.</p>}
                            {availableRubrics.map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => handleImportRubric(r)}
                                    className="p-6 rounded-[28px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-indigo-500 cursor-pointer flex justify-between items-center group transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                                            <FiFileText size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{r.title}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last updated {new Date(r.updated_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all shadow-lg">Import</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssignmentBuilder;
