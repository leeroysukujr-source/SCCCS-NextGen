import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
    FiShield,
    FiSearch,
    FiFilter,
    FiDownload,
    FiCalendar,
    FiUser,
    FiActivity,
    FiAlertTriangle,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiDatabase
} from 'react-icons/fi';
import apiClient from '../../api/client';

const SecurityAuditCenter = () => {
    const { user } = useAuthStore();
    const isSuper = user?.platform_role === 'SUPER_ADMIN' || user?.role === 'super_admin';

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        workspace_id: '',
        action: '',
        resource_type: '',
        start_date: '',
        end_date: '',
        limit: 50
    });
    const [workspaces, setWorkspaces] = useState([]);

    const fetchLogs = async (shouldExport = false) => {
        if (!shouldExport) setLoading(true);
        try {
            const params = { ...filters };
            if (shouldExport) params.export = true;

            const response = await apiClient.get('/security/audit-logs', { params, responseType: shouldExport ? 'blob' : 'json' });

            if (shouldExport) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `audit_export_${new Date().getTime()}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            } else {
                setLogs(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            if (!shouldExport) setLoading(false);
        }
    };

    const fetchWorkspaces = async () => {
        if (!isSuper) return;
        try {
            const res = await apiClient.get('/superadmin/workspaces');
            setWorkspaces(res.data);
        } catch (err) {
            console.error('Failed to fetch workspaces:', err);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchWorkspaces();
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        fetchLogs();
    };

    const resetFilters = () => {
        setFilters({
            workspace_id: '',
            action: '',
            resource_type: '',
            start_date: '',
            end_date: '',
            limit: 50
        });
        setTimeout(fetchLogs, 100);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-100 dark:shadow-rose-900/20">
                        <FiShield size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Security & Audit Center</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Monitor system integrity and compliance activity</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchLogs(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                        <FiDownload /> Export CSV
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                {isSuper && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><FiDatabase /> Workspace</label>
                        <select
                            name="workspace_id"
                            value={filters.workspace_id}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500/10 focus:bg-white dark:focus:bg-slate-950 outline-none text-slate-900 dark:text-white"
                        >
                            <option value="">All Workspaces</option>
                            {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><FiActivity /> Action</label>
                    <input
                        name="action"
                        value={filters.action}
                        onChange={handleFilterChange}
                        placeholder="e.g. login, delete"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500/10 focus:bg-white dark:focus:bg-slate-950 outline-none text-slate-900 dark:text-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><FiCalendar /> Start Date</label>
                    <input
                        type="date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500/10 focus:bg-white dark:focus:bg-slate-950 outline-none text-slate-900 dark:text-white"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1"><FiCalendar /> End Date</label>
                    <input
                        type="date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500/10 focus:bg-white dark:focus:bg-slate-950 outline-none text-slate-900 dark:text-white"
                    />
                </div>
                <div className="lg:col-span-2 flex gap-2">
                    <button
                        onClick={applyFilters}
                        className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        Apply Filters
                    </button>
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actor</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resource</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-8"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <FiActivity className="mx-auto text-slate-200 text-4xl mb-4" />
                                        <p className="text-slate-400 font-medium">No audit logs found matching these criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                                                    {log.username?.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{log.username || 'System'}</div>
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{log.ip_address || '0.0.0.0'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">{log.resource_type || 'system'}</div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500">ID: {log.resource_id || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">{new Date(log.created_at).toLocaleDateString()}</div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${log.status === 'success' ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                <div className="p-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-800/20">
                    <p className="text-xs text-slate-400">Showing {logs.length} entries</p>
                    <div className="flex items-center gap-2">
                        <button className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed"><FiChevronLeft /></button>
                        <button className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed"><FiChevronRight /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityAuditCenter;
