import React, { useState, useEffect } from 'react';
import { FiShield, FiFileText, FiCpu, FiUsers, FiClock, FiActivity, FiDownload } from 'react-icons/fi';
import apiClient from '../../api/client';

const CreationHubAudit = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        totalFiles: 0,
        aiCalls: 0,
        shares: 0,
        storageUsed: '1.2 GB'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [statsRes, logsRes] = await Promise.all([
                    apiClient.get('/analytics/creation-hub/stats'),
                    apiClient.get('/analytics/audit/logs?per_page=10')
                ]);

                if (statsRes.data) {
                    setStats(statsRes.data);
                }

                if (logsRes.data && logsRes.data.logs) {
                    // Map backend logs to frontend format
                    const formattedLogs = logsRes.data.logs.map(log => {
                        const date = new Date(log.created_at);
                        const now = new Date();
                        const diffMs = now - date;
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);

                        let timeStr = 'Just now';
                        if (diffDays > 0) timeStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                        else if (diffHours > 0) timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                        else if (diffMins > 0) timeStr = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

                        return {
                            id: log.id,
                            user: log.username || 'System',
                            action: log.action.replace(/_/g, ' '),
                            target: `${log.resource_type} #${log.resource_id || ''}`,
                            time: timeStr,
                            type: log.action.toLowerCase().includes('ai') ? 'ai' : 
                                  log.action.toLowerCase().includes('delete') || log.action.toLowerCase().includes('permission') ? 'security' : 'system'
                        };
                    });
                    setLogs(formattedLogs);
                }
            } catch (error) {
                console.error("Failed to fetch audit data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="p-8 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <FiShield className="text-indigo-600" /> Creation Hub Governance
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Institutional oversight, AI ethics tracking, and file security audit.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all">
                    <FiDownload /> Export Audit Report
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: 'Total Files', value: stats.totalFiles, icon: <FiFileText />, color: 'bg-blue-500' },
                    { label: 'AI Interactions', value: stats.aiCalls, icon: <FiCpu />, color: 'bg-indigo-500' },
                    { label: 'Active Shares', value: stats.shares, icon: <FiUsers />, color: 'bg-green-500' },
                    { label: 'Storage Used', value: stats.storageUsed, icon: <FiActivity />, color: 'bg-orange-500' },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl ${s.color} text-white flex items-center justify-center shadow-lg shadow-${s.color.split('-')[1]}/20`}>
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Audit Logs */}
            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-3">
                        <FiClock className="text-indigo-500" /> Recent Activity Audit
                    </h2>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black uppercase tracking-widest">All Events</button>
                        <button className="px-4 py-2 rounded-xl text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50">Security Only</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Action</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target Resource</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Time</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center">
                                        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">No activity recorded yet</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 font-bold flex items-center justify-center text-xs">{log.user[0]}</div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{log.user}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${log.type === 'ai' ? 'bg-indigo-100 text-indigo-600' :
                                                    log.type === 'security' ? 'bg-red-100 text-red-600' :
                                                        'bg-slate-100 text-slate-600'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-6 font-medium text-slate-600 dark:text-slate-400">{log.target}</td>
                                        <td className="p-6 text-xs text-slate-400 font-bold">{log.time}</td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Verified</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CreationHubAudit;
