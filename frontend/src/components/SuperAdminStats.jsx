import React from 'react';
import { FiUsers, FiShield, FiActivity, FiBriefcase, FiZap, FiDatabase } from 'react-icons/fi';

const SuperAdminStats = ({ stats, workspacesCount }) => {
    if (!stats) return null;

    const statItems = [
        { label: 'Total Students', value: stats.total_students, icon: <FiUsers />, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
        { label: 'Total Lecturers', value: stats.total_teachers, icon: <FiUsers />, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
        { label: 'System Admins', value: stats.total_admins, icon: <FiShield />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
        { label: 'Workspaces', value: workspacesCount, icon: <FiBriefcase />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        { label: 'Active Users', value: stats.active_users, icon: <FiZap />, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
        { label: 'Total Logs', value: stats.total_logs, icon: <FiDatabase />, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
    ];

    return (
        <div className="relative group mb-10">
            {/* Animated Neon Border Beam */}
            <div className="absolute -inset-[1px] rounded-[24px] overflow-hidden pointer-events-none">
                <div className="absolute inset-[-1000%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#4f46e5_20%,transparent_40%,#06b6d4_60%,transparent_80%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            </div>

            {/* Main Content Container */}
            <div className="relative overflow-hidden bg-[#0a0f1d] border border-white/10 rounded-[23px] p-8 shadow-2xl backdrop-blur-xl">
                {/* Background Accent Gradients */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-600/20 transition-all duration-700"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <FiShield className="text-indigo-500" />
                                Global System Analytics
                            </h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                        {statItems.map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-3 group/item cursor-default">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover/item:scale-110 shadow-lg relative overflow-hidden"
                                        style={{ backgroundColor: item.bg, color: item.color, boxShadow: `0 0 20px ${item.bg}` }}
                                    >
                                        {/* Inner Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                                        {React.cloneElement(item.icon, { size: 18 })}
                                    </div>
                                    <span className="text-slate-400 text-[11px] font-bold tracking-tight group-hover/item:text-slate-100 transition-colors uppercase">
                                        {item.label}
                                    </span>
                                </div>
                                
                                <div className="flex items-baseline gap-2">
                                    <div className="text-3xl font-black text-white tracking-tighter tabular-nums transition-all duration-500 group-hover/item:translate-x-1">
                                        {item.value}
                                    </div>
                                    <div className="w-1 h-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-all duration-500" style={{ backgroundColor: item.color }}></div>
                                </div>

                                {/* Progress indicator */}
                                <div className="w-full h-[1px] bg-white/10 rounded-full overflow-hidden mt-1">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-in-out"
                                        style={{ 
                                            width: '60%', 
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

export default SuperAdminStats;
