import React, { useState, useEffect, useMemo } from 'react';
import {
    FiSave, FiArrowRight, FiPlus, FiMonitor, FiType, FiImage, FiGrid, FiUsers, FiPlay, FiStopCircle,
    FiArrowRight as FiArrowRightIcon, FiMaximize2, FiChevronDown, FiPlusSquare,
    FiLayout, FiSmile, FiSquare, FiLayers, FiX, FiActivity, FiYoutube, FiCheck, FiRotateCcw, FiRotateCw
} from 'react-icons/fi';
import apiClient from '../../api/client';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuthStore } from '../../store/authStore';

const PresentationBuilder = ({ docId, onBack, onSuccess, onShare }) => {
    const { user } = useAuthStore();
    const [title, setTitle] = useState('Untitled presentation');
    const [slides, setSlides] = useState([
        { id: 1, title: 'Title Slide', content: 'Double click to edit content', notes: '' }
    ]);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [saving, setSaving] = useState(false);
    const [collaborators, setCollaborators] = useState([]);
    const [isPresenting, setIsPresenting] = useState(false);
    const [showTemplates, setShowTemplates] = useState(true);
    const [lastSaved, setLastSaved] = useState(null);

    // Yjs Collaboration
    const { ydoc, provider, yMap } = useMemo(() => {
        const doc = new Y.Doc();
        const roomName = docId ? `pres-${docId}` : `pres-new-${user?.id}-${Date.now()}`;
        const wsProvider = new WebsocketProvider('ws://localhost:1234', roomName, doc);
        const map = doc.getMap('pres-data');
        return { ydoc: doc, provider: wsProvider, yMap: map };
    }, [docId, user?.id]);

    useEffect(() => {
        const observeHandler = () => {
            const remoteSlides = yMap.get('slides');
            if (remoteSlides) setSlides(remoteSlides);
            const remoteTitle = yMap.get('title');
            if (remoteTitle) setTitle(remoteTitle);

            // Sync active slide if someone is presenting
            const remotePresenting = yMap.get('isPresenting');
            setIsPresenting(!!remotePresenting);
            if (remotePresenting) {
                const remoteActiveIdx = yMap.get('activeSlideIndex');
                if (typeof remoteActiveIdx === 'number') setActiveSlideIndex(remoteActiveIdx);
            }
        };
        yMap.observe(observeHandler);

        provider.awareness.on('change', () => {
            const states = Array.from(provider.awareness.getStates().values());
            setCollaborators(states.map(s => s.user));
        });

        provider.awareness.setLocalStateField('user', {
            name: user?.username || 'Collaborator',
            color: '#' + Math.floor(Math.random() * 16777215).toString(16)
        });

        return () => {
            yMap.unobserve(observeHandler);
            provider.disconnect();
            ydoc.destroy();
        };
    }, [yMap, provider, ydoc, user?.username]);

    // Initial seed
    useEffect(() => {
        if (!yMap.has('slides')) {
            yMap.set('slides', slides);
            yMap.set('title', title);
        }
    }, []);

    useEffect(() => {
        if (docId && docId !== 'new') {
            apiClient.get(`/documents/${docId}`).then(res => {
                setTitle(res.data.title || 'Untitled presentation');
            });
        }
    }, [docId]);

    const updateSlide = (field, value) => {
        const newSlides = [...slides];
        newSlides[activeSlideIndex] = { ...newSlides[activeSlideIndex], [field]: value };
        setSlides(newSlides);
        yMap.set('slides', newSlides);
    };

    const addSlide = () => {
        const newSlides = [...slides, { id: Date.now(), title: 'New Slide', content: '', notes: '' }];
        setSlides(newSlides);
        setActiveSlideIndex(newSlides.length - 1);
        yMap.set('slides', newSlides);
        if (isPresenting) yMap.set('activeSlideIndex', newSlides.length - 1);
    };

    const handleActiveSlideChange = (idx) => {
        setActiveSlideIndex(idx);
        if (isPresenting) {
            yMap.set('activeSlideIndex', idx);
        }
    };

    const togglePresentation = () => {
        const newState = !isPresenting;
        setIsPresenting(newState);
        yMap.set('isPresenting', newState);
        if (newState) {
            yMap.set('activeSlideIndex', activeSlideIndex);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { title, content: JSON.stringify(slides), doc_type: 'presentation' };
            if (docId && docId !== 'new') {
                await apiClient.put(`/documents/${docId}`, payload);
            } else {
                const res = await apiClient.post('/documents/', payload);
                if (onSuccess) onSuccess(res.data);
            }
            setLastSaved(new Date());
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const activeSlide = slides[activeSlideIndex] || slides[0];

    return (
        <div className="flex flex-col h-full bg-[#f9fbfd] dark:bg-slate-950 font-sans overflow-hidden">
            {/* Top Navigation Bar - Google Slides Style */}
            <div className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 text-orange-500 cursor-pointer" onClick={onBack}>
                            <FiMonitor size={32} />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <input
                                    value={title}
                                    onChange={e => { setTitle(e.target.value); yMap.set('title', e.target.value); }}
                                    className="text-lg font-normal bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1 min-w-[200px]"
                                    placeholder="Untitled presentation"
                                />
                                <button className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                    <FiMaximize2 size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 -mt-1 ml-1">
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">File</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Edit</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">View</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Insert</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Format</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Slide</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Arrange</span>
                                <span className="hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors">Tools</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-1 mr-2">
                            {collaborators.map((c, i) => (
                                <div key={i} className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white dark:border-slate-900 shadow-sm" title={c?.name} style={{ backgroundColor: c?.color || '#f59e0b' }}>
                                    {c?.name?.charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center bg-[#c2e7ff] rounded-full overflow-hidden shadow-sm">
                            <button
                                onClick={togglePresentation}
                                className="flex items-center gap-2 px-6 py-2 hover:bg-[#b3d9f2] text-[#001d35] font-semibold text-sm transition-all"
                            >
                                Slideshow
                            </button>
                            <div className="w-[1px] h-6 bg-blue-300"></div>
                            <button className="p-2 hover:bg-[#b3d9f2] text-[#001d35]">
                                <FiChevronDown />
                            </button>
                        </div>

                        <button
                            onClick={onShare}
                            className="flex items-center gap-2 bg-[#c2e7ff] hover:bg-[#b3d9f2] text-[#001d35] px-6 py-2 rounded-full font-semibold text-sm transition-all shadow-sm"
                        >
                            <FiUsers size={18} /> Share
                        </button>
                        <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden">
                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}`} alt="profile" className="h-full w-full object-cover" />
                        </div>
                    </div>
                </div>

                {/* Main Slides Toolbar */}
                <div className="flex items-center gap-1 px-4 py-1.5 bg-[#edf2fa] dark:bg-slate-800/50 mx-4 mb-2 rounded-full border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar shadow-sm">
                    <button onClick={addSlide} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><FiPlus size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><FiChevronDown size={14} /></button>
                    <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>

                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiRotateCcw size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiRotateCw size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiPlusSquare size={16} /></button>
                    <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>

                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiMaximize2 size={16} /></button>
                    <button className="flex items-center gap-1.5 px-3 py-1 hover:bg-slate-200 rounded-lg text-sm font-medium">Fit <FiChevronDown size={14} /></button>
                    <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>

                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiType size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiImage size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiSquare size={16} /></button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"><FiActivity size={16} /></button>

                    <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>

                    <button className="px-3 py-1 hover:bg-slate-200 rounded-lg text-[13px] font-medium transition-colors">Background</button>
                    <button className="px-3 py-1 hover:bg-slate-200 rounded-lg text-[13px] font-medium transition-colors">Layout</button>
                    <button className="px-3 py-1 hover:bg-slate-200 rounded-lg text-[13px] font-medium transition-colors" onClick={() => setShowTemplates(!showTemplates)}>Theme</button>
                    <button className="px-3 py-1 hover:bg-slate-200 rounded-lg text-[13px] font-medium transition-colors">Transition</button>

                    <div className="w-[1px] h-6 bg-slate-300 mx-1 ml-auto"></div>
                    <button onClick={handleSave} className="flex items-center gap-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
                        <FiSave size={14} /> {saving ? 'SYNCING' : 'SYNCED'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Thumbnails Sidebar */}
                <div className="w-48 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-2 select-none overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        {slides.map((slide, idx) => (
                            <div key={slide.id} className="flex gap-2 group">
                                <span className="text-[10px] mt-4 font-bold text-slate-400 w-4">{idx + 1}</span>
                                <button
                                    onClick={() => handleActiveSlideChange(idx)}
                                    className={`flex-1 aspect-video rounded border-2 p-1 bg-white relative transition-all ${activeSlideIndex === idx ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-slate-200 hover:border-slate-400'}`}
                                >
                                    <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center pointer-events-none scale-[0.3]">
                                        <div className="font-bold text-4xl mb-4 text-center">{slide.title}</div>
                                        <div className="text-xl text-slate-400 text-center">{slide.content.substring(0, 30)}...</div>
                                    </div>
                                </button>
                            </div>
                        ))}
                        <button onClick={addSlide} className="w-full aspect-video flex-1 flex items-center justify-center text-slate-300 hover:text-orange-500 transition-colors">
                            <FiPlus size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Presentation Work Area */}
                <div className="flex-1 overflow-auto bg-[#f9fbfd] dark:bg-slate-950 p-6 flex flex-col relative custom-scrollbar">
                    {/* Canvas Ruler Vertical */}
                    <div className="absolute top-0 left-0 w-6 h-full border-r border-slate-100 flex flex-col justify-between py-12 text-[8px] text-slate-300 font-mono pointer-events-none">
                        <span>-</span><span>-</span><span>-</span><span>-</span><span>-</span>
                    </div>
                    {/* Canvas Ruler Horizontal */}
                    <div className="absolute top-0 left-6 right-0 h-6 border-b border-slate-100 flex justify-between px-12 text-[8px] text-slate-300 font-mono pointer-events-none">
                        <span>-</span><span>-</span><span>-</span><span>-</span><span>-</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className={`w-full max-w-4xl aspect-video bg-white dark:bg-slate-900 shadow-[0_1px_3px_rgba(60,64,67,.3),0_4px_8px_3px_rgba(60,64,67,.15)] flex flex-col p-12 relative group transition-all duration-300 ${isPresenting ? 'scale-[1.1] z-50 fixed inset-0 m-auto' : ''}`}>
                            <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-transparent hover:border-blue-200 transition-all rounded p-8">
                                <input
                                    value={activeSlide?.title || ''}
                                    onChange={(e) => updateSlide('title', e.target.value)}
                                    placeholder="Click to add title"
                                    className="w-full text-center text-5xl font-normal text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-100 border-none mb-6"
                                />
                                <div className="w-full border-b border-slate-100 mb-6"></div>
                                <textarea
                                    value={activeSlide?.content || ''}
                                    onChange={(e) => updateSlide('content', e.target.value)}
                                    placeholder="Click to add subtitle"
                                    className="w-full text-center text-xl text-slate-500 dark:text-slate-400 bg-transparent focus:outline-none resize-none placeholder:text-slate-100 border-none"
                                />
                            </div>
                        </div>

                        {/* Speaker Notes Area */}
                        {!isPresenting && (
                            <div className="w-full max-w-4xl mt-6">
                                <div className="bg-white border-t border-slate-200">
                                    <div className="flex items-center h-8 px-4 border-b border-slate-100">
                                        <span className="text-[11px] font-medium text-slate-500">Click to add speaker notes</span>
                                    </div>
                                    <textarea
                                        value={activeSlide?.notes || ''}
                                        onChange={(e) => updateSlide('notes', e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 p-4 text-sm focus:outline-none min-h-[100px] text-slate-600 dark:text-slate-300"
                                        placeholder=""
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Themes/Templates Sidebar (Right) */}
                <div className={`transition-all duration-300 overflow-hidden border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col ${showTemplates ? 'w-72' : 'w-0'}`}>
                    <div className="p-4 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-slate-800 dark:text-white font-medium text-sm flex items-center gap-2">
                                <FiLayers /> Templates
                            </h3>
                            <button onClick={() => setShowTemplates(false)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><FiX size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-2">
                            {[
                                { name: 'Project timeline, classic', color: 'bg-yellow-400', banner: 'Project Timeline Presentation' },
                                { name: 'Business proposal', color: 'bg-slate-900', banner: 'Partnership Proposal Presentation', textColor: 'text-white' },
                                { name: 'Simple presentation', color: 'bg-white', banner: 'Standard White Template' },
                                { name: 'Dark minimalist', color: 'bg-slate-800', banner: 'Night Mode Style', textColor: 'text-white' }
                            ].map((tpl, i) => (
                                <div key={i} className="flex flex-col gap-2 group cursor-pointer">
                                    <div className={`aspect-video rounded-lg ${tpl.color} border border-slate-200 relative overflow-hidden shadow-sm group-hover:ring-2 ring-blue-500 transition-all`}>
                                        <div className={`absolute inset-0 flex items-center justify-center p-4 text-center text-[10px] font-bold ${tpl.textColor || 'text-slate-900'} leading-tight`}>
                                            {tpl.banner}
                                        </div>
                                        {i === 0 && (
                                            <div className="absolute top-2 right-2 p-1 bg-blue-500 text-white rounded-full">
                                                <FiCheck size={10} />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-600 font-medium px-1">{tpl.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Presentation Controls floating at bottom */}
            {isPresenting && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-6 py-2 rounded-lg shadow-2xl flex items-center gap-6 border border-slate-700 z-[100] animate-in fade-in slide-in-from-bottom-5 backdrop-blur-sm">
                    <button
                        disabled={activeSlideIndex <= 0}
                        onClick={() => handleActiveSlideChange(activeSlideIndex - 1)}
                        className="p-2 hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
                    >
                        <FiArrowRightIcon size={18} />
                    </button>
                    <span className="text-[10px] font-bold tracking-widest uppercase">{activeSlideIndex + 1} / {slides.length}</span>
                    <button
                        disabled={activeSlideIndex >= slides.length - 1}
                        onClick={() => handleActiveSlideChange(activeSlideIndex + 1)}
                        className="p-2 hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
                    >
                        <FiArrowRight size={18} />
                    </button>
                    <div className="w-[1px] h-6 bg-slate-700 mx-2"></div>
                    <button onClick={togglePresentation} className="text-[10px] font-bold text-red-400 hover:text-red-300 tracking-widest uppercase transition-colors">Exit</button>
                </div>
            )}
        </div>
    );
};

export default PresentationBuilder;
