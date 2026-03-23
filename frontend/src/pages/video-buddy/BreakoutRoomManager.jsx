import React, { useState, useEffect } from 'react';
import { FaUsers, FaPlus, FaPlay, FaStop, FaBroadcastTower, FaUserFriends, FaClock, FaTimes, FaExchangeAlt, FaArrowRight } from 'react-icons/fa';
import apiClient from '../../api/client';

export default function BreakoutRoomManager({ roomId, participants, onClose, onBroadcast }) {
  const [numRooms, setNumRooms] = useState(2);
  const [breakoutRooms, setBreakoutRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('not_started');
  const [assignments, setAssignments] = useState({}); // {userId: roomId}
  const [timer, setTimer] = useState(10); // minutes
  const [autoJoin, setAutoJoin] = useState(true);

  // Fetch existing breakout rooms if any
  useEffect(() => {
    const fetchBreakouts = async () => {
      try {
        const res = await apiClient.get(`/rooms/${roomId}`);
        if (res.data.breakout_rooms && res.data.breakout_rooms.length > 0) {
            const roomsData = await Promise.all(
                res.data.breakout_rooms.map(id => apiClient.get(`/rooms/${id}`).then(r => r.data))
            );
            setBreakoutRooms(roomsData);
            setStatus(res.data.breakout_status || 'not_started');
            if (res.data.breakout_config?.assignments) {
                setAssignments(res.data.breakout_config.assignments);
            }
        }
      } catch (e) {
        console.error("Failed to fetch breakout rooms", e);
      }
    };
    fetchBreakouts();
  }, [roomId]);

  const handleCreateRooms = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/rooms/${roomId}/breakout`, { num_rooms: numRooms });
      setBreakoutRooms(res.data.rooms);
      
      // Auto-assign participants randomly
      const newAssignments = {};
      const roomIds = res.data.rooms.map(r => r.id);
      participants.forEach((p, index) => {
        if (p.identity !== 'me') { // Don't auto-assign host
            newAssignments[p.identity] = roomIds[index % roomIds.length];
        }
      });
      setAssignments(newAssignments);
      
      // Save assignments
      await apiClient.post(`/rooms/${roomId}/breakout/assign`, { assignments: newAssignments });
    } catch (e) {
      console.error("Failed to create breakout rooms", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRooms = async () => {
    setLoading(true);
    try {
      await apiClient.post(`/rooms/${roomId}/breakout/open`, {
        config: { assignments, timer, autoJoin }
      });
      setStatus('active');
      // Notify participants via LiveKit (this will be called from the parent)
      onBroadcast({
        type: 'BREAKOUT_START',
        rooms: breakoutRooms.map(r => ({ id: r.id, roomCode: r.room_code })),
        assignments,
        autoJoin
      });
    } catch (e) {
      console.error("Failed to open breakout rooms", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRooms = async () => {
    setLoading(true);
    try {
      await apiClient.post(`/rooms/${roomId}/breakout/close`);
      setStatus('closed');
      onBroadcast({ type: 'BREAKOUT_STOP' });
    } catch (e) {
      console.error("Failed to close breakout rooms", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (userId, bRoomId) => {
    const newAssignments = { ...assignments, [userId]: bRoomId };
    setAssignments(newAssignments);
    try {
      await apiClient.post(`/rooms/${roomId}/breakout/assign`, { assignments: newAssignments });
    } catch (e) {
      console.error("Failed to update assignments", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-white">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
        <div>
          <h3 className="text-xl font-black flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
              <FaExchangeAlt className="text-indigo-400" />
            </div>
            Breakout Engine
          </h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 px-1">Orchestration v2.4 Active</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
          <FaTimes size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {breakoutRooms.length === 0 ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-8 bg-slate-900/60 rounded-[2.5rem] border border-white/10 text-center">
              <FaUserFriends className="text-5xl text-indigo-500/20 mx-auto mb-6" />
              <h4 className="text-lg font-black mb-2 uppercase tracking-tight">Initialize Sub-Rooms</h4>
              <p className="text-slate-500 text-xs mb-8">Segment your audience into hyper-focused collaboration nodes.</p>
              
              <div className="flex items-center justify-center gap-4 mb-8">
                <button 
                  onClick={() => setNumRooms(Math.max(1, numRooms - 1))}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-xl transition-all border border-white/5"
                >
                  -
                </button>
                <div className="w-20 text-center">
                  <span className="text-4xl font-black text-indigo-400">{numRooms}</span>
                  <p className="text-[10px] text-slate-600 font-bold uppercase">Rooms</p>
                </div>
                <button 
                  onClick={() => setNumRooms(Math.min(20, numRooms + 1))}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-xl transition-all border border-white/5"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleCreateRooms}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-black rounded-3xl transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                Create Assignment Nodes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Status & Control Panel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-slate-900/60 rounded-[2rem] border border-white/5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Current Status</span>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-green-500 shadow-[0_0_10px_currentColor] animate-pulse' : 'bg-slate-700'}`}></div>
                    <span className="text-white font-black uppercase tracking-tight">{status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-slate-900/60 rounded-[2rem] border border-white/5 flex flex-col justify-between">
                <div>
                   <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-4">Auto-Transition</span>
                   <button 
                    onClick={() => setAutoJoin(!autoJoin)}
                    className="flex items-center justify-between w-full"
                   >
                     <span className="text-[10px] text-white/50 font-bold">FORCE JOIN</span>
                     <div className={`w-8 h-4 rounded-full relative transition-all duration-500 ${autoJoin ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                       <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-500 ${autoJoin ? 'left-4.5 translate-x-[1rem]' : 'left-0.5'}`}></div>
                     </div>
                   </button>
                </div>
              </div>
            </div>

            {/* Room Assignment List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Assignment Matrix</h4>
                <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold">
                   <FaClock />
                   <span>{timer}m Remaining</span>
                </div>
              </div>

              {breakoutRooms.map((room, idx) => (
                <div key={room.id} className="breakout-room-node p-6 bg-slate-900/40 border border-white/5 group hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="font-black text-indigo-300 text-sm uppercase tracking-tight">{room.name}</h5>
                    <span className="text-[10px] text-slate-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">NODE {idx + 1}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {participants.filter(p => assignments[p.identity] === room.id).map(p => (
                      <div key={p.identity} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black">{(p.name || p.identity || '?').charAt(0).toUpperCase()}</div>
                          <span className="text-xs text-white/70 font-bold uppercase tracking-tight">{p.name || p.identity}</span>
                        </div>
                        <button className="opacity-0 group-hover/item:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg text-slate-500">
                          <FaArrowRight size={10} />
                        </button>
                      </div>
                    ))}
                    {participants.filter(p => assignments[p.identity] === room.id).length === 0 && (
                      <div className="py-4 text-center border-2 border-dashed border-white/5 rounded-2xl">
                        <p className="text-[9px] text-slate-600 font-black uppercase">Unpopulated Node</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Global Controls */}
            <div className="pt-6 border-t border-white/5 space-y-4">
              {status !== 'active' ? (
                <button
                  onClick={handleOpenRooms}
                  disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white font-black rounded-3xl transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 active:scale-95"
                >
                  <FaPlay /> Activate Breakout Session
                </button>
              ) : (
                <div className="space-y-4">
                   <button
                    className="w-full py-4 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-black rounded-2xl transition-all flex items-center justify-center gap-3"
                   >
                     <FaBroadcastTower /> Broadcast to all rooms
                   </button>
                   <button
                    onClick={handleCloseRooms}
                    disabled={loading}
                    className="w-full py-5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-3xl transition-all shadow-[0_20px_40px_rgba(239,68,68,0.2)] flex items-center justify-center gap-3 active:scale-95"
                  >
                    <FaStop /> Terminate All Sessions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Branding */}
       <div className="p-4 bg-slate-900/40 border-t border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_currentColor]"></div>
           <span className="text-[8px] text-slate-500 font-black tracking-widest uppercase">Encryption Active</span>
         </div>
         <FaBroadcastTower size={10} className="text-slate-400 opacity-20" />
      </div>
    </div>
  );
}

const FaSpinner = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
