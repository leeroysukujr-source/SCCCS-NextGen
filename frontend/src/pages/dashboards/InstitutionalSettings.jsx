import React, { useEffect, useState } from 'react';

import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import {
    FiSave,
    FiRefreshCw,
    FiSettings,
    FiCheckCircle,
    FiAlertCircle,
    FiLock,
    FiUnlock,
    FiSearch,
    FiRotateCcw,
    FiMonitor,
    FiShield,
    FiMessageSquare,
    FiZap,
    FiEdit3,
    FiBookOpen
} from 'react-icons/fi';

const RESTRICTED_KEYS = ['APP_NAME', 'SYSTEM_LOGO_URL', 'SYSTEM_EMAIL', 'FOOTER_TEXT'];

const InstitutionalSettings = () => {
    const { user, updateUser } = useAuthStore();
    const { settings, fetchInstitutionalSettings, updateInstitutionalSetting, updateWorkspaceDetails, loading } = useSettingsStore();
    const [localValues, setLocalValues] = useState({});
    const [updateStatus, setUpdateStatus] = useState({ key: null, status: null });

    // Advanced State
    const [activeCategory, setActiveCategory] = useState('all');
    const [isConfigMode, setIsConfigMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSynced, setLastSynced] = useState(null);
    const [workspaceName, setWorkspaceName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);

    useEffect(() => {
        if (user?.workspace_name) {
            setWorkspaceName(user.workspace_name);
        }
    }, [user?.workspace_name]);

    useEffect(() => {
        if (user?.workspace_id) {
            handleSync();
        }
    }, [user?.workspace_id, fetchInstitutionalSettings]);

    useEffect(() => {
        const values = {};
        settings.forEach(s => {
            values[s.key] = s.value;
        });
        setLocalValues(values);
    }, [settings]);

    const handleSync = async () => {
        if (user?.workspace_id) {
            await fetchInstitutionalSettings(user.workspace_id);
            setLastSynced(new Date());
        }
    };

    const handleInputChange = (key, value, type) => {
        if (!isConfigMode) return; // Prevent edits in View Mode

        let finalValue = value;
        if (type === 'int') finalValue = parseInt(value, 10) || 0;
        if (type === 'float') finalValue = parseFloat(value) || 0;
        if (type === 'bool') finalValue = value === 'true' || value === true;

        setLocalValues(prev => ({ ...prev, [key]: finalValue }));
    };

    const handleSave = async (key) => {
        setUpdateStatus({ key, status: 'saving' });
        const result = await updateInstitutionalSetting(user.workspace_id, key, localValues[key]);
        if (result.success) {
            setUpdateStatus({ key, status: 'success' });
            setTimeout(() => setUpdateStatus({ key: null, status: null }), 3000);
        } else {
            setUpdateStatus({ key, status: 'error' });
        }
    };


    const handleRevert = async (key) => {
        if (!window.confirm('Are you sure you want to revert this setting to the global default?')) return;
        alert("Reverting to global default requires clearing the override. Please contact Super Admin or manually set the value to match Global Default.");
    };

    const handleUpdateWorkspaceName = async () => {
        if (!workspaceName.trim() || workspaceName === user.workspace_name) return;

        setIsSavingName(true);
        const result = await updateWorkspaceDetails(user.workspace_id, { name: workspaceName });
        setIsSavingName(false);

        if (result.success) {
            updateUser({ workspace_name: workspaceName });
            // Optional: Show success toast
        } else {
            alert("Failed to update workspace name");
        }
    };

    // Derived State for UI
    const categories = [
        { id: 'all', label: 'All Settings', icon: <FiZap /> },
        { id: 'general', label: 'General', icon: <FiSettings /> },
        { id: 'security', label: 'Security', icon: <FiShield /> },
        { id: 'ui_ux', label: 'Interface', icon: <FiMonitor /> },
        { id: 'communication', label: 'Communication', icon: <FiMessageSquare /> },
        { id: 'academic', label: 'Academic', icon: <FiBookOpen /> },
    ];

    const filteredSettings = settings.filter(s => {
        const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
        const matchesSearch = s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    if (loading && settings.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    <p className="text-slate-500 animate-pulse">Loading Configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
            {/* Advanced Header Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
                    <FiSettings className="w-64 h-64 text-indigo-400" />
                </div>

                <div className="p-8 relative z-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Institutional Matrix</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${isConfigMode ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                                    {isConfigMode ? 'Edit Mode Active' : 'Read-Only View'}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg flex items-center gap-2">
                                Configure the operational parameters for
                                {isConfigMode ? (
                                    <div className="relative inline-block group/input">
                                        <input
                                            value={workspaceName}
                                            onChange={(e) => setWorkspaceName(e.target.value)}
                                            onBlur={handleUpdateWorkspaceName}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateWorkspaceName()}
                                            className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700/50 border-b-2 border-indigo-500 px-2 py-0.5 rounded focus:outline-none focus:bg-white dark:focus:bg-slate-800 min-w-[200px]"
                                        />
                                        <FiEdit3 className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        {isSavingName && <FiRefreshCw className="absolute -right-6 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />}
                                    </div>
                                ) : (
                                    <strong className="text-slate-900 dark:text-white border-b border-indigo-500/50 pb-0.5">
                                        {user?.workspace_name || 'this institution'}
                                    </strong>
                                )}
                                .
                            </p>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/50 backdrop-blur-md">
                            <button
                                onClick={handleSync}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Pull latest global definitions"
                            >
                                <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Sync</span>
                            </button>
                            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700"></div>
                            <button
                                onClick={() => setIsConfigMode(!isConfigMode)}
                                className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-all shadow-sm ${isConfigMode
                                    ? 'bg-indigo-600 text-white shadow-indigo-900/20 hover:bg-indigo-500'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                                    }`}
                            >
                                <FiCheckCircle className={isConfigMode ? 'block' : 'hidden'} />
                                {isConfigMode ? 'Done Configuring' : 'Config Mode'}
                            </button>
                        </div>
                    </div>

                    {lastSynced && (
                        <p className="text-xs text-slate-500 mt-4 font-mono flex items-center gap-1.5">
                            <FiCheckCircle className="text-emerald-500" />
                            Last Synced: {lastSynced.toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {/* Search & Navigation Bar */}
                <div className="bg-slate-100 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700/50 px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat.id
                                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                                    }`}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64 group">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find setting..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pl-10 pr-4 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-600 transition-all font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="grid grid-cols-1 gap-4">
                {filteredSettings.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                            <FiSearch className="text-slate-400 dark:text-slate-500 text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Settings Found</h3>
                        <p className="text-slate-500 dark:text-slate-400">Try adjusting your category filter or search query.</p>
                        <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); }} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-bold underline">Clear Filters</button>
                    </div>
                ) : (
                    filteredSettings.map(setting => {
                        const isSuperAdmin = user?.platform_role === 'SUPER_ADMIN';

                        // User Request: Config Mode should unlock everything for editing, allowing Workspace Admins to create overrides.
                        // EXCEPTION: Certain keys like APP_NAME must remain locked for non-super admins.
                        const isRestricted = !isSuperAdmin && RESTRICTED_KEYS.includes(setting.key);
                        const canEdit = isConfigMode && !isRestricted;

                        // Visual lock: Only show locked if NOT in config mode and not restricted
                        // OR if it IS restricted and we are not a super admin.
                        const isLocked = (!isConfigMode && !isSuperAdmin && !setting.is_overridable && !setting.is_overridden) || isRestricted;

                        return (
                            <div key={setting.key} className={`relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 group overflow-hidden ${isLocked
                                ? 'border-slate-200 dark:border-slate-700/50 opacity-75 grayscale-[0.3]'
                                : canEdit
                                    ? 'border-indigo-500/30 shadow-lg shadow-indigo-900/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}>
                                {/* Status Indicator Sidebar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isLocked ? 'bg-slate-300 dark:bg-slate-600' : setting.is_overridden ? 'bg-indigo-500' : 'bg-emerald-500'
                                    }`}></div>

                                <div className="p-6 pl-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3">
                                                <label className="text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight font-mono">
                                                    {setting.key.replace(/_/g, ' ')}
                                                </label>

                                                {/* Badges */}
                                                {isLocked ? (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                                        <FiLock className="w-3 h-3" /> Locked
                                                    </span>
                                                ) : setting.is_overridden ? (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-1">
                                                        <FiUnlock className="w-3 h-3" /> Custom Override
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                                                        <FiCheckCircle className="w-3 h-3" /> Inherited Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                                                {setting.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0 relative z-10 p-1">

                                            {/* Revert Button for Overrides */}
                                            {canEdit && setting.is_overridden && (
                                                <button
                                                    onClick={() => handleRevert(setting.key)}
                                                    className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-400/10 rounded-lg transition-colors"
                                                    title="Revert to Global Default"
                                                >
                                                    <FiRotateCcw className="w-5 h-5" />
                                                </button>
                                            )}

                                            {/* Input Controls */}
                                            {setting.value_type === 'bool' ? (
                                                <div className={`flex items-center gap-1 p-1 rounded-xl border ${canEdit ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>
                                                    <button
                                                        disabled={!canEdit}
                                                        onClick={() => handleInputChange(setting.key, true, 'bool')}
                                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${localValues[setting.key] === true
                                                            ? 'bg-emerald-500 text-white shadow-md'
                                                            : canEdit ? 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200' : 'text-slate-400 dark:text-slate-600'
                                                            }`}
                                                    >
                                                        ON
                                                    </button>
                                                    <button
                                                        disabled={!canEdit}
                                                        onClick={() => handleInputChange(setting.key, false, 'bool')}
                                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${localValues[setting.key] === false
                                                            ? 'bg-slate-600 text-white shadow-md'
                                                            : canEdit ? 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200' : 'text-slate-400 dark:text-slate-600'
                                                            }`}
                                                    >
                                                        OFF
                                                    </button>
                                                </div>
                                            ) : setting.key.endsWith('_COLOR') ? (
                                                <div className={`flex items-center gap-3 pr-4 rounded-xl border p-1 ${canEdit ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600' : 'bg-transparent border-transparent'}`}>
                                                    <div className="relative w-10 h-10 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 shadow-inner">
                                                        <input
                                                            disabled={!canEdit}
                                                            type="color"
                                                            value={localValues[setting.key] || '#ffffff'}
                                                            onChange={(e) => handleInputChange(setting.key, e.target.value, 'string')}
                                                            className={`absolute inset-[-50%] w-[200%] h-[200%] ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                        {localValues[setting.key]}
                                                    </span>
                                                </div>
                                            ) : (
                                                <input
                                                    disabled={!canEdit}
                                                    type={setting.value_type === 'int' || setting.value_type === 'float' ? 'number' : 'text'}
                                                    value={localValues[setting.key] !== undefined ? localValues[setting.key] : ''}
                                                    onChange={(e) => handleInputChange(setting.key, e.target.value, setting.value_type)}
                                                    className={`px-5 py-2.5 text-sm rounded-xl font-medium w-48 transition-all ${canEdit
                                                        ? '!bg-white dark:!bg-slate-700 border border-slate-200 dark:border-slate-600 !text-slate-900 dark:!text-white focus:ring-2 focus:ring-indigo-500/50'
                                                        : 'bg-transparent border border-transparent text-slate-500 dark:text-slate-400'
                                                        }`}
                                                />
                                            )}

                                            {/* Save Button */}
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleSave(setting.key)}
                                                    disabled={updateStatus.key === setting.key && updateStatus.status === 'saving'}
                                                    className={`p-3 rounded-xl transition-all duration-200 ${updateStatus.key === setting.key && updateStatus.status === 'success'
                                                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                        : updateStatus.key === setting.key && updateStatus.status === 'error'
                                                            ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20'
                                                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/30'
                                                        }`}
                                                >
                                                    {updateStatus.key === setting.key && updateStatus.status === 'saving' ? (
                                                        <FiRefreshCw className="animate-spin w-5 h-5" />
                                                    ) : updateStatus.key === setting.key && updateStatus.status === 'success' ? (
                                                        <FiCheckCircle className="w-5 h-5" />
                                                    ) : updateStatus.key === setting.key && updateStatus.status === 'error' ? (
                                                        <FiAlertCircle className="w-5 h-5" />
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            <FiSave className="w-4 h-4" /> Save
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default InstitutionalSettings;
