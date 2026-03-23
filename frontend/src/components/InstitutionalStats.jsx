import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { workspaceAPI } from '../api/workspace';
import { FiUsers, FiBook, FiMessageSquare, FiVideo, FiShield } from 'react-icons/fi';

const InstitutionalStats = ({ workspaceId }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['workspace-stats', workspaceId],
        queryFn: () => workspaceAPI.getStats(workspaceId),
        enabled: !!workspaceId,
        refetchInterval: 60000
    });

    if (isLoading) return <div className="animate-pulse bg-slate-800 h-32 rounded-xl"></div>;
    if (!data) return null;

    const { stats } = data;

    const statItems = [
        { label: 'Students', value: stats.students, icon: <FiUsers />, color: 'text-blue-400' },
        { label: 'Staff members', value: stats.staff, icon: <FiShield />, color: 'text-indigo-400' },
        { label: 'Classes', value: stats.classes, icon: <FiBook />, color: 'text-emerald-400' },
        { label: 'Active Channels', value: stats.channels, icon: <FiMessageSquare />, color: 'text-orange-400' },
        { label: 'Video Rooms', value: stats.rooms, icon: <FiVideo />, color: 'text-rose-400' },
    ];

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <FiShield className="text-indigo-500" />
                Institutional Oversight
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {statItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`${item.color} opacity-80`}>{item.icon}</span>
                            <span className="text-slate-400 text-xs font-medium">{item.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-100">{item.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InstitutionalStats;
