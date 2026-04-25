
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    FiTrendingUp,
    FiUsers,
    FiActivity,
    FiBox,
    FiDownload,
    FiCalendar,
    FiGlobe,
    FiBriefcase,
    FiSend,
    FiFileText,
    FiCheckCircle,
    FiClock,
    FiPlus,
    FiFile,
    FiGrid
} from 'react-icons/fi';
import {
    FaFilePdf,
    FaFileExcel,
    FaFileWord
} from 'react-icons/fa';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import api from '../../api/client';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function Reports() {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.platform_role === 'SUPER_ADMIN' || user?.role === 'super_admin';
    const [timeRange, setTimeRange] = useState('30d');

    // New States for Advanced Reporting
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [newRequestTitle, setNewRequestTitle] = useState('');
    const [newRequestDesc, setNewRequestDesc] = useState('');
    const [newRequestDate, setNewRequestDate] = useState('');
    const [newRequestWorkspace, setNewRequestWorkspace] = useState('');

    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [activeRequestId, setActiveRequestId] = useState(null);
    const [checklist, setChecklist] = useState({
        userMetrics: true,
        activityTrends: true,
        academicPerformance: true,
        resourceUtilization: false,
        securityAudit: false
    });

    const [isExportOpen, setIsExportOpen] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isExportOpen && !event.target.closest('.export-dropdown-container')) {
                setIsExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExportOpen]);

    // --- Analytics Data ---
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['system-analytics', user?.id],
        queryFn: async () => {
            const res = await api.get('/analytics/system/overview');
            return res.data;
        }
    });

    const { data: userGrowth } = useQuery({
        queryKey: ['user-growth', user?.id],
        queryFn: async () => {
            const res = await api.get('/analytics/user/growth');
            return res.data;
        }
    });

    const { data: activityTrends } = useQuery({
        queryKey: ['activity-trends', user?.id],
        queryFn: async () => {
            const res = await api.get('/analytics/activity/trends');
            return res.data;
        }
    });

    // --- Advanced Reporting Data ---
    const { data: reportRequests, refetch: refetchRequests } = useQuery({
        queryKey: ['report-requests'],
        queryFn: async () => {
            const res = await api.get('/reports/requests');
            return res.data;
        }
    });

    const { data: submissions, refetch: refetchSubmissions } = useQuery({
        queryKey: ['report-submissions'],
        queryFn: async () => {
            const res = await api.get('/reports/submissions');
            return res.data;
        }
    });

    const { data: workspaces } = useQuery({
        queryKey: ['workspaces-list'],
        queryFn: async () => {
            if (!isSuperAdmin) return [];
            const res = await api.get('/superadmin/workspaces');
            return res.data;
        },
        enabled: isSuperAdmin
    });

    const createRequestMutation = useMutation({
        mutationFn: async (data) => {
            await api.post('/reports/requests', data);
        },
        onSuccess: () => {
            setIsRequestModalOpen(false);
            setNewRequestTitle('');
            setNewRequestDate('');
            setNewRequestWorkspace('');
            refetchRequests();
            alert('Request created successfully!');
        }
    });

    const submitReportMutation = useMutation({
        mutationFn: async ({ requestId, notes, checklist }) => {
            if (requestId) {
                await api.post(`/reports/requests/${requestId}/submit`, { notes, checklist });
            } else {
                await api.post('/reports/generate', { notes, checklist });
            }
        },
        onSuccess: () => {
            setIsSubmitModalOpen(false);
            refetchRequests();
            refetchSubmissions();
            alert('Report generated and submitted successfully!');
        },
        onError: (err) => {
            alert(err.response?.data?.error || 'Failed to submit report');
        }
    });

    const handleSubmissionDownload = async (submissionId, format = 'pdf') => {
        try {
            const res = await api.post('/reports/export/download', { 
                format, 
                type: 'submission',
                submission_id: submissionId 
            }, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const ext = format === 'excel' ? 'xlsx' : format === 'word' ? 'docx' : 'pdf';
            link.setAttribute('download', `Submission_${submissionId}.${ext}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download submission.');
        }
    };

    const handleDownload = async (format) => {
        setIsExportOpen(false); // Close immediately
        try {
            const res = await api.post('/reports/export/download', { format }, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report_${new Date().toISOString()}.${format === 'excel' ? 'xlsx' : format === 'word' ? 'docx' : 'pdf'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download report. Please try again.');
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-400">Loading Report Data...</div>;

    const stats = analytics?.overview || {};

    const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="text-xl text-white" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-1 rounded-full">+12%</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            {subtext && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{subtext}</p>}
        </div>
    );

    const lineChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#94a3b8' }
            },
            title: { display: false },
        },
        scales: {
            y: {
                grid: {
                    borderDash: [4, 4],
                    color: '#334155'
                },
                ticks: { color: '#94a3b8' },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    const growthData = {
        labels: userGrowth?.labels || [],
        datasets: [
            {
                fill: true,
                label: isSuperAdmin ? 'Total Users' : 'Workspace Users',
                data: userGrowth?.data || [],
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
            },
        ],
    };

    const activityData = {
        labels: activityTrends?.labels || [],
        datasets: activityTrends?.datasets?.map(ds => ({
            ...ds,
            backgroundColor: ds.color,
            borderRadius: 4
        })) || []
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        {isSuperAdmin ? (
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg shadow-indigo-900/20">Global System Report</span>
                        ) : (
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg shadow-blue-900/20">{stats.workspace_name || 'Workspace'} Report</span>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics & Reports</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {isSuperAdmin
                            ? 'Overview of system-wide metrics across all institutions.'
                            : 'Detailed value reporting for your institution.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {!isSuperAdmin && (
                        <button
                            onClick={() => {
                                setActiveRequestId(null);
                                setIsSubmitModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30"
                        >
                            <FiPlus className="text-lg" /> Generate Report
                        </button>
                    )}
                    
                    {/* Export Dropdown */}
                    <div className="relative export-dropdown-container">
                        <button
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        >
                            <FiDownload /> Export Report
                        </button>

                        {isExportOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                <button onClick={() => handleDownload('pdf')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white">Download as PDF</button>
                                <button onClick={() => handleDownload('excel')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white">Download as Excel</button>
                                <button onClick={() => handleDownload('word')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white">Download as Word</button>
                            </div>
                        )}
                    </div>

                    {isSuperAdmin && (
                        <button
                            onClick={() => setIsRequestModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/30"
                        >
                            <FiSend /> Request Report
                        </button>
                    )}
                </div>
            </div>

            {/* Reporting Workflow Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isSuperAdmin ? 'Active Report Requests' : 'Pending Report Requests'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isSuperAdmin ? 'Track report submissions from workspaces' : 'Submit required reports to system administration'}
                        </p>
                    </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {reportRequests?.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No active requests</div>
                    ) : (
                        reportRequests?.map(req => (
                            <div key={req.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full ${req.submission_status === 'submitted'
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'}`}>
                                        {req.submission_status === 'submitted' ? <FiCheckCircle /> : <FiClock />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-slate-200">{req.title}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{req.description || 'No description provided'}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-500">
                                            <span>Due: {new Date(req.due_date).toLocaleDateString()}</span>
                                            <span>Created: {new Date(req.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {!isSuperAdmin && req.submission_status !== 'submitted' ? (
                                        <button
                                            onClick={() => {
                                                setActiveRequestId(req.id);
                                                setIsSubmitModalOpen(true);
                                            }}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/30"
                                        >
                                            Submit Now
                                        </button>
                                    ) : req.submission_status === 'submitted' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                                Submitted
                                            </span>
                                            <button 
                                                onClick={() => handleSubmissionDownload(req.id)} // Assuming req.id matches submission logic or enriched
                                                className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                                                title="Download PDF"
                                            >
                                                <FiDownload />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Past Submissions Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-500" />
                        Past Generated Reports
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Historical archive of institutional snapshots and submissions.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Report Source</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Generated Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {submissions?.map(sub => (
                                <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 dark:text-slate-200">{sub.request_title}</div>
                                        <div className="text-xs text-slate-500">{sub.is_internal ? 'Internal Institutional Snapshot' : 'Response to SuperAdmin Request'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {new Date(sub.submitted_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button 
                                                onClick={() => handleSubmissionDownload(sub.id, 'pdf')}
                                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all group flex flex-col items-center gap-1"
                                                title="Download PDF"
                                            >
                                                <FaFilePdf className="text-xl" />
                                                <span className="text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">PDF</span>
                                            </button>
                                            <button 
                                                onClick={() => handleSubmissionDownload(sub.id, 'excel')}
                                                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all group flex flex-col items-center gap-1"
                                                title="Download Excel"
                                            >
                                                <FaFileExcel className="text-xl" />
                                                <span className="text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">EXCEL</span>
                                            </button>
                                            <button 
                                                onClick={() => handleSubmissionDownload(sub.id, 'word')}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all group flex flex-col items-center gap-1"
                                                title="Download Word"
                                            >
                                                <FaFileWord className="text-xl" />
                                                <span className="text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">WORD</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!submissions || submissions.length === 0) && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                                        No reports generated yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isSuperAdmin ? (
                    <>
                        <StatCard
                            title="Total Workspaces"
                            value={stats.total_workspaces}
                            icon={FiBriefcase}
                            color="bg-indigo-500"
                            subtext="Active institutions on platform"
                        />
                        <StatCard
                            title="Total Users System-wide"
                            value={stats.total_users?.toLocaleString()}
                            icon={FiGlobe}
                            color="bg-blue-500"
                            subtext="Students, Teachers & Admins"
                        />
                        <StatCard
                            title="Active Users"
                            value={stats.active_users?.toLocaleString()}
                            icon={FiActivity}
                            color="bg-emerald-500"
                            subtext="Online in last 30 days"
                        />
                        <StatCard
                            title="System Health"
                            value="99.9%"
                            icon={FiBox}
                            color="bg-violet-500"
                            subtext="Operational Uptime"
                        />
                    </>
                ) : (
                    <>
                        <StatCard
                            title="Total Users"
                            value={stats.total_users}
                            icon={FiUsers}
                            color="bg-indigo-500"
                            subtext="Registered in your workspace"
                        />
                        <StatCard
                            title="Students Enrolled"
                            value={stats.total_students}
                            icon={FiBriefcase}
                            color="bg-blue-500"
                            subtext="Active learners"
                        />
                        <StatCard
                            title="Faculty Members"
                            value={stats.total_teachers}
                            icon={FiBriefcase}
                            color="bg-orange-500"
                            subtext="Certified instructors"
                        />
                        <StatCard
                            title="Engagement Score"
                            value="8.4/10"
                            icon={FiActivity}
                            color="bg-emerald-500"
                            subtext="Based on weekly activity"
                        />
                    </>
                )}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Growth Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isSuperAdmin ? 'Platform Growth' : 'Institution Growth'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">User registration trends over time</p>
                    </div>
                    <div className="h-64">
                        <Line options={lineChartOptions} data={growthData} />
                    </div>
                </div>

                {/* Activity Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Activity Trends</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Daily active usage & engagement</p>
                    </div>
                    <div className="h-64">
                        <Bar options={lineChartOptions} data={activityData} />
                    </div>
                </div>
            </div>

            {/* Request Modal */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">New Report Request</h3>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                console.log('Form submitted', { newRequestTitle, newRequestDate });
                                if (!newRequestTitle || !newRequestDate) {
                                    alert("Please enter a Title and a Due Date before sending the request.");
                                    return;
                                }
                                createRequestMutation.mutate({
                                    title: newRequestTitle,
                                    description: newRequestDesc,
                                    due_date: newRequestDate,
                                    workspace_id: newRequestWorkspace || null
                                });
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Target Workspace</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    value={newRequestWorkspace}
                                    onChange={e => setNewRequestWorkspace(e.target.value)}
                                >
                                    <option value="">All Workspaces</option>
                                    {workspaces?.map(ws => (
                                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Leave empty to request from all institutions.</p>
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Report Title</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                                    placeholder="e.g. Q4 Performance Review"
                                    value={newRequestTitle}
                                    onChange={e => setNewRequestTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 h-24 resize-none"
                                    placeholder="Instructions for workspace admins..."
                                    value={newRequestDesc}
                                    onChange={e => setNewRequestDesc(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white scheme-light dark:scheme-dark"
                                    value={newRequestDate}
                                    onChange={e => setNewRequestDate(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsRequestModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createRequestMutation.isLoading}
                                    className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-900/30 cursor-pointer relative z-[9999] pointer-events-auto"
                                >
                                    {createRequestMutation.isLoading ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Submission Checklist Modal */}
            {isSubmitModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <FiFileText className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Generate Report</h3>
                                <p className="text-slate-500 dark:text-slate-400">Select components to include in the final document.</p>
                            </div>
                        </div>

                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                submitReportMutation.mutate({ 
                                    requestId: activeRequestId, 
                                    notes: 'Institutional Snapshot Submission',
                                    checklist: checklist
                                });
                            }}
                        >
                            <div className="space-y-4 mb-8">
                                <label className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={checklist.userMetrics}
                                        onChange={e => setChecklist({...checklist, userMetrics: e.target.checked})}
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">User Demographics</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Student enrollment, faculty counts, and administrative roles.</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={checklist.activityTrends}
                                        onChange={e => setChecklist({...checklist, activityTrends: e.target.checked})}
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Activity Trends</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Daily active users, messaging volume, and meeting statistics.</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={checklist.academicPerformance}
                                        onChange={e => setChecklist({...checklist, academicPerformance: e.target.checked})}
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Academic Performance</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Course throughput, assignment submission rates, and grade averages.</p>
                                    </div>
                                </label>

                                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl flex items-start gap-3 mt-4">
                                    <FiActivity className="text-amber-600 dark:text-amber-400 mt-1" />
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                        System will capture a real-time snapshot of selected metrics upon submission. This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSubmitModalOpen(false)}
                                    className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitReportMutation.isLoading}
                                    className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-900/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer relative z-[9999] pointer-events-auto"
                                >
                                    {submitReportMutation.isLoading ? 'Generating...' : 'Confirm & Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
