import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { workspaceAPI } from '../api/workspace';
import { FiUsers, FiBook, FiMessageSquare, FiVideo, FiShield, FiTrendingUp } from 'react-icons/fi';

const InstitutionalStats = ({ workspaceId }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['workspace-stats', workspaceId],
        queryFn: () => workspaceAPI.getStats(workspaceId),
        enabled: !!workspaceId,
        refetchInterval: 60000
    });

    if (isLoading) return (
        <div className="bg-slate-900/20 animate-pulse h-32 rounded-2xl mb-8 border border-white/5 shadow-xl"></div>
    );
    
    if (!data) return null;

    const { stats } = data;

    const statItems = [
        { label: 'Students', value: stats.students, icon: <FiUsers />, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
        { label: 'Staff members', value: stats.staff, icon: <FiShield />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
        { label: 'Classes', value: stats.classes, icon: <FiBook />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        { label: 'Active Channels', value: stats.channels, icon: <FiMessageSquare />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
        { label: 'Video Rooms', value: stats.rooms, icon: <FiVideo />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    ];

    return (
        <div className="relative group mb-10">
            {/* Animated Neon Border Beam */}
            <div className="absolute -inset-[1px] rounded-[24px] overflow-hidden pointer-events-none">
                <div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#6366f1_20%,transparent_40%,#a855f7_60%,transparent_80%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            </div>

            {/* Main Content Container */}
            <div className="relative overflow-hidden bg-[#02040a] border border-white/10 rounded-[23px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                {/* Background Accent Gradients */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-600/10 transition-all duration-700"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-purple-600/10 transition-all duration-700"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <FiShield className="text-indigo-500" />
                                Institutional Oversight
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 text-indigo-400/60 text-[10px] font-bold tracking-wider uppercase">
                            <FiTrendingUp className="animate-bounce" /> Live Monitor
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        {statItems.map((item, idx) => (
                            <div 
                                key={idx} 
                                className="flex flex-col gap-3 group/item cursor-default"
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover/item:scale-110 shadow-lg relative overflow-hidden"
                                        style={{ backgroundColor: item.bg, color: item.color, boxShadow: `0 0 20px ${item.bg}` }}
                                    >
                                        {/* Inner Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                                        {React.cloneElement(item.icon, { size: 18 })}
                                    </div>
                                    <span className="text-slate-400 text-[11px] font-bold tracking-tight group-hover/item:text-slate-100 transition-colors">
                                        {item.label}
                                    </span>
                                </div>
                                
                                <div className="flex items-baseline gap-2">
                                    <div className="text-3xl font-black text-white tracking-tighter tabular-nums transition-all duration-500 group-hover/item:translate-x-1">
                                        {item.value}
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full opacity-0 group-hover/item:opacity-100 transition-all duration-500" style={{ backgroundColor: item.color }}></div>
                                </div>

                                {/* Refined progress indicator */}
                                <div className="w-full h-[1px] bg-white/10 rounded-full overflow-hidden mt-1">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-in-out"
                                        style={{ 
                                            width: '40%', 
                                            backgroundColor: item.color,
                                            boxShadow: `0 0 15px ${item.color}`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstitutionalStats;
