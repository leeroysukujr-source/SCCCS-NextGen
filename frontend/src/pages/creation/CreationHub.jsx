import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiLayout, FiFileText, FiPenTool, FiGrid, FiPlus, FiClock, FiStar, FiMoreVertical,
    FiSearch, FiFilter, FiFolder, FiPieChart, FiMonitor, FiCheckCircle, FiCalendar, FiUsers, FiX,
    FiLayers, FiUserCheck, FiMessageSquare, FiCpu, FiBookOpen, FiEdit2, FiTrash2, FiShare2
} from 'react-icons/fi';
import SmartDocEditor from '../../components/creation/SmartDocEditor';
import QuickNotes from '../../components/creation/QuickNotes';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useNotify } from '../../components/NotificationProvider';

// Lazy load tools
const Whiteboard = React.lazy(() => import('../video-buddy/Whiteboard'));
const DataSheetEditor = React.lazy(() => import('../../components/creation/DataSheetEditor'));
const PresentationBuilder = React.lazy(() => import('../../components/creation/PresentationBuilder'));
const AssignmentBuilder = React.lazy(() => import('../../components/creation/AssignmentBuilder'));
const RubricCreator = React.lazy(() => import('../../components/creation/RubricCreator'));
const ShareModal = React.lazy(() => import('../../components/creation/ShareModal'));
const LecturerCoursesSection = React.lazy(() => import('../../components/creation/LecturerCoursesSection'));

const CreationHub = () => {
    const { user } = useAuthStore();
    const [view, setView] = useState('dashboard'); // 'dashboard', 'editor'
    const [activeTool, setActiveTool] = useState(null);
    const [selectedId, setSelectedId] = useState(null);

    const handleOpenTool = (tool, id = 'new') => {
        setActiveTool(tool);
        setSelectedId(id);
        setView('editor');
    };

    const handleBack = () => {
        setView('dashboard');
        setActiveTool(null);
        setSelectedId(null);
    };

    if (view === 'editor') {
        return (
            <EditorShell
                tool={activeTool}
                id={selectedId}
                user={user}
                onBack={handleBack}
            />
        );
    }

    return (
        <div className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 w-full overflow-x-hidden">
            <DashboardHeader user={user} />
            <div className="flex-1 p-4 md:p-8 space-y-10 md:space-y-16 font-sans w-full max-w-7xl mx-auto box-border">
                {user?.role !== 'student' && (
                    <Suspense fallback={<div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />}>
                        <LecturerCoursesSection onOpenTool={handleOpenTool} />
                    </Suspense>
                )}

                <CreateNewSection onOpenTool={handleOpenTool} user={user} />

                {/* Student Room Section */}
                {user?.role === 'student' && <StudentRoomSection />}

                <TemplatesSection onOpenTool={handleOpenTool} user={user} />
                <RecentFilesSection onOpenTool={handleOpenTool} />
            </div>
        </div>
    );
};

const DashboardHeader = ({ user }) => (
    <div className="flex items-center justify-between p-4 md:p-8 pb-0 w-full max-w-7xl mx-auto">
        <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Creation Hub
            </h1>
            <p className="text-xs md:text-base text-slate-500 dark:text-slate-400 mt-1 md:mt-2 line-clamp-1 md:line-clamp-none">
                Unified workspace for academic content and assessment design.
            </p>
        </div>
        <div className="flex-shrink-0 ml-4 hidden sm:block">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white dark:border-slate-800 bg-indigo-500 flex items-center justify-center text-white text-xs md:text-sm font-bold ring-2 ring-indigo-500/20 shadow-xl">
                {user?.first_name?.charAt(0) || 'U'}
            </div>
        </div>
    </div>
);

