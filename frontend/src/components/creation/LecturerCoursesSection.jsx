import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBook, FiUsers, FiPieChart, FiLayers, FiDownload, FiArrowRight, FiMessageSquare, FiPlus, FiRefreshCw, FiCheck, FiTrash2 } from 'react-icons/fi';
import apiClient from '../../api/client';

const LecturerCoursesSection = ({ onOpenTool }) => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchCourses = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await apiClient.get('/courses/my');
            setCourses(res.data);
        } catch (err) {
            console.error("Failed to fetch courses", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
        const interval = setInterval(() => fetchCourses(true), 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateCourse = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            await apiClient.post('/channels', {
                name: newName,
                course_code: newCode,
                type: 'course'
            });
            setNewName('');
            setNewCode('');
            setShowCreate(false);
            fetchCourses(true);
        } catch (e) {
            console.error(e);
            alert("Failed to create course.");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteCourse = async (course) => {
        if (!window.confirm(`Are you sure you want to delete "${course.name}"?\nThis will remove the course channel but keep assignments (unlinked).`)) return;
        try {
            await apiClient.delete(`/channels/${course.id}`);
            fetchCourses(true);
        } catch (e) {
            console.error(e);
            alert("Failed to delete course.");
        }
    };

    const handlePublish = async (course) => {
        if (!window.confirm(`Publish "${course.name}" to students?`)) return;
        try {
            await apiClient.put(`/channels/${course.id}/publish`);
            fetchCourses(true);
        } catch (e) {
            console.error(e);
            alert("Failed to publish.");
        }
    };

    const handleGenerateReport = async (course) => {
        try {
            const confirmed = window.confirm(`Generate student report for ${course.name}?`);
            if (!confirmed) return;

            const res = await apiClient.get(`/courses/${course.id}/students`);
            const students = res.data;
            const date = new Date().toLocaleDateString();

            let content = `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h1 style="border-bottom: 2px solid #333; padding-bottom: 10px;">Course Report: ${course.name}</h1>
                    <p><strong>Code:</strong> ${course.course_code || 'N/A'}<br>
                    <strong>Date:</strong> ${date}</p>
                    
                    <h2 style="margin-top: 30px;">Student Roster (${students.length})</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background-color: #f3f4f6; text-align: left;">
                                <th style="padding: 12px; border: 1px solid #e5e7eb;">Name</th>
                                <th style="padding: 12px; border: 1px solid #e5e7eb;">Email</th>
                                <th style="padding: 12px; border: 1px solid #e5e7eb;">ID / RegNo</th>
                                <th style="padding: 12px; border: 1px solid #e5e7eb;">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${students.map(s => `
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${s.name}</td>
                                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${s.email}</td>
                                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${s.username}</td>
                                    <td style="padding: 12px; border: 1px solid #e5e7eb;">${s.joined_at ? new Date(s.joined_at).toLocaleDateString() : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">Generated via Creation Hub</p>
                </div>
            `;

            const payload = {
                title: `${course.course_code || course.name} Report ${date.replace(/\//g, '-')}`,
                content: content,
                doc_type: 'smart_doc',
                visibility: 'private',
                status: 'active'
            };

            const docRes = await apiClient.post('/documents/', payload);
            if (docRes.data && docRes.data.id) {
                onOpenTool('smart_docs', docRes.data.id);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to generate report. Ensure you have permissions.");
        }
    };

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[32px]"></div>)}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                    <FiLayers className="text-indigo-500" /> My Courses & Groups
                </h2>
                <div className="flex gap-3">
                    <button onClick={() => fetchCourses(false)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Refresh">
                        <FiRefreshCw size={16} />
                    </button>
                    <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <FiPlus /> New Course
                    </button>
                </div>
            </div>

            {showCreate && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-indigo-100 dark:border-indigo-900/30 mb-6 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4 shadow-xl shadow-indigo-500/10">
                    <div className="flex-1 space-y-1 w-full">
                        <label className="text-[10px] uppercase font-black text-slate-400">Course Name</label>
                        <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Advanced Artificial Intelligence" autoFocus />
                    </div>
                    <div className="w-full md:w-48 space-y-1">
                        <label className="text-[10px] uppercase font-black text-slate-400">Course Code</label>
                        <input value={newCode} onChange={e => setNewCode(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. CS-450" />
                    </div>
                    <button disabled={creating} onClick={handleCreateCourse} className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
                        {creating ? <FiRefreshCw className="animate-spin" /> : <FiCheck />}
                        {creating ? 'Creating...' : 'Create'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length === 0 && (
                    <div className="col-span-full p-10 text-center bg-white dark:bg-slate-800 rounded-[32px] border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <FiBook size={32} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold">No course channels found.</p>
                        <p className="text-xs text-slate-400 mt-2">Courses you own will appear here.</p>
                    </div>
                )}
                {courses.map(course => (
                    <div key={course.id} className="bg-white dark:bg-slate-800 rounded-[32px] p-6 border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all shadow-sm group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-[60px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl text-indigo-600 dark:text-indigo-300">
                                    <FiBook size={24} />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {course.course_code || 'CODE'}
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course); }} className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Delete Course">
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1 truncate" title={course.name}>{course.name}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-6">Channel Owner</p>

                            <div className="grid grid-cols-3 gap-2 mb-6 border-y border-slate-50 dark:border-slate-700 py-4">
                                <div className="text-center">
                                    <p className="text-lg font-black text-slate-800 dark:text-white">{course.stats?.students || 0}</p>
                                    <p className="text-[9px] uppercase font-bold text-slate-400">Students</p>
                                </div>
                                <div className="text-center border-l border-slate-50 dark:border-slate-700">
                                    <p className="text-lg font-black text-slate-800 dark:text-white">{course.stats?.groups || 0}</p>
                                    <p className="text-[9px] uppercase font-bold text-slate-400">Groups</p>
                                </div>
                                <div className="text-center border-l border-slate-50 dark:border-slate-700">
                                    <p className="text-lg font-black text-slate-800 dark:text-white">{course.stats?.assignments || 0}</p>
                                    <p className="text-[9px] uppercase font-bold text-slate-400">Tasks</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {(course.status === 'draft' || !course.status) && (
                                    <button onClick={(e) => { e.stopPropagation(); handlePublish(course); }} className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                                        <FiCheck /> Publish Course
                                    </button>
                                )}
                                <button onClick={() => navigate(`/chat/${course.id}`)} className="w-full py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                                    <FiMessageSquare /> Enter Channel
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => handleGenerateReport(course)} className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                                        <FiDownload /> Report
                                    </button>
                                    {/* We can trigger group creation via assignment tool */}
                                    {/* Can open AssignmentBuilder with pre-selected channel? */}
                                    <button onClick={() => alert("To create groups, create a new Assignment and select 'Group Configuration'.")} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                                        <FiUsers /> Groups
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LecturerCoursesSection;
