import React, { useEffect, useState } from 'react';
import { FiX, FiUser, FiMail, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import apiClient from '../api/client';

const UserListModal = ({ isOpen, onClose, title, type, workspaceId }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && type && workspaceId) {
            fetchUsers();
        }
    }, [isOpen, type, workspaceId]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            let endpoint = '';
            const params = { workspace_id: workspaceId };

            if (type === 'students') {
                endpoint = '/users/students';
            } else if (type === 'staff') {
                endpoint = '/admin/lecturers';
            } else if (type === 'active') {
                endpoint = '/users/active';
            }

            const response = await apiClient.get(endpoint, { params });
            setUsers(response.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('Failed to load user list');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-700">

                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {loading ? 'Loading...' : `${users.length} users found`}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <FiX className="text-xl text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-40 text-red-500">
                            <FiAlertCircle className="text-3xl mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500">
                            <FiUser className="text-4xl mb-2" />
                            <p>No users found in this category.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                                                        {user.first_name?.[0] || user.username?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">{user.first_name} {user.last_name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide
                                                    ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                                        user.role === 'teacher' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.is_active ? (
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium h-full">
                                                        <FiCheckCircle size={14} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-medium h-full">
                                                        <FiX size={14} /> Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListModal;
