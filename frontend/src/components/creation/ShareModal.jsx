import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiSearch, FiUserPlus, FiLayers, FiLink, FiMail, FiChevronDown, FiGlobe, FiLock, FiUsers } from 'react-icons/fi';
import apiClient from '../../api/client';

const ShareModal = ({ docId, title, type, onClose }) => {
    const [activeTab, setActiveTab] = useState('direct'); // 'direct', 'class'
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('view');
    const [linkSharing, setLinkSharing] = useState('private'); // 'private', 'workspace', 'public'
    const [classes, setClasses] = useState([]);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [sharedWith, setSharedWith] = useState([]);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            apiClient.get('/classes'),
            apiClient.get(`/documents/${docId}/permissions`),
            apiClient.get(`/documents/${docId}`).then(res => setLinkSharing(res.data.visibility))
        ]).then(([clsRes, permRes]) => {
            setClasses(clsRes.data);
            setSharedWith(permRes.data);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load sharing info", err);
            setLoading(false);
        });
    }, [docId]);

    const handleLinkShareChange = async (newVal) => {
        setActionLoading(true);
        try {
            await apiClient.put(`/documents/${docId}`, { visibility: newVal });
            setLinkSharing(newVal);
            setSuccess("Link sharing updated");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.error || "Failed to update link sharing");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDirectShare = async () => {
        setActionLoading(true);
        try {
            await apiClient.post(`/documents/${docId}/share`, { email, access_level: role });
            setSuccess(`Shared with ${email}`);
            setEmail('');
            setTimeout(() => setSuccess(null), 3000);

            // Refresh permissions
            const res = await apiClient.get(`/documents/${docId}/permissions`);
            setSharedWith(res.data);
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.error || "Sharing failed. Ensure this is a registered institutional email.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleClassPublish = async () => {
        setActionLoading(true);
        try {
            await apiClient.put(`/documents/${docId}`, { visibility: 'workspace' });
            const promises = selectedClasses.map(classId => {
                return apiClient.post(`/lessons/class/${classId}`, {
                    title: title,
                    description: `Shared via Creation Hub`,
                    content: `[View Document](/documents/${docId}/view)`,
                    due_date: null
                });
            });
            await Promise.all(promises);
            setSuccess(`Published to ${selectedClasses.length} classes`);
            setTimeout(onClose, 1500);
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 scale-in-center">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black dark:text-white flex items-center gap-3">
                            <FiUsers className="text-indigo-500" /> Share Content
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 italic">{title}</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"><FiX size={20} /></button>
                </div>

                {/* Tabs */}
                <div className="px-8 flex gap-4 border-b border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('direct')}
                        className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'direct' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Direct Share
                        {activeTab === 'direct' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('class')}
                        className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'class' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Class Publish
                        {activeTab === 'class' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 overflow-y-auto max-h-[60vh] space-y-6">
                    {activeTab === 'direct' ? (
                        <div className="space-y-6">
                            {/* Invitation Input */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <FiMail className="absolute left-4 top-4 text-slate-400" />
                                    <input
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                        placeholder="Add people by email..."
                                    />
                                </div>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-800 px-4 rounded-2xl font-bold text-xs focus:outline-none"
                                >
                                    <option value="view">Viewer</option>
                                    <option value="comment">Commenter</option>
                                    <option value="edit">Editor</option>
                                    <option value="manage">Manager</option>
                                </select>
                                <button
                                    onClick={handleDirectShare}
                                    disabled={!email || actionLoading}
                                    className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg transition-all"
                                >
                                    <FiUserPlus size={20} />
                                </button>
                            </div>

                            {/* Link Sharing Settings */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">General access</h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-indigo-600 shadow-sm">
                                        {linkSharing === 'private' ? <FiLock size={18} /> : linkSharing === 'workspace' ? <FiUsers size={18} /> : <FiGlobe size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <select
                                            value={linkSharing}
                                            onChange={e => handleLinkShareChange(e.target.value)}
                                            className="bg-transparent font-bold text-sm dark:text-white focus:outline-none cursor-pointer hover:underline"
                                        >
                                            <option value="private">Restricted (Only invited people)</option>
                                            <option value="workspace">Workspace (Anyone in institutional domain)</option>
                                            <option value="public">Public (Anyone with link)</option>
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1">Change how this document is accessed from the link.</p>
                                    </div>
                                    <button className="p-2.5 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-indigo-600 hover:text-indigo-700 transition-all">
                                        <FiLink size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* User List */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shared with</h3>
                                {sharedWith.map((perm, i) => (
                                    <div key={perm.id} className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                            {perm.username?.charAt(0).toUpperCase() || perm.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold dark:text-white">{perm.username || perm.email}</p>
                                            <p className="text-[10px] text-slate-400">{perm.email}</p>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">{perm.access_level}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                <FiSearch className="absolute left-4 top-4 text-slate-400" />
                                <input className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl focus:outline-none font-medium text-sm" placeholder="Search my courses..." />
                            </div>
                            <div className="space-y-2">
                                {classes.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => {
                                            if (selectedClasses.includes(cls.id)) setSelectedClasses(selectedClasses.filter(c => c !== cls.id));
                                            else setSelectedClasses([...selectedClasses, cls.id]);
                                        }}
                                        className={`w-full flex items-center p-4 rounded-3xl transition-all border ${selectedClasses.includes(cls.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center mr-4 transition-all ${selectedClasses.includes(cls.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                            {selectedClasses.includes(cls.id) && <FiCheck size={12} />}
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="font-bold text-sm dark:text-white">{cls.name}</div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{cls.code}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {success && <div className="mb-4 text-center text-xs font-bold text-green-600 animate-bounce">{success}</div>}
                    <button
                        onClick={activeTab === 'direct' ? onClose : handleClassPublish}
                        disabled={actionLoading}
                        className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[24px] font-black text-sm shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                        {actionLoading ? 'Processing...' : activeTab === 'direct' ? 'Done' : `Publish to ${selectedClasses.length} Courses`}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default ShareModal;
