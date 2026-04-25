import React, { useState, useEffect } from 'react';
import { FiUserPlus, FiEdit2, FiTrash2, FiShield, FiMoreVertical, FiCheck, FiX, FiUsers, FiActivity, FiSettings, FiShield as FiShieldIcon } from 'react-icons/fi';
import { superAdminAPI } from '../../api/superAdmin';
import { useAuthStore } from '../../store/authStore';
import ManageStudents from './ManageStudents';
import AuditTrail from './AuditTrail';
import './AdminPages.css';

export default function AdminManagement() {
    const [activeTab, setActiveTab] = useState('admins');
    const [admins, setAdmins] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);

    const tabs = [
        { id: 'admins', label: 'Administrators', icon: <FiShieldIcon /> },
        { id: 'students', label: 'Students', icon: <FiUsers /> },
        { id: 'audit', label: 'Audit Trail', icon: <FiActivity /> },
        { id: 'system', label: 'System', icon: <FiSettings /> }
    ];

    // Create Form State
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: ''
    });

    // Role Edit State
    const [selectedRoles, setSelectedRoles] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [adminsRes, rolesRes] = await Promise.all([
                superAdminAPI.getAdmins(),
                superAdminAPI.getRoles()
            ]);
            setAdmins(adminsRes.data);
            setRoles(rolesRes.data);
        } catch (error) {
            console.error("Failed to load admin data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await superAdminAPI.createAdmin(formData);
            setShowCreateModal(false);
            setFormData({ username: '', email: '', password: '', first_name: '', last_name: '' });
            loadData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create admin');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to deactivate this admin?")) return;
        try {
            await superAdminAPI.deleteAdmin(id);
            loadData();
        } catch (error) {
            alert("Failed to delete admin");
        }
    };

    const openRoleModal = (admin) => {
        setSelectedAdmin(admin);
        setSelectedRoles([]);
        setShowRoleModal(true);
    };

    const handleRoleSave = async () => {
        if (!selectedAdmin) return;
        try {
            await superAdminAPI.assignRoles(selectedAdmin.id, selectedRoles);
            setShowRoleModal(false);
            loadData();
        } catch (error) {
            alert("Failed to update roles");
        }
    };

    const toggleRole = (roleId) => {
        if (selectedRoles.includes(roleId)) {
            setSelectedRoles(selectedRoles.filter(id => id !== roleId));
        } else {
            setSelectedRoles([...selectedRoles, roleId]);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'admins':
                return (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Scope</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {admins.map(admin => (
                                        <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white text-base">{admin.username}</div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500">{admin.first_name} {admin.last_name}</div>
                                            </td>
                                            <td className="px-6 py-4">{admin.email}</td>
                                            <td className="px-6 py-4">
                                                {admin.workspace_name ? (
                                                    <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2 py-1 rounded-full text-xs font-bold">
                                                        {admin.workspace_name}
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-full text-xs font-bold">
                                                        Global / Unassigned
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {admin.is_active ?
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto">
                                                        <FiCheck />
                                                    </div> :
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 mx-auto">
                                                        <FiX />
                                                    </div>
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openRoleModal(admin)}
                                                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                        title="Manage Roles"
                                                    >
                                                        <FiShield className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(admin.id)}
                                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Deactivate Admin"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'students':
                return <ManageStudents />;
            case 'audit':
                return <AuditTrail />;
            default:
                return <div className="text-slate-500">System settings coming soon.</div>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">System Management</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage platform resources and audit logs.</p>
                </div>
                {activeTab === 'admins' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20"
                    >
                        <FiUserPlus className="w-4 h-4" /> New Admin
                    </button>
                )}
            </div>

            <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {renderContent()}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Create New Admin</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-400 mb-1">Username</label>
                                <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-400 mb-1">Email</label>
                                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-400 mb-1">Password (Optional)</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Leave empty for auto-generated" />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-300 font-bold hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20">Create Admin</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRoleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Assign Roles</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Managing access for <span className="text-slate-900 dark:text-white font-bold">{selectedAdmin?.username}</span></p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {roles.map(role => (
                                <label key={role.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                                    <input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => toggleRole(role.id)} className="mt-1 w-4 h-4 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500" />
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{role.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400">{role.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowRoleModal(false)} className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleRoleSave} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20">Save Assignments</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
