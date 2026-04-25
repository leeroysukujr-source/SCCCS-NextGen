import React, { useState, useEffect } from 'react';
import { FiShield, FiCpu, FiCheckCircle, FiXCircle, FiSave, FiAlertCircle, FiSettings, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import apiClient from '../../api/client';

const CreationPolicyManager = () => {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const featureKeys = [
        { id: 'creation_hub', label: 'Creation Hub (Global)', icon: <FiSettings /> },
        { id: 'smart_docs', label: 'Academic Documents', icon: <FiShield /> },
        { id: 'data_sheets', label: 'Data Sheets & Analytics', icon: <FiShield /> },
        { id: 'presentations', label: 'Presentations', icon: <FiShield /> },
        { id: 'whiteboard', label: 'Collaborative Boards', icon: <FiShield /> },
        { id: 'ai_assistant', label: 'Global AI Assistant', icon: <FiCpu /> },
    ];

    useEffect(() => {
        apiClient.get('/features/config')
            .then(res => {
                setConfig(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const toggleFeature = (key) => {
        const newEnabled = !config[key]?.enabled;
        setConfig({
            ...config,
            [key]: {
                ...config[key],
                enabled: newEnabled
            }
        });
    };

    const updateNestedConfig = (key, prop, value) => {
        setConfig({
            ...config,
            [key]: {
                ...config[key],
                config: {
                    ...config[key]?.config,
                    [prop]: value
                }
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const key of featureKeys) {
                const feature = config[key.id];
                if (feature) {
                    await apiClient.post('/features/workspace/override', {
                        feature_name: key.id,
                        is_enabled: feature.enabled,
                        config: feature.config
                    });
                }
            }
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            alert("Failed to save some policies.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center animate-pulse font-black uppercase tracking-widest text-slate-400">Loading Governance Policies...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-8 lg:p-12 overflow-y-auto font-sans">
            <div className="max-w-5xl mx-auto w-full space-y-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-10">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-4">
                            <FiShield className="text-indigo-600" /> AI Governance
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Workspace Orchestration & Policy Control</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-10 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-2xl ${success ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'}`}
                    >
                        {success ? <><FiCheckCircle /> Settings Applied</> : saving ? 'Syncing...' : <><FiSave /> Commit Policies</>}
                    </button>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[40px] border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-6">
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-800 text-indigo-600">
                        <FiAlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-900 dark:text-indigo-100 mb-1">Institutional Oversight</h3>
                        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 leading-relaxed max-w-2xl">
                            You are managing the AI Orchestration Layer for this workspace. Disabling a feature here will override global defaults and affect all members immediately. Educational data integrity is prioritized.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {featureKeys.map(feature => (
                        <div key={feature.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-2xl group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150"></div>

                            <div className="flex items-start justify-between relative z-10 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-500 group-hover:text-indigo-600 transition-colors">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{feature.label}</h4>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ID: {feature.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleFeature(feature.id)}
                                    className={`text-3xl transition-colors ${config[feature.id]?.enabled ? 'text-indigo-600' : 'text-slate-300'}`}
                                >
                                    {config[feature.id]?.enabled ? <FiToggleRight /> : <FiToggleLeft />}
                                </button>
                            </div>

                            <div className={`space-y-6 relative z-10 p-6 rounded-[28px] ${config[feature.id]?.enabled ? 'bg-slate-50 dark:bg-slate-950 shadow-inner' : 'opacity-20 pointer-events-none'}`}>
                                {config[feature.id]?.config && Object.entries(config[feature.id]?.config).map(([prop, val]) => (
                                    <div key={prop} className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{prop.replace(/_/g, ' ')}</label>
                                        {typeof val === 'boolean' ? (
                                            <button
                                                onClick={() => updateNestedConfig(feature.id, prop, !val)}
                                                className={`text-xl ${val ? 'text-indigo-600' : 'text-slate-400'}`}
                                            >
                                                {val ? <FiToggleRight /> : <FiToggleLeft />}
                                            </button>
                                        ) : (
                                            <input
                                                value={val}
                                                onChange={(e) => updateNestedConfig(feature.id, prop, e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 w-32 text-center text-slate-900 dark:text-white"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="h-20"></div>
            </div>
        </div>
    );
};

export default CreationPolicyManager;
