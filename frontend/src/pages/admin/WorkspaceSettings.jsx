import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import LogoUpload from '../../components/LogoUpload';
import { FiSave, FiMonitor, FiSettings, FiX } from 'react-icons/fi';
import InstitutionalSettings from '../dashboards/InstitutionalSettings';

const WorkspaceSettings = () => {
    const { user } = useAuthStore();
    const { settings, fetchInstitutionalSettings, updateInstitutionalSetting, loading } = useSettingsStore();
    const [activeTab, setActiveTab] = useState('branding');

    // Local state for branding
    const [branding, setBranding] = useState({
        primaryColor: '#319685',
        secondaryColor: '#ffffff'
    });

    // Status state
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        if (user?.workspace_id) {
            fetchInstitutionalSettings(user.workspace_id);
        }
    }, [user?.workspace_id, fetchInstitutionalSettings]);

    useEffect(() => {
        if (settings.length > 0) {
            const pColor = settings.find(s => s.key === 'BRAND_COLOR_PRIMARY')?.value;
            const sColor = settings.find(s => s.key === 'BRAND_COLOR_SECONDARY')?.value;
            setBranding({
                primaryColor: pColor || '#319685',
                secondaryColor: sColor || '#ffffff'
            });
        }
    }, [settings]);

    const handleColorChange = (key, value) => {
        setBranding(prev => ({ ...prev, [key]: value }));
        // Debounce autosave could go here, or manual save
    };

    const saveBranding = async () => {
        setStatus({ type: 'saving', message: 'Saving...' });
        try {
            await Promise.all([
                updateInstitutionalSetting(user.workspace_id, 'BRAND_COLOR_PRIMARY', branding.primaryColor),
                updateInstitutionalSetting(user.workspace_id, 'BRAND_COLOR_SECONDARY', branding.secondaryColor)
            ]);
            setStatus({ type: 'success', message: 'Changes saved successfully' });
            setTimeout(() => setStatus({ type: '', message: '' }), 3000);
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to save changes' });
        }
    };

    const handleLogoUpload = (url) => {
        updateInstitutionalSetting(user.workspace_id, 'INSTITUTION_LOGO', url);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-slate-900 border-b border-white/10 px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <FiMonitor className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{user?.workspace_name || 'My Workspace'}</h1>
                        <p className="text-slate-400 font-medium">Managed Service</p>
                    </div>
                </div>

                <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('branding')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'branding' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        Branding & Identity
                    </button>
                    <button className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold border-l border-slate-700 ml-2 pl-4">
                        Close
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 max-w-7xl mx-auto">
                {activeTab === 'branding' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Logo Section */}
                        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-6">Institution Logo</h2>
                            <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                                <h3 className="text-slate-300 font-bold text-lg">Upload Workspace Logo</h3>
                                <div className="w-full">
                                    <LogoUpload
                                        initialLogo={settings.find(s => s.key === 'INSTITUTION_LOGO')?.value}
                                        uploadUrl={`workspace/${user?.workspace_id}/logo`}
                                        onUploadSuccess={handleLogoUpload}
                                        label=""
                                    />
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                                This logo will be displayed on the sidebar and login screens for all users in this workspace.
                            </p>
                        </div>

                        {/* Colors Section */}
                        <div className="space-y-8">
                            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl">
                                <h2 className="text-xl font-bold text-white mb-6">Visual Identity</h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-slate-400 font-bold block mb-2">Primary Brand Color</label>
                                        <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-xl border border-slate-700">
                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow-inner">
                                                <input
                                                    type="color"
                                                    value={branding.primaryColor}
                                                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                                                    className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer"
                                                />
                                            </div>
                                            <span className="font-mono text-white text-lg font-medium">{branding.primaryColor}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-slate-400 font-bold block mb-2">Secondary / Text Color</label>
                                        <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-xl border border-slate-700">
                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow-inner bg-white">
                                                <input
                                                    type="color"
                                                    value={branding.secondaryColor}
                                                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                                                    className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer"
                                                />
                                            </div>
                                            <span className="font-mono text-white text-lg font-medium">{branding.secondaryColor}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Save Tip Box */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-indigo-400 font-bold mb-1">Tip:</h4>
                                    <p className="text-slate-400 text-sm">Changes require manual save to persist.</p>
                                </div>
                                <button
                                    onClick={saveBranding}
                                    disabled={status.type === 'saving'}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
                                >
                                    <FiSave />
                                    {status.type === 'saving' ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                            {status.message && (
                                <div className={`p-4 rounded-xl text-sm font-bold text-center ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {status.message}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-1">
                        {/* Embed existing Matrix Settings here, simplified if needed, or just link to it */}
                        <InstitutionalSettings />
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkspaceSettings;