const CreateNewSection = ({ onOpenTool, user }) => {
    const tools = [
        { id: 'smart_docs', name: 'Smart Doc', icon: <FiFileText size={24} />, color: 'bg-blue-600', desc: 'Advanced Word Processor', subtitle: 'Academic Writing & Docs' },
        { id: 'data_sheet', name: 'Data Sheet', icon: <FiGrid size={24} />, color: 'bg-green-600', desc: 'Academic Spreadsheet', subtitle: 'Data & Analysis' },
        { id: 'presentation', name: 'Presentation', icon: <FiMonitor size={24} />, color: 'bg-orange-600', desc: 'Lecture Slides', subtitle: 'Interactive Presentations' },
        { id: 'rubric', name: 'Rubric Creator', icon: <FiCheckCircle size={24} />, color: 'bg-teal-600', desc: 'Assessment Standards', subtitle: 'Grading Frameworks', role: 'teacher' },
        { id: 'assignment', name: 'Assignment', icon: <FiPieChart size={24} />, color: 'bg-purple-600', desc: 'Assessment Builder', subtitle: 'Task & Quiz Design', excludedRoles: ['student'] },
        { id: 'whiteboard', name: 'Whiteboard', icon: <FiPenTool size={24} />, color: 'bg-indigo-600', desc: 'Lesson Planning Board', subtitle: 'Visual Collaboration', excludedRoles: ['student'] },
    ].filter(tool => (!tool.role || user?.role === tool.role) && (!tool.excludedRoles || !tool.excludedRoles.includes(user?.role)));

    return (
        <div className="space-y-6 w-full">
            <h2 className="text-sm md:text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <FiPlus className="text-indigo-500" /> Start a new project
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 w-full">
                {tools.map(tool => (
                    <div
                        key={tool.id}
                        className="group bg-white dark:bg-slate-800 rounded-[28px] md:rounded-[40px] border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-all p-6 md:p-10 flex flex-col relative overflow-hidden shadow-sm hover:-translate-y-1 duration-300"
                    >
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl ${tool.color} text-white flex items-center justify-center mb-4 md:mb-6 shadow-lg group-hover:rotate-6 transition-all duration-500`}>
                            {tool.icon}
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg md:text-2xl">{tool.name}</h3>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{tool.subtitle}</p>
                        <p className="text-[10px] md:text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed opacity-80">{tool.desc}</p>

                        <div className="mt-8 md:mt-10 flex items-center gap-3">
                            <button
                                onClick={() => onOpenTool(tool.id)}
                                className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-3 md:py-4 rounded-2xl md:rounded-[24px] font-black text-[10px] md:text-xs hover:opacity-90 transition-all shadow-md active:scale-95"
                            >
                                CREATE NEW
                            </button>
                            <button
                                onClick={() => { }}
                                className="px-4 py-3 md:py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl md:rounded-[24px] font-black text-[10px] md:text-xs hover:bg-slate-200 transition-all active:scale-95"
                            >
                                RECENT
                            </button>
                        </div>

                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-700/30 rounded-bl-[100px] -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudentRoomSection = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8 w-full">
            <div className="text-center space-y-2 mb-8">
                <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide">Collaborative space for peer-to-peer learning and academic excellence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
                {/* Card 1: Group Study Rooms */}
                <div
                    onClick={() => navigate('/study-room/group')}
                    className="bg-white dark:bg-slate-800 rounded-[32px] p-8 text-center border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group cursor-pointer"
                >
                    <div className="w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all mb-4">
                        <FiUsers size={28} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Group Study Rooms</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Join virtual spaces for collaborative learning with voice, video, and whiteboards.</p>
                </div>

                {/* Card 2: Peer Tutoring */}
                <div
                    onClick={() => navigate('/study-room/tutoring')}
                    className="bg-white dark:bg-slate-800 rounded-[32px] p-8 text-center border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group cursor-pointer"
                >
                    <div className="w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 group-hover:text-green-600 group-hover:bg-green-50 transition-all mb-4">
                        <FiUserCheck size={28} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Peer Tutoring</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Connect with student tutors for one-on-one help or volunteer to teach others.</p>
                </div>

                {/* Card 3: Topic Discussions */}
                <div
                    onClick={() => navigate('/study-room/discussions')}
                    className="bg-white dark:bg-slate-800 rounded-[32px] p-8 text-center border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all group cursor-pointer"
                >
                    <div className="w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all mb-4">
                        <FiMessageSquare size={28} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Topic Discussions</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Topic-based forums for Q&A, sharing notes, and academic discussions.</p>
                </div>
            </div>
        </div>
    );
};

const TemplatesSection = ({ onOpenTool, user }) => {
    const templates = [
        { name: 'Assignment Template', icon: <FiPieChart />, type: 'assignment' },
        { name: 'Lab Report', icon: <FiFileText />, type: 'smart_docs' },
        { name: 'Thesis format', icon: <FiFileText />, type: 'smart_docs' },
        { name: 'Lesson plan', icon: <FiCalendar />, type: 'smart_docs' },
        { name: 'Gradebook sheet', icon: <FiGrid />, type: 'data_sheet' },
    ];

    const visibleTemplates = templates.filter(t => user?.role !== 'student' || t.type !== 'assignment');

    return (
        <div className="space-y-6 w-full">
            <h2 className="text-sm md:text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <FiLayers className="text-indigo-500" /> Quick Templates
            </h2>
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 no-scrollbar snap-x">
                {visibleTemplates.map((tpl, i) => (
                    <button
                        key={i}
                        onClick={() => onOpenTool(tpl.type)}
                        className="min-w-[140px] md:min-w-[200px] group flex flex-col items-center gap-4 p-6 md:p-8 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all snap-center active:scale-95"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-50 dark:bg-slate-700 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all flex items-center justify-center">
                            {tpl.icon}
                        </div>
                        <span className="text-[10px] md:text-xs font-black text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center">{tpl.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const RecentFilesSection = ({ onOpenTool }) => {
    const notify = useNotify();
    const [creations, setCreations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('recent'); // 'recent', 'shared', 'starred', 'trash'
    const [openMenuId, setOpenMenuId] = useState(null);

    const fetchCreations = () => {
        setLoading(true);
        const endpoint = filter === 'recent' ? '/documents/' : `/documents/?filter=${filter}`;
        apiClient.get(endpoint)
            .then(res => setCreations(res.data))
            .catch(err => console.error("Failed to load creations", err))
            .finally(() => setLoading(false));
    };

    React.useEffect(() => {
        fetchCreations();
    }, [filter]);

    React.useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    const getIcon = (type) => {
        switch (type) {
            case 'smart_doc': return <FiFileText />;
            case 'data_sheet': return <FiGrid />;
            case 'presentation': return <FiMonitor />;
            case 'assignment': return <FiPieChart />;
            case 'rubric': return <FiCheckCircle />;
            case 'whiteboard': return <FiPenTool />;
            default: return <FiFileText />;
        }
    };

    const handleRestore = async (e, id) => {
        e.stopPropagation();
        try {
            await apiClient.post(`/documents/${id}/restore`);
            fetchCreations();
        } catch (err) {
            console.error("Restore failed", err);
        }
    };

    const handleDeletePermanent = async (e, id) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to permanently delete this file?")) return;
        try {
            await apiClient.delete(`/documents/${id}?hard=true`);
            fetchCreations();
        } catch (err) {
            console.error("Hard delete failed", err);
        }
    };

    const handleToggleStar = async (e, item) => {
        e.stopPropagation();
        try {
            await apiClient.put(`/documents/${item.id}`, { is_starred: !item.is_starred });
            notify('success', item.is_starred ? 'Unstarred' : 'Starred successfully');
            setOpenMenuId(null);
            fetchCreations();
        } catch (err) {
            notify('error', 'Failed to toggle star');
            console.error("Star toggle failed", err);
        }
    };

    const handleTrash = async (e, id) => {
        e.stopPropagation();
        try {
            await apiClient.delete(`/documents/${id}`);
            notify('success', 'Moved to trash');
            setOpenMenuId(null);
            fetchCreations();
        } catch (err) {
            notify('error', 'Failed to move to trash');
            console.error("Move to trash failed", err);
        }
    };

    const handleRename = async (e, item) => {
        e.stopPropagation();
        const newTitle = prompt("Enter new title:", item.title);
        if (newTitle && newTitle !== item.title) {
            try {
                await apiClient.put(`/documents/${item.id}`, { title: newTitle });
                notify('success', 'Renamed successfully');
                setOpenMenuId(null);
                fetchCreations();
            } catch (err) {
                notify('error', 'Failed to rename');
                console.error("Rename failed", err);
            }
        } else {
            setOpenMenuId(null);
        }
    };

    const handleToggleVisibility = async (e, item) => {
        e.stopPropagation();
        const newVisibility = item.visibility === 'private' ? 'workspace' : 'private';
        try {
            await apiClient.put(`/documents/${item.id}`, { visibility: newVisibility });
            notify('success', `Project is now ${newVisibility === 'workspace' ? 'visible to the workspace' : 'private'}`);
            setOpenMenuId(null);
            fetchCreations();
        } catch (err) {
            notify('error', 'Failed to update visibility');
            console.error("Visibility toggle failed", err);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Library</span>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
                    {[
                        { id: 'recent', label: 'Recent', icon: <FiClock size={14} /> },
                        { id: 'shared', label: 'Shared with me', icon: <FiUsers size={14} /> },
                        { id: 'starred', label: 'Starred', icon: <FiStar size={14} /> },
                        { id: 'trash', label: 'Trash', icon: <FiFolder size={14} /> },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            {f.icon} {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            placeholder="Find in files..."
                            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        />
                    </div>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm transition-all"><FiFilter size={18} /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full">
                {creations.length === 0 && (
                    <div className="col-span-full py-20 bg-white dark:bg-slate-800 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center text-slate-400">
                        <FiStar size={48} className="mb-4 opacity-20" />
                        <span className="font-bold tracking-widest text-xs uppercase text-center px-10">No {filter} files found.<br />Your items will appear here once created or shared.</span>
                    </div>
                )}
                {creations.map(item => (
                    <div
                        key={item.id}
                        onClick={() => filter !== 'trash' && onOpenTool(item.doc_type, item.id)}
                        className={`group bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-all ${filter === 'trash' ? 'cursor-default opacity-80' : 'cursor-pointer'} relative hover:z-10 w-full`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                                {getIcon(item.doc_type)}
                            </div>
                            <div className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-700 text-[9px] font-black uppercase text-slate-400 tracking-tighter">
                                {filter === 'trash' ? 'Trashed' : (item.visibility === 'private' ? 'Draft' : 'Published')}
                            </div>
                            {item.visibility !== 'private' && filter !== 'trash' && (
                                <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 rounded-full flex items-center gap-1.5 text-white shadow-xl shadow-green-500/30 animate-in slide-in-from-top-2">
                                    <FiCheckCircle size={10} strokeWidth={4} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
                                </div>
                            )}
                        </div>
                        <h3 className="font-black text-slate-800 dark:text-white text-md line-clamp-1 mb-1 transition-colors group-hover:text-indigo-600 uppercase tracking-tight">{item.title}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">{item.doc_type?.replace('_', ' ')} • {new Date(item.updated_at).toLocaleDateString()}</p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
                            <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-indigo-500 flex items-center justify-center text-[8px] font-bold text-white">
                                    {(item.owner_name || 'U')[0]}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {filter === 'trash' ? (
                                    <>
                                        <button onClick={(e) => handleRestore(e, item.id)} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-all" title="Restore"><FiClock size={16} /></button>
                                        <button onClick={(e) => handleDeletePermanent(e, item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete Permanently"><FiX size={16} /></button>
                                    </>
                                ) : (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                            className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
                                        >
                                            <FiMoreVertical />
                                        </button>
                                        {openMenuId === item.id && (
                                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in slide-in-from-bottom-2" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={(e) => { e.stopPropagation(); onOpenTool(item.doc_type, item.id); }} className="w-full text-left px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors outline-none">
                                                    <FiEdit2 size={14} /> Edit Project
                                                </button>
                                                <button onClick={(e) => handleRename(e, item)} className="w-full text-left px-4 py-3 flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors outline-none">
                                                    <FiFileText size={14} /> Rename
                                                </button>
                                                <button onClick={(e) => handleToggleVisibility(e, item)} className={`w-full text-left px-4 py-3 flex items-center gap-3 text-xs font-bold transition-colors outline-none ${item.visibility !== 'private' ? 'text-green-600 bg-green-50 dark:bg-green-900/10' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                                    <FiCheckCircle size={14} /> {item.visibility === 'private' ? 'Publish to Workspace' : 'Currently Published'}
                                                </button>
                                                <button onClick={(e) => handleToggleStar(e, item)} className={`w-full text-left px-4 py-3 flex items-center gap-3 text-xs font-bold transition-colors outline-none ${item.is_starred ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                                    <FiStar size={14} fill={item.is_starred ? "currentColor" : "none"} /> {item.is_starred ? 'Starred' : 'Star Project'}
                                                </button>
                                                <div className="border-t border-slate-50 dark:border-slate-700/50 my-1"></div>
                                                <button onClick={(e) => handleTrash(e, item.id)} className="w-full text-left px-4 py-3 flex items-center gap-3 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors outline-none">
                                                    <FiTrash2 size={14} /> Move to Trash
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

import VersionHistorySidebar from '../../components/creation/VersionHistorySidebar';


const EditorShell = ({ tool, id, user, onBack }) => {
    const [showShare, setShowShare] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRestore = (version) => {
        setRefreshKey(prev => prev + 1);
        setShowHistory(false);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden font-sans relative">
            <div className="flex-1 overflow-hidden relative" key={refreshKey}>
                <div className="absolute top-4 right-20 z-[60] flex gap-2">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="p-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-slate-500 hover:text-indigo-600 transition-all"
                        title="Version History"
                    >
                        <FiClock size={20} />
                    </button>
                </div>

                {tool === 'smart_docs' && <SmartDocEditor docId={id === 'new' ? null : id} onBack={onBack} onShare={() => setShowShare(true)} />}
                {tool === 'quick_notes' && <QuickNotes />}
                {/* ... other tools ... */}
                {(tool === 'whiteboard' || tool === 'design_canvas') && (
                    <Suspense fallback={<div>Loading Board...</div>}>
                        <Whiteboard roomId={`creation-${id === 'new' ? Date.now() : id}`} isReadOnly={false} />
                    </Suspense>
                )}
                {tool === 'data_sheet' && (
                    <Suspense fallback={<div>Loading Data Sheet...</div>}>
                        <DataSheetEditor docId={id === 'new' ? null : id} onBack={onBack} onShare={() => setShowShare(true)} />
                    </Suspense>
                )}
                {tool === 'presentation' && (
                    <Suspense fallback={<div>Loading Presentation...</div>}>
                        <PresentationBuilder docId={id === 'new' ? null : id} onBack={onBack} onShare={() => setShowShare(true)} />
                    </Suspense>
                )}
                {tool === 'rubric' && (
                    <Suspense fallback={<div>Loading Rubric...</div>}>
                        <RubricCreator docId={id === 'new' ? null : id} onBack={onBack} onShare={() => setShowShare(true)} />
                    </Suspense>
                )}
                {tool === 'assignment' && (
                    <Suspense fallback={<div>Loading Assignment Builder...</div>}>
                        <AssignmentBuilder docId={id === 'new' ? null : id} onBack={onBack} onShare={() => setShowShare(true)} />
                    </Suspense>
                )}

                <VersionHistorySidebar
                    docId={id === 'new' ? null : id}
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    onRestore={handleRestore}
                />
            </div>

            {showShare && (
                <Suspense fallback={null}>
                    <ShareModal
                        docId={id}
                        title={`Creation #${id}`}
                        type={tool}
                        onClose={() => setShowShare(false)}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default CreationHub;
