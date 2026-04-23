import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiUser, FiMessageSquare } from 'react-icons/fi';
import apiClient from '../../api/client';

const StartChatModal = ({ isOpen, onClose, onSelectUser }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length > 1) {
      const timer = setTimeout(fetchUsers, 300);
      return () => clearTimeout(timer);
    } else {
      setUsers([]);
    }
  }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/users/search?query=${search}`);
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Direct Message</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <FiX size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or username..." 
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[60vh] p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-500 text-sm">Searching...</span>
            </div>
          ) : users.length > 0 ? (
            users.map(user => (
              <button 
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="w-full flex items-center p-3 gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    user.first_name?.[0] || user.username?.[0]
                  )}
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>
                </div>
                <FiMessageSquare className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            ))
          ) : search.length > 1 ? (
            <div className="p-8 text-center text-slate-500">
              <p>No users found matching "{search}"</p>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <FiUser size={48} className="mx-auto mb-4 opacity-20" />
              <p>Type a name to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartChatModal;
