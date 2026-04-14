import React, { useState, useEffect } from 'react';
import { useFeatureStore } from '../../store/featureStore';
import {
    FiBox,
    FiSettings,
    FiMessageSquare,
    FiVideo,
    FiCpu,
    FiSave,
    FiRefreshCw,
    FiCheckCircle,
    FiAlertCircle,
    FiLayers,
    FiShield,
    FiPenTool,
    FiLock,
    FiTerminal,
    FiCloud,
    FiGlobe
} from 'react-icons/fi';
import apiClient from '../../api/client';

const FeatureLab = () => {
    const { updateGlobalFeature } = useFeatureStore();
    const [globalFlags, setGlobalFlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFeature, setActiveFeature] = useState(null);
    const [localConfig, setLocalConfig] = useState({});
    const [status, setStatus] = useState({ id: null, type: null });

    const fetchGlobalFlags = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/features/global');
            setGlobalFlags(res.data);
            if (res.data.length > 0 && !activeFeature) {
                setActiveFeature(res.data[0]);
                setLocalConfig(res.data[0].config || {});
            }
        } catch (err) {
            console.error('Failed to fetch global flags:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGlobalFlags();
    }, []);

    const handleFeatureSelect = (feature) => {
        setActiveFeature(feature);
        setLocalConfig(feature.config || {});
    };

    const handleConfigChange = (key, value) => {
        setLocalConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!activeFeature) return;
        setStatus({ id: activeFeature.id, type: 'saving' });

        const result = await updateGlobalFeature({
            name: activeFeature.name,
            is_enabled: activeFeature.is_enabled,
            config: localConfig
        });

        if (result.success) {
            setStatus({ id: activeFeature.id, type: 'success' });
            // Update local state
            setGlobalFlags(prev => prev.map(f => f.id === activeFeature.id ? { ...f, config: localConfig } : f));
            setTimeout(() => setStatus({ id: null, type: null }), 3000);
        } else {
            setStatus({ id: activeFeature.id, type: 'error' });
        }
    };

    const getIcon = (name) => {
        switch (name) {
            case 'channels': return <FiLayers className="text-blue-500" />;
            case 'messages': return <FiMessageSquare className="text-green-500" />;
            case 'video_room': return <FiVideo className="text-purple-500" />;
            case 'study_hub': return <FiCpu className="text-amber-500" />;
            case 'ai_study': return <FiCpu className="text-red-500" />;
            case 'whiteboard': return <FiPenTool className="text-pink-500" />;
            case 'assignments_ecosystem': return <FiLayers className="text-indigo-500" />;
            case 'rubric_analysis_ai': return <FiCpu className="text-emerald-500" />;
            case 'group_study_vault': return <FiShield className="text-cyan-500" />;
            case 'security_nexus': return <FiLock className="text-red-600" />;
            case 'collaboration_engine': return <FiPenTool className="text-indigo-600" />;
            case 'enhanced_connectivity': return <FiGlobe className="text-blue-600" />;
            case 'ai_tutoring_system': return <FiCpu className="text-purple-600" />;
            default: return <FiBox className="text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <FiRefreshCw className="animate-spin text-4xl text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <header className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <FiBox size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feature Lab</h1>
                        <p className="text-sm text-slate-500">Advanced module configuration & runtime tuning</p>
                    </div>
                </div>
                <button
                    onClick={fetchGlobalFlags}
                    className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar: Module List */}
                <div className="md:col-span-1 space-y-2">
                    {globalFlags.map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => handleFeatureSelect(feature)}
                            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all border ${activeFeature?.id === feature.id
                                ? 'bg-white border-indigo-200 shadow-md shadow-indigo-50 ring-1 ring-indigo-50'
                                : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-200 text-slate-600'}`}
                        >
                            <span className="text-xl">{getIcon(feature.name)}</span>
                            <div className="text-left">
                                <div className={`text-sm font-bold capitalize ${activeFeature?.id === feature.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {feature.name.replace(/_/g, ' ')}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${feature.is_enabled ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                    {feature.is_enabled ? 'Active' : 'Disabled'}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Main Content: Config Editor */}
                <div className="md:col-span-3">
                    {activeFeature ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl p-2 bg-white rounded-xl shadow-sm">{getIcon(activeFeature.name)}</span>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 capitalize">{activeFeature.name.replace(/_/g, ' ')} Tuning</h2>
                                        <p className="text-xs text-slate-500">{activeFeature.description || 'Configure advanced parameters for this module'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={status.type === 'saving'}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${status.type === 'success'
                                        ? 'bg-green-600 text-white shadow-green-100'
                                        : status.type === 'error'
                                            ? 'bg-red-600 text-white shadow-red-100'
                                            : 'bg-indigo-600 text-white hover:bg-black shadow-indigo-100 active:scale-95'}`}
                                >
                                    {status.type === 'saving' ? <FiRefreshCw className="animate-spin" /> : status.type === 'success' ? <FiCheckCircle /> : status.type === 'error' ? <FiAlertCircle /> : <FiSave />}
                                    {status.type === 'saving' ? 'Applying...' : status.type === 'success' ? 'Applied' : 'Save Changes'}
                                </button>
                            </div>

                            <div className="p-8 flex-1">
                                <ModuleSpecificConfig
                                    name={activeFeature.name}
                                    config={localConfig}
                                    onChange={handleConfigChange}
                                />
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <FiCpu />
                                <span>RUNTIME_ID: {activeFeature.id} | LAST_STABLE_CONFIG_SYNC: {new Date().toISOString()}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 h-full flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                                <FiBox size={40} />
                            </div>
                            <h3 className="text-slate-400 font-medium">Select a module to tune</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ModuleSpecificConfig = ({ name, config, onChange }) => {
    // Helper to render toggles and inputs
    const renderConfigInput = (key, label, description, type = 'text', options = null) => {
        const val = config[key] !== undefined ? config[key] : (type === 'bool' ? false : (type === 'number' ? 0 : ''));

        return (
            <div className="group bg-white p-5 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="max-w-md">
                        <label className="text-sm font-bold text-slate-800 block mb-0.5">{label}</label>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{description}</p>
                    </div>

                    <div className="min-w-[140px] flex justify-end">
                        {type === 'bool' ? (
                            <button
                                onClick={() => onChange(key, !val)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500 ${val ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        ) : type === 'number' ? (
                            <input
                                type="number"
                                value={val}
                                onChange={(e) => onChange(key, parseInt(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all text-right"
                            />
                        ) : type === 'select' ? (
                            <select
                                value={val}
                                onChange={(e) => onChange(key, e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
                            >
                                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={val}
                                onChange={(e) => onChange(key, e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    switch (name) {
        case 'channels':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiLayers /> Moderation & Hierarchy</h3>
                    {renderConfigInput('allow_private_channels', 'Private Channels', 'Allow users to create invite-only communication spaces', 'bool')}
                    {renderConfigInput('max_channels_per_user', 'Max Channels/User', 'Limits the number of channels a regular user can create', 'number')}
                    {renderConfigInput('default_moderation', 'Moderation Level', 'Standard uses keyword filtering, Strict uses AI screening', 'select', [
                        { label: 'Standard', value: 'standard' },
                        { label: 'Strict (AI)', value: 'strict' },
                        { label: 'None', value: 'none' }
                    ])}
                </div>
            );
        case 'messages':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiMessageSquare /> Anti-Spam & Retention</h3>
                    {renderConfigInput('anti_spam_enabled', 'Spam Guard', 'Blocks repetitive messages and suspicious bot patterns', 'bool')}
                    {renderConfigInput('max_message_length', 'Max Length', 'Maximum allowed characters per message', 'number')}
                    {renderConfigInput('retention_days', 'History Retention', 'Days to keep message history (0 = forever)', 'number')}
                </div>
            );
        case 'video_room':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiVideo /> Stream Quality & Capacity</h3>
                    {renderConfigInput('max_participants', 'Session Capacity', 'Maximum participants allowed in a single video room', 'number')}
                    {renderConfigInput('recording_enabled', 'Archiving', 'Allow organizers to record sessions and store them in cloud', 'bool')}
                    {renderConfigInput('hd_streaming', 'HD Video', 'Enforce high-definition quality (consumes more bandwidth)', 'bool')}
                </div>
            );
        case 'study_hub':
        case 'ai_study':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiCpu /> AI Cognitive Engine</h3>
                    {renderConfigInput('ai_assistant_enabled', 'Smart Assistant', 'Enables the AI sidekick for students and staff', 'bool')}
                    {renderConfigInput('ai_model_tier', 'Model intelligence', 'Turbo is faster, Pro is more accurate', 'select', [
                        { label: 'Gemini 1.5 Flash', value: 'flash' },
                        { label: 'Gemini 1.5 Pro', value: 'pro' }
                    ])}
                    {renderConfigInput('max_ai_tokens_per_day', 'Daily Token Limit', 'Usage quota for AI interactions per individual', 'number')}
                </div>
            );
        case 'whiteboard':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiPenTool /> Collaboration & Tools</h3>
                    {renderConfigInput('collaboration_enabled', 'Real-time Sync', 'Allow multiple users to draw simultaneously', 'bool')}
                    {renderConfigInput('export_enabled', 'Allow Exports', 'Users can download boards as PNG/PDF', 'bool')}
                    {renderConfigInput('ai_shapes_enabled', 'AI Shape Guard', 'Auto-correct rough drawings into perfect shapes', 'bool')}
                    {renderConfigInput('max_pages', 'Max Pages', 'Constraint on board size to manage performance', 'number')}
                </div>
            );
        case 'assignments_ecosystem':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiLayers /> Global Academic Policy</h3>
                    {renderConfigInput('allow_anonymous_grading', 'Anonymous Bloom', 'Hides student identities during the primary grading phase', 'bool')}
                    {renderConfigInput('max_file_size_mb', 'Max Upload (MB)', 'Global constraint on individual assignment file uploads', 'number')}
                    {renderConfigInput('plagiarism_check_enabled', 'Integrity Guard', 'Auto-run similarity checks on all document submissions', 'bool')}
                </div>
            );
        case 'rubric_analysis_ai':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiCpu /> Rubric Intelligence</h3>
                    {renderConfigInput('ai_grading_assistant', 'Auto-Rubric Gen', 'Allow AI to suggest rubric criteria based on title/desc', 'bool')}
                    {renderConfigInput('feedback_amplification', 'Feedback AI', 'Synthesize lecturer notes into comprehensive student reviews', 'bool')}
                </div>
            );
        case 'group_study_vault':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiShield /> Collaborative Security</h3>
                    {renderConfigInput('vault_encryption', 'Quantum-Safe', 'Enforce end-to-end encryption for all group document work', 'bool')}
                    {renderConfigInput('version_history_days', 'History Buffer', 'Days to preserve document evolution history in the vault', 'number')}
                </div>
            );
        case 'security_nexus':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiLock /> Security & Identity</h3>
                    {renderConfigInput('enforce_2fa', 'Strict 2FA', 'Force every user to complete 2FA setup before accessing workspace', 'bool')}
                    {renderConfigInput('session_timeout', 'Session Expiry (Min)', 'Minutes after which an idle user is automatically logged out', 'number')}
                    {renderConfigInput('password_complexity', 'Passphrase Strictness', 'Complexity tier for system passwords', 'select', [
                        { label: 'Standard', value: 'standard' },
                        { label: 'Medium', value: 'medium' },
                        { label: 'High (Military Grade)', value: 'high' }
                    ])}
                </div>
            );
        case 'collaboration_engine':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiPenTool /> Real-time Systems</h3>
                    {renderConfigInput('live_editing_enabled', 'Sync Engine', 'Enable Yjs-based real-time multi-user document editing', 'bool')}
                    {renderConfigInput('max_collaborators', 'Collab Limit', 'Maximum users allowed per concurrent document session', 'number')}
                    {renderConfigInput('auto_save_interval', 'Save Frequency (ms)', 'Interval for flushing changes to database', 'number')}
                </div>
            );
        case 'enhanced_connectivity':
            return (
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><FiGlobe /> Global Infrastructure</h3>
                    {renderConfigInput('meeting_provider', 'Voice/Video Host', 'Back-end engine powering communication', 'select', [
                        { label: 'LiveKit Cloud', value: 'livekit' },
                        { label: 'Local WebRTC', value: 'local' },
                        { label: 'Zoom Integration', value: 'zoom' }
                    ])}
                    {renderConfigInput('whiteboard_integrated', 'Full Whiteboard', 'Inject interactive Canvas into all meeting sessions', 'bool')}
                    {renderConfigInput('record_by_default', 'Auto-Archive', 'Start recording every meeting as soon as host joins', 'bool')}
                </div>
            );
        default:
            return (
                <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                    <FiSettings className="mx-auto text-slate-200 text-3xl mb-3" />
                    <p className="text-slate-400 text-sm">No specialized tuning controls for this module yet.</p>
                </div>
            );
    }
};

export default FeatureLab;
