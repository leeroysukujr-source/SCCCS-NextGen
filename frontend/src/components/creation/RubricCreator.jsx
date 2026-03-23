import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiSave, FiInfo, FiCheckCircle } from 'react-icons/fi';
import apiClient from '../../api/client';

const RubricCreator = ({ docId, onSave, onBack }) => {
    const [title, setTitle] = useState('New Rubric');
    const [criteria, setCriteria] = useState([
        {
            id: 1, name: 'Clarity', description: 'How clear is the argument?', weight: 25, levels: [
                { score: 4, label: 'Excellent', description: 'Extremely clear and well-structured' },
                { score: 3, label: 'Good', description: 'Clear with minor issues' },
                { score: 2, label: 'Fair', description: 'Lacks clarity in some areas' },
                { score: 1, label: 'Poor', description: 'Very difficult to follow' }
            ]
        },
        {
            id: 2, name: 'Evidence', description: 'Use of supporting data', weight: 25, levels: [
                { score: 4, label: 'Excellent', description: 'Strong use of diverse evidence' },
                { score: 3, label: 'Good', description: 'Adequate evidence used' },
                { score: 2, label: 'Fair', description: 'Some evidence, but lacking depth' },
                { score: 1, label: 'Poor', description: 'No evidence provided' }
            ]
        }
    ]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (docId && docId !== 'new') {
            apiClient.get(`/documents/${docId}`).then(res => {
                setTitle(res.data.title);
                if (res.data.content) {
                    try {
                        const parsed = JSON.parse(res.data.content);
                        setCriteria(parsed.criteria || []);
                    } catch (e) {
                        console.error("Parse error", e);
                    }
                }
            });
        }
    }, [docId]);

    const handleSave = async () => {
        setSaving(true);
        const payload = {
            title,
            content: JSON.stringify({ criteria }),
            doc_type: 'rubric'
        };
        try {
            if (docId && docId !== 'new') {
                await apiClient.put(`/documents/${docId}`, payload);
            } else {
                await apiClient.post('/documents/', payload);
            }
            if (onSave) onSave(payload);
            onBack();
        } catch (e) {
            console.error(e);
            alert("Failed to save rubric");
        } finally {
            setSaving(false);
        }
    };

    const addCriterion = () => {
        setCriteria([...criteria, {
            id: Date.now(),
            name: 'New Criterion',
            description: '',
            weight: 0,
            levels: [
                { score: 4, label: 'Excellent', description: '' },
                { score: 3, label: 'Good', description: '' },
                { score: 2, label: 'Fair', description: '' },
                { score: 1, label: 'Poor', description: '' }
            ]
        }]);
    };

    const removeCriterion = (id) => {
        setCriteria(criteria.filter(c => c.id !== id));
    };

    const updateCriterion = (id, field, value) => {
        setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const updateLevel = (cId, score, field, value) => {
        setCriteria(criteria.map(c => {
            if (c.id === cId) {
                return {
                    ...c,
                    levels: c.levels.map(l => l.score === score ? { ...l, [field]: value } : l)
                };
            }
            return c;
        }));
    };

    const totalWeight = criteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="bg-transparent font-black text-2xl text-slate-800 dark:text-white outline-none focus:ring-0 uppercase tracking-tight"
                        placeholder="Rubric Title"
                    />
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Academic Standard</span>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${totalWeight === 100 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            Total Weight: {totalWeight}% {totalWeight !== 100 && '(Target 100%)'}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-6 py-2 rounded-full font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-widest">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full font-bold text-sm shadow-lg transition-all flex items-center gap-2 uppercase tracking-widest"
                    >
                        <FiSave /> {saving ? 'Saving...' : 'Save Rubric'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 scroll-smooth">
                <div className="max-w-6xl mx-auto space-y-12">
                    {criteria.map((c, idx) => (
                        <div key={c.id} className="bg-white dark:bg-slate-900 rounded-[40px] p-10 shadow-xl border border-slate-100 dark:border-slate-800 relative group animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-slate-100 dark:text-slate-800 font-black text-9xl pointer-events-none select-none opacity-50">
                                {idx + 1}
                            </div>

                            <div className="flex justify-between items-start gap-8 relative z-10">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <input
                                            value={c.name}
                                            onChange={e => updateCriterion(c.id, 'name', e.target.value)}
                                            className="text-2xl font-black text-slate-800 dark:text-white bg-transparent outline-none focus:text-indigo-600 border-b-2 border-transparent focus:border-indigo-500 w-full transition-all uppercase tracking-tight"
                                            placeholder="Criterion Name (e.g., Structure)"
                                        />
                                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                                            <input
                                                type="number"
                                                value={c.weight}
                                                onChange={e => updateCriterion(c.id, 'weight', e.target.value)}
                                                className="w-12 bg-transparent text-center font-black text-indigo-600 outline-none text-lg"
                                            />
                                            <span className="text-xs font-black text-slate-400 font-mono tracking-tighter">%</span>
                                        </div>
                                    </div>
                                    <textarea
                                        value={c.description}
                                        onChange={e => updateCriterion(c.id, 'description', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 p-6 rounded-[24px] text-sm font-medium text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border-none transition-all shadow-inner"
                                        placeholder="Describe what this criterion evaluates..."
                                        rows={2}
                                    />
                                </div>
                                <button onClick={() => removeCriterion(c.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all"><FiTrash2 size={24} /></button>
                            </div>

                            <div className="grid grid-cols-4 gap-6 mt-10 relative z-10">
                                {c.levels.map(l => (
                                    <div key={l.score} className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 space-y-4 flex flex-col hover:shadow-2xl hover:bg-white dark:hover:bg-slate-900 transition-all group/level cursor-text">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Level</span>
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-black text-indigo-600 border border-indigo-100 dark:border-indigo-800">
                                                {l.score}
                                            </div>
                                        </div>
                                        <input
                                            value={l.label}
                                            onChange={e => updateLevel(c.id, l.score, 'label', e.target.value)}
                                            className="font-black text-slate-800 dark:text-slate-200 bg-transparent outline-none text-sm uppercase tracking-tight"
                                            placeholder="Label (e.g. Good)"
                                        />
                                        <textarea
                                            value={l.description}
                                            onChange={e => updateLevel(c.id, l.score, 'description', e.target.value)}
                                            className="flex-1 w-full bg-transparent text-xs font-medium text-slate-500 dark:text-slate-400 resize-none outline-none focus:text-indigo-600 leading-relaxed"
                                            placeholder="Criteria for this score..."
                                            rows={4}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addCriterion}
                        className="w-full py-12 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[50px] text-slate-300 hover:text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all flex flex-col items-center justify-center gap-6 group"
                    >
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 group-hover:rotate-180 transition-all duration-700">
                            <FiPlus size={40} className="text-indigo-500" />
                        </div>
                        <span className="font-black uppercase tracking-[0.2em] text-xs">Add Assessment Criterion</span>
                    </button>

                    <div className="h-20"></div>
                </div>
            </div>

            {/* AI Assistant Insight */}
            <div className="fixed bottom-10 left-10 bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl border border-slate-700 max-w-sm animate-in slide-in-from-left-12 duration-700 z-50 group hover:scale-105 transition-all">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/40"><FiInfo size={20} /></div>
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Rubric Governance</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    This rubric is <span className="text-indigo-400">workspace-aware</span>. Standardizing assessment criteria ensures institutional consistency and fair grading across all departments.
                </p>
            </div>
        </div>
    );
};

export default RubricCreator;
