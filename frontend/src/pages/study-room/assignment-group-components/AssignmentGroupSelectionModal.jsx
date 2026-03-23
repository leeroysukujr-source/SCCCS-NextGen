import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiX, FiUsers, FiArrowRight, FiCheckCircle, FiInfo, FiLock, FiActivity, FiShield } from 'react-icons/fi';
import { groupsAPI } from '../../../api/groups';
import { useNotify } from '../../../components/NotificationProvider';
import './AssignmentGroupSelectionModal.css';

const AssignmentGroupSelectionModal = ({ assignment, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const notify = useNotify();
    const [selectedGroup, setSelectedGroup] = useState(null);

    const { data: groups, isLoading, isError } = useQuery({
        queryKey: ['assignmentGroups', assignment.id],
        queryFn: () => groupsAPI.getAssignmentGroups(assignment.id),
    });

    const joinMutation = useMutation({
        mutationFn: (groupId) => groupsAPI.joinAssignmentGroup(groupId),
        onSuccess: (data) => {
            notify('success', 'Neural Link Established');
            queryClient.invalidateQueries(['myAssignmentGroups']);
            onSuccess(data.group.id);
        },
        onError: (err) => {
            notify('error', err.response?.data?.error || 'Link Initialization Failed');
        }
    });

    const handleJoin = () => {
        if (!selectedGroup) return;
        joinMutation.mutate(selectedGroup.id);
    };

    return (
        <div className="modal-overlay assignment-selection-nexus">
            <div className="nexus-card w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-modalPop">
                <div className="p-8 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <div>
                        <div className="text-blue-500 text-[10px] font-black tracking-[0.3em] uppercase mb-1 flex items-center gap-2">
                           <FiActivity className="animate-pulse" /> Team Synchronization
                        </div>
                        <h2 className="text-2xl font-bold text-white line-clamp-1">{assignment.title}</h2>
                        <p className="text-xs text-slate-500 mt-1">Initialize your collaboration node to begin the objective.</p>
                    </div>
                    <button className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all" onClick={onClose}><FiX /></button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#0a0f1d]/40">
                    {isLoading ? (
                        <div className="py-20 text-center">
                            <div className="nexus-scanner mx-auto mb-6"></div>
                            <p className="text-[10px] font-black text-blue-500 tracking-widest uppercase animate-pulse">Scanning Available Nodes...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(!groups || groups.length === 0) ? (
                                <div className="py-20 text-center space-y-4 opacity-30">
                                    <FiShield size={48} className="mx-auto" />
                                    <p className="font-black uppercase tracking-[0.2em] text-sm">Deployment Pending</p>
                                    <p className="text-xs max-w-xs mx-auto">Nodes for this assignment have not been initialized by the administrator.</p>
                                </div>
                            ) : (
                                groups.map(group => {
                                    const isFull = group.member_count >= group.max_members;
                                    const isSelected = selectedGroup?.id === group.id;

                                    return (
                                        <div
                                            key={group.id}
                                            onClick={() => !isFull && setSelectedGroup(group)}
                                            className={`nexus-group-item p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-6 ${
                                                isSelected 
                                                    ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.1)]' 
                                                    : isFull 
                                                        ? 'opacity-40 grayscale border-white/5 bg-white/[0.02] cursor-not-allowed' 
                                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                                            }`}
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-500 shadow-xl border border-white/5">
                                                <FiUsers size={24} />
                                            </div>
                                            
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white text-lg">{group.name}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                     <div className="flex -space-x-2">
                                                        {group.members?.slice(0, 3).map((m, i) => (
                                                            <div key={i} className="w-6 h-6 rounded-full bg-slate-700 border-2 border-[#1a2333] flex items-center justify-center text-[8px] font-black text-slate-300">
                                                                {m.username[0].toUpperCase()}
                                                            </div>
                                                        ))}
                                                     </div>
                                                     <span className={`text-[9px] font-black tracking-widest uppercase ${isFull ? 'text-red-400' : 'text-slate-500'}`}>
                                                        {group.member_count} / {group.max_members} Units
                                                     </span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {isFull ? (
                                                    <div className="px-3 py-1 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20">Saturated</div>
                                                ) : isSelected ? (
                                                    <FiCheckCircle className="text-blue-500 text-2xl animate-scale-in" />
                                                ) : (
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-500 transition-colors">Select Node</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-black/20 flex items-center justify-between">
                    <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all" onClick={onClose}>
                        Abort Entry
                    </button>
                    <button
                        onClick={handleJoin}
                        disabled={!selectedGroup || joinMutation.isPending}
                        className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${
                            !selectedGroup || joinMutation.isPending 
                                ? 'bg-slate-800 text-slate-600 grayscale cursor-not-allowed' 
                                : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95'
                        }`}
                    >
                        {joinMutation.isPending ? 'Syncing...' : <>Initialize Uplink <FiArrowRight /></>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentGroupSelectionModal;
