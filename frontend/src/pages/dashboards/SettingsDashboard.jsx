import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import {
    FiSave,
    FiRefreshCw,
    FiSettings,
    FiShield,
    FiMonitor,
    FiMessageSquare,
    FiCheckCircle,
    FiAlertCircle
} from 'react-icons/fi';
import LogoUpload from '../../components/LogoUpload';

const SettingsDashboard = () => {
    const { settings, fetchSystemSettings, updateSystemSetting, getSettingValue, loading, error } = useSettingsStore();
    const [activeCategory, setActiveCategory] = useState('general');
    const [localValues, setLocalValues] = useState({});
    const [updateStatus, setUpdateStatus] = useState({ key: null, status: null });

    useEffect(() => {
        fetchSystemSettings();
    }, [fetchSystemSettings]);

    useEffect(() => {
        // Initialise local values when settings are loaded
        const values = {};
        settings.forEach(s => {
            values[s.key] = s.value;
        });
        setLocalValues(values);
    }, [settings]);

    const categories = [
        { id: 'general', label: 'General', icon: <FiSettings /> },
        { id: 'security', label: 'Security', icon: <FiShield /> },
        { id: 'ui_ux', label: 'UI / UX', icon: <FiMonitor /> },
        { id: 'communication', label: 'Communication', icon: <FiMessageSquare /> },
    ];

    const handleInputChange = (key, value, type) => {
        let finalValue = value;
        if (type === 'int') finalValue = parseInt(value, 10) || 0;
        if (type === 'float') finalValue = parseFloat(value) || 0;
        if (type === 'bool') finalValue = value === 'true' || value === true;

        setLocalValues(prev => ({ ...prev, [key]: finalValue }));
    };

    const handleSave = async (key, metadata = {}) => {
        setUpdateStatus({ key, status: 'saving' });
        const result = await updateSystemSetting(key, localValues[key], metadata);
        if (result.success) {
            setUpdateStatus({ key, status: 'success' });
            setTimeout(() => setUpdateStatus({ key: null, status: null }), 3000);
        } else {
            setUpdateStatus({ key, status: 'error' });
        }
    };

    const filteredSettings = settings.filter(s => s.category === activeCategory);

    if (loading && settings.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Configuration</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage global system parameters. Changes take effect in real-time.</p>
                </div>
                <button
                    onClick={() => fetchSystemSettings()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 space-y-1">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeCategory === cat.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            {cat.icon}
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="flex-1 space-y-4">
                    {filteredSettings.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                                <FiSettings className="text-slate-400 dark:text-slate-500 text-xl" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400">No settings found in this category.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Global Logo Upload (Shown only in UI/UX category) */}
                            {activeCategory === 'ui_ux' && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 mb-6">
                                    <LogoUpload
                                        label="Global System Logo"
                                        initialLogo={getSettingValue('SYSTEM_LOGO_URL')}
                                        uploadUrl="/settings/system/logo"
                                        onUploadSuccess={(url) => fetchSystemSettings()}
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Recommended size: 512x512px transparent PNG.</p>
                                </div>
                            )}

                            {filteredSettings.map(setting => (
                                <div key={setting.key} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm font-bold text-slate-900 dark:text-slate-200">{setting.key}</label>
                                                    {setting.is_public && (
                                                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
                                                            Public
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleSave(setting.key, { is_overridable: !setting.is_overridable })}
                                                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider transition-all border ${setting.is_overridable ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}
                                                    >
                                                        {setting.is_overridable ? 'Overridable' : 'Global Only'}
                                                    </button>
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{setting.description}</p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Input based on type and key */}
                                                {setting.value_type === 'bool' ? (
                                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                                        <button
                                                            onClick={() => handleInputChange(setting.key, true, 'bool')}
                                                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${localValues[setting.key] === true ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                        >
                                                            ON
                                                        </button>
                                                        <button
                                                            onClick={() => handleInputChange(setting.key, false, 'bool')}
                                                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${localValues[setting.key] === false ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                        >
                                                            OFF
                                                        </button>
                                                    </div>
                                                ) : setting.key.endsWith('_COLOR') ? (
                                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 pr-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                                        <div className="relative w-10 h-10 overflow-hidden rounded-l-xl border-r border-slate-200 dark:border-slate-700">
                                                            <input
                                                                type="color"
                                                                value={localValues[setting.key] || '#ffffff'}
                                                                onChange={(e) => handleInputChange(setting.key, e.target.value, 'string')}
                                                                className="absolute inset-[-5px] w-[150%] h-[150%] cursor-pointer"
                                                            />
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                                                            {localValues[setting.key]}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type={setting.value_type === 'int' || setting.value_type === 'float' ? 'number' : 'text'}
                                                        value={localValues[setting.key] !== undefined ? localValues[setting.key] : ''}
                                                        onChange={(e) => handleInputChange(setting.key, e.target.value, setting.value_type)}
                                                        className="px-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder-slate-400 font-medium transition-all"
                                                    />
                                                )}

                                                <button
                                                    onClick={() => handleSave(setting.key)}
                                                    disabled={updateStatus.key === setting.key && updateStatus.status === 'saving'}
                                                    className={`p-2 rounded-xl transition-all ${updateStatus.key === setting.key && updateStatus.status === 'success'
                                                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                        : updateStatus.key === setting.key && updateStatus.status === 'error'
                                                            ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20'
                                                        }`}
                                                >
                                                    {updateStatus.key === setting.key && updateStatus.status === 'saving' ? (
                                                        <FiRefreshCw className="animate-spin" />
                                                    ) : updateStatus.key === setting.key && updateStatus.status === 'success' ? (
                                                        <FiCheckCircle />
                                                    ) : updateStatus.key === setting.key && updateStatus.status === 'error' ? (
                                                        <FiAlertCircle />
                                                    ) : (
                                                        <FiSave />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsDashboard;
