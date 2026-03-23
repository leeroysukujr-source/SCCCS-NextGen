import React, { useState, useEffect } from 'react';
import { FiUsers, FiCheck, FiX, FiLock, FiArrowRight } from 'react-icons/fi';
import apiClient from '../../api/client';
import { useNotify } from '../NotificationProvider';

const GroupJoiningInterface = ({ assignment }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const notify = useNotify();

    const fetchGroups = async () => {
        try {
            const res = await apiClient.get(`/assignments/${assignment.id}/groups`);
            setGroups(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [assignment.id]);

    const handleJoin = async (groupId) => {
        setJoining(true);
        try {
            await apiClient.post(`/assignments/groups/${groupId}/join`);
            notify('success', 'Joined group successfully!');
            fetchGroups();
        } catch (err) {
            notify('error', err.response?.data?.error || 'Failed to join group');
        } finally {
            setJoining(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading groups...</div>;

    const userGroup = groups.find(g => g.is_member);

    return (
        <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-tight">
                    {assignment.title}
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-2 font-medium">
                    {assignment.description}
                </p>
            </div>

            {userGroup && (
                <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl border border-green-100 dark:border-green-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                            <FiCheck size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">You are in</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white">{userGroup.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                        <FiUsers />
                        <span className="font-bold">{userGroup.member_count} Members</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(group => {
                    const isFull = group.max_members && group.member_count >= group.max_members;
                    const isMember = group.is_member;

                    return (
                        <div 
                            key={group.id} 
                            className={`p-6 rounded-3xl border transition-all animate-pop magic-card ${
                                isMember 
                                ? 'border-green-500 shadow-lg' 
                                : 'border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{group.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <FiUsers size={12} className="text-slate-400" />
                                        <span className={`text-xs font-bold ${isFull ? 'text-red-500' : 'text-slate-500'}`}>
                                            {group.member_count} / {group.max_members || '∞'}
                                        </span>
                                    </div>
                                </div>
                                {isFull && !isMember && <FiLock className="text-slate-300" />}
                                {isMember && <FiCheck className="text-green-500" size={20} />}
                            </div>

                            {!userGroup && !isFull && (
                                <button
                                    onClick={() => handleJoin(group.id)}
                                    disabled={joining}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    Join Group <FiArrowRight />
                                </button>
                            )}

                            {isFull && !userGroup && (
                                <button
                                    disabled
                                    className="w-full py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-not-allowed"
                                >
                                    Group Full
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GroupJoiningInterface;
