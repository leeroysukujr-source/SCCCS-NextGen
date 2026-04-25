import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FiUsers as Users,
  FiUserPlus as UserPlus,
  FiShield as Shield,
  FiActivity as Activity,
  FiSettings as Settings,
  FiSearch as Search,
  FiMoreVertical as MoreVertical,
  FiEdit as Edit,
  FiTrash2 as Trash2,
  FiCheckCircle as CheckCircle,
  FiXCircle as XCircle,
  FiAlertTriangle as AlertTriangle,
  FiMonitor as Monitor,
  FiBox as Box,
  FiPlus as Plus,
  FiBriefcase as Briefcase,
  FiLogIn as LogIn
} from 'react-icons/fi'
import { getFullImageUrl } from '../../utils/api'
import apiClient from '../../api/client'
import { useNotify, useConfirm } from '../../components/NotificationProvider'
import SettingsDashboard from './SettingsDashboard'
import LogoUpload from '../../components/LogoUpload'
import UserListModal from '../../components/UserListModal'
import { superAdminAPI } from '../../api/superAdmin'
import { useAuthStore } from '../../store/authStore'
import SuperAdminStats from '../../components/SuperAdminStats'

const SuperAdminDashboard = () => {
    const { updateUser } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [admins, setAdmins] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wsLoading, setWsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Sync activeTab with URL
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('control-center')) setActiveTab('dashboard');
        else if (path.includes('workspaces')) setActiveTab('workspaces');
        else if (path.includes('system-admins')) setActiveTab('admins');
        else if (path.includes('global-users')) setActiveTab('users');
        else if (path.includes('reports')) setActiveTab('activity');
        else if (path.includes('settings')) setActiveTab('settings');
        else if (path.includes('feature-lab')) setActiveTab('features');
        else if (path.includes('security')) setActiveTab('activity');
    }, [location.pathname]);

    const enterWorkspace = async (workspace) => {
        if (await confirm(`You are about to enter '${workspace.name}' view. This will redirect you to the main dashboard scoped to this institution.`)) {
            updateUser({ workspace_id: workspace.id, workspace_name: workspace.name });
            navigate('/');
        }
    };

    const [selectedWorkspace, setSelectedWorkspace] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null); // 'admin-1', 'ws-2'

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [workspaceAnalytics, setWorkspaceAnalytics] = useState(null);
    const [analyticsTab, setAnalyticsTab] = useState('overview');

    // User List Modal State
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [userModalType, setUserModalType] = useState(null);
    const [userModalTitle, setUserModalTitle] = useState('');

    const openUserList = (type, title) => {
        if (!workspaceAnalytics?.workspace?.id) return;
        setUserModalType(type);
        setUserModalTitle(title);
        setUserModalOpen(true);
    };

    // Modals
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [isWsModalOpen, setIsWsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [editingWs, setEditingWs] = useState(null);

    const notify = useNotify();
    const confirm = useConfirm();

    // Form States
    const [adminForm, setAdminForm] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        workspace_id: ''
    });

    const [wsForm, setWsForm] = useState({
        name: '',
        slug: '',
        code: '',
        description: '',
        admin_id: '',
        logoFile: null
    });

    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [stats, setStats] = useState({
        refetchInterval: 60000,
        refetchIntervalInBackground: false,
        total_admins: 0,
        total_teachers: 0,
        total_students: 0,
        active_users: 0,
        total_logs: 0
    });

    // User Assignment State
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [targetWorkspace, setTargetWorkspace] = useState('');
    const [userRole, setUserRole] = useState('teacher');
    const [userSearch, setUserSearch] = useState('');

    // Feature Flags State
    const [globalFlags, setGlobalFlags] = useState([]);
    const [flagsLoading, setFlagsLoading] = useState(false);

    useEffect(() => {
        fetchAll();
        fetchFlags();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab]);

    const fetchFlags = async () => {
        setFlagsLoading(true);
        try {
            const response = await apiClient.get('/features/global');
            setGlobalFlags(response.data);
        } catch (err) {
            console.error('Failed to fetch flags:', err);
        } finally {
            setFlagsLoading(false);
        }
    };

    const toggleFlag = async (name, currentState) => {
        try {
            await apiClient.post('/features/global', {
                name: name,
                is_enabled: !currentState
            });
            notify('success', `Feature '${name}' ${!currentState ? 'enabled' : 'disabled'}`);
            fetchFlags();
        } catch (err) {
            notify('error', 'Failed to update feature flag');
        }
    };

    const fetchAll = () => {
        fetchAdmins();
        fetchWorkspaces();
        fetchLogs();
        fetchStats();
    };

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/superadmin/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const response = await apiClient.get('/superadmin/logs');
            setLogs(response.data.items || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const fetchAdmins = async () => {
        try {
            const response = await apiClient.get('/superadmin/admins');
            setAdmins(response.data);
        } catch (error) {
            console.error('Error fetching admins:', error);
            notify('Failed to load administrators', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkspaces = async () => {
        try {
            const response = await apiClient.get('/superadmin/workspaces');
            setWorkspaces(response.data);
        } catch (error) {
            console.error('Error fetching workspaces:', error);
        } finally {
            setWsLoading(false);
        }
    };

    const fetchWorkspaceAnalytics = async (wsId) => {
        try {
            const response = await apiClient.get(`/superadmin/workspaces/${wsId}/analytics`);
            setWorkspaceAnalytics(response.data);
            setActiveTab('analytics');
        } catch (error) {
            console.error('Error fetching analytics:', error);
            notify('Failed to load workspace analytics', 'error');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const updateWorkspaceBranding = async (wsId, updates) => {
        try {
            await apiClient.patch(`/superadmin/workspaces/${wsId}/settings`, updates);
            notify('Branding updated successfully', 'success');

            setWorkspaceAnalytics(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    workspace: {
                        ...prev.workspace,
                        settings: { ...(prev.workspace.settings || {}), ...updates }
                    }
                };
            });
        } catch (err) {
            console.error(err);
            notify('Failed to update branding', 'error');
        }
    };

    const handleAdminSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAdmin) {
                await apiClient.put(`/superadmin/admins/${editingAdmin.id}`, adminForm);
                notify('Administrator updated successfully', 'success');
            } else {
                await apiClient.post('/superadmin/admins', adminForm);
                notify('Administrator created successfully', 'success');
            }
            setIsAdminModalOpen(false);
            setEditingAdmin(null);
            setAdminForm({ username: '', email: '', first_name: '', last_name: '', password: '', workspace_id: '' });
            fetchAll();
        } catch (error) {
            notify(error.response?.data?.error || 'Operation failed', 'error');
        }
    };

    const handleWsSubmit = async (e) => {
        e.preventDefault();
        try {
            let wsId;
            
            // Clean up the data for PostgreSQL type safety (convert empty strings to null)
            const cleanedData = { ...wsForm };
            if (!cleanedData.admin_id || cleanedData.admin_id === '') {
                cleanedData.admin_id = null;
            } else {
                cleanedData.admin_id = parseInt(cleanedData.admin_id);
            }
            
            // Remove the file from JSON payload
            const { logoFile, ...submitData } = cleanedData;

            if (editingWs) {
                // Update workspace details
                await apiClient.put(`/superadmin/workspaces/${editingWs.id}`, submitData);
                wsId = editingWs.id;
                notify('Workspace updated successfully', 'success');
            } else {
                // Create workspace
                const res = await apiClient.post('/superadmin/workspaces', submitData);
                wsId = res.data.workspace.id;
                notify('Workspace created successfully', 'success');
            }

            // Handle Logo Upload if file exists
            if (wsForm.logoFile && wsId) {
                const formData = new FormData();
                formData.append('file', wsForm.logoFile);
                await apiClient.post(`/workspaces/${wsId}/logo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                notify('Logo uploaded successfully', 'success');
            }

            setIsWsModalOpen(false);
            setEditingWs(null);
            setWsForm({ name: '', slug: '', code: '', description: '', admin_id: '', logoFile: null });
            fetchAll();
        } catch (error) {
            console.error(error);
            notify(error.response?.data?.error || 'Operation failed', 'error');
        }
    };

    const handleEditAdmin = (admin) => {
        setEditingAdmin(admin);
        setAdminForm({
            username: admin.username,
            email: admin.email,
            first_name: admin.first_name || '',
            last_name: admin.last_name || '',
            password: '',
            workspace_id: admin.workspace_id || ''
        });
        setIsAdminModalOpen(true);
    };

    const handleEditWs = (ws) => {
        setEditingWs(ws);
        setWsForm({
            name: ws.name,
            slug: ws.slug,
            code: ws.code || '',
            description: ws.description || '',
            admin_id: ws.admin_id || ''
        });
        setIsWsModalOpen(true);
    };

    const deleteAdmin = async (id) => {
        if (await confirm('Are you sure you want to permanently delete this admin?')) {
            try {
                await apiClient.delete(`/superadmin/admins/${id}`);
                notify('Admin deactivated', 'success');
                fetchAll();
            } catch (error) {
                notify('Failed to deactivate admin', 'error');
            }
        }
    };

    const deleteWorkspace = async (id) => {
        if (await confirm('This will permanently delete the workspace. Proceed?')) {
            try {
                await superAdminAPI.deleteWorkspace(id);
                notify('Workspace deleted', 'success');
                fetchAll();
            } catch (error) {
                notify('Failed to delete workspace', 'error');
            }
        }
    };

    const suspendWorkspace = async (id, currentStatus) => {
        const action = currentStatus ? 'suspend' : 'activate';
        if (await confirm(`Are you sure you want to ${action} this workspace?`)) {
            try {
                await superAdminAPI.suspendWorkspace(id, currentStatus);
                notify(`Workspace ${action}d successfully`, 'success');
                fetchAll();
            } catch (error) {
                notify(`Failed to ${action} workspace`, 'error');
            }
        }
    };

    const suspendAdmin = async (id, currentStatus) => {
        const action = currentStatus ? 'suspend' : 'activate';
        confirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Admin`,
            message: `Are you sure you want to ${action} this admin?`,
            onConfirm: async () => {
                try {
                    await superAdminAPI.suspendAdmin(id, !currentStatus);
                    notify(`Admin ${action}d successfully`, 'success');
                    fetchAll();
                } catch (error) {
                    notify(error.response?.data?.error || `Failed to ${action} admin`, 'error');
                }
            }
        });
    };

    // User Assignment Functions
    const fetchUsers = async () => {
        try {
            setUsersLoading(true);
            const params = {
                role: userRole,
                workspace_id: 'null',
                search: userSearch
            };
            const response = await superAdminAPI.getUsers(params);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            notify('Failed to load users', 'error');
        } finally {
            setUsersLoading(false);
        }
    };

    const handleAssignUsers = async () => {
        if (!targetWorkspace || selectedUsers.length === 0) {
            notify('Please select a workspace and at least one user', 'error');
            return;
        }

        try {
            await superAdminAPI.assignUsersToWorkspace(selectedUsers, parseInt(targetWorkspace));
            notify(`${selectedUsers.length} user(s) assigned successfully`, 'success');
            setSelectedUsers([]);
            setTargetWorkspace('');
            fetchUsers();
        } catch (error) {
            notify(error.response?.data?.error || 'Failed to assign users', 'error');
        }
    };

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // selectAllUsers Function
    const selectAllUsers = () => {
        if (selectedUsers.length === users.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(users.map(u => u.id));
        }
    };

    return (
        <>
            <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-500" />
                            <span className="truncate">Control Center</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">Manage institutions, workspaces, and admins</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <div className="px-3 py-1.5 bg-white dark:bg-slate-900/50 rounded-full border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-sm flex-1 sm:flex-none justify-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </header>

                {/* Dashboard Navigation Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'dashboard'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white border-b-2 border-blue-500 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <Monitor className="w-4 h-4" /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('workspaces')}
                        className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'workspaces'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white border-b-2 border-blue-500 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <Briefcase className="w-4 h-4" /> Workspaces
                    </button>
                    <button
                        onClick={() => setActiveTab('admins')}
                        className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'admins'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white border-b-2 border-blue-500 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <Shield className="w-4 h-4" /> Admins
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'users'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white border-b-2 border-blue-500 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <Users className="w-4 h-4" /> Users & Assign
                    </button>
                    <button
                        onClick={() => setActiveTab('features')}
                        className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'features'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white border-b-2 border-blue-500 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <Box className="w-4 h-4" /> Features
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'settings'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white border-b-2 border-blue-500 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <Settings className="w-4 h-4" /> Settings
                    </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    {activeTab === 'dashboard' && (
                        <DashboardHome
                            onNewWorkspace={() => {
                                setEditingWs(null);
                                setWsForm({ name: '', slug: '', code: '', description: '', admin_id: '', logoFile: null });
                                setIsWsModalOpen(true);
                            }}
                            onAddAdmin={() => {
                                setEditingAdmin(null);
                                setAdminForm({ username: '', email: '', first_name: '', last_name: '', password: '', workspace_id: '' });
                                setIsAdminModalOpen(true);
                            }}
                            onGlobalConfig={() => setActiveTab('settings')}
                            onManageFeatures={() => setActiveTab('features')}
                            onRefreshLogs={fetchLogs}
                            logs={logs}
                            logsLoading={logsLoading}
                            stats={stats}
                            workspacesCount={workspaces.length}
                        />
                    )}

                {activeTab === 'admins' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        {/* Existing Admins Tab Content */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Administrators</h2>
                            <button
                                onClick={() => {
                                    setEditingAdmin(null);
                                    setAdminForm({ username: '', email: '', first_name: '', last_name: '', password: '', workspace_id: '' });
                                    setIsAdminModalOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                                <UserPlus className="w-4 h-4" /> Add Admin
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {admins.map(admin => (
                                <div key={admin.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                                            {admin.username[0].toUpperCase()}
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdownId(openDropdownId === `admin-${admin.id}` ? null : `admin-${admin.id}`);
                                                }}
                                                className={`text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded transition-colors ${openDropdownId === `admin-${admin.id}` ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700' : ''}`}
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            <div className={`absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl transition-all z-10 flex flex-col p-1 ${openDropdownId === `admin-${admin.id}` ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 pointer-events-none'}`}>
                                                <button onClick={() => { handleEditAdmin(admin); setOpenDropdownId(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-left">
                                                    <Edit className="w-4 h-4" /> Edit Details
                                                </button>
                                                <button onClick={() => { suspendAdmin(admin.id, admin.is_active); setOpenDropdownId(null); }} className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md w-full text-left ${admin.is_active ? 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-400/10' : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-400/10'}`}>
                                                    <AlertTriangle className="w-4 h-4" /> {admin.is_active ? 'Suspend Access' : 'Activate Access'}
                                                </button>
                                                <button onClick={() => { deleteAdmin(admin.id); setOpenDropdownId(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-md w-full text-left">
                                                    <Trash2 className="w-4 h-4" /> Remove Admin
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{admin.username}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{admin.email}</p>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm py-1 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                                            <span className="text-slate-500 dark:text-slate-500">Role</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-medium capitalize">{admin.workspace_name ? 'Workspace Admin' : 'Super Admin'}</span>
                                        </div>
                                        {admin.workspace_name && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500 dark:text-slate-500">Workspace</span>
                                                <span className="text-slate-700 dark:text-slate-300">{admin.workspace_name}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                            <span className={`w-2 h-2 rounded-full ${admin.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                            <span className={`text-xs font-medium ${admin.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {admin.is_active ? 'Active Account' : 'Suspended'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'workspaces' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Institutions & Workspaces</h2>
                            <button
                                onClick={() => {
                                    setEditingWs(null);
                                    setWsForm({ name: '', slug: '', code: '', description: '', admin_id: '', logoFile: null });
                                    setIsWsModalOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                <Plus className="w-4 h-4" /> New Workspace
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {workspaces.map(ws => (
                                <div key={ws.id} className={`p-6 rounded-xl border transition-all flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm ${ws.is_active
                                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
                                    }`}>
                                    <div className="flex items-center gap-6 flex-1">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 text-slate-400 dark:text-slate-600">
                                            {ws.logo_url ? <img src={getFullImageUrl(ws.logo_url)} alt={ws.name} className="w-full h-full object-cover" /> : <Shield className="w-8 h-8" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{ws.name}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${ws.is_active ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'}`}>
                                                    {ws.is_active ? 'Active' : 'Suspended'}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">{ws.description || 'No description provided'}</p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ws.member_count || 0} Members</span>
                                                <span className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">code: {ws.code}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => enterWorkspace(ws)}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                        >
                                            <LogIn className="w-4 h-4" /> Enter View
                                        </button>
                                        <button
                                            onClick={() => fetchWorkspaceAnalytics(ws.id)}
                                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 rounded-lg text-sm transition-colors border border-indigo-200 dark:border-indigo-500/30"
                                        >
                                            Manage & Analytics
                                        </button>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdownId(openDropdownId === `ws-${ws.id}` ? null : `ws-${ws.id}`);
                                                }}
                                                className={`p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-colors ${openDropdownId === `ws-${ws.id}` ? 'border-indigo-500 ring-2 ring-indigo-500/20' : ''}`}
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            <div className={`absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl transition-all z-10 flex flex-col p-1 ${openDropdownId === `ws-${ws.id}` ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 pointer-events-none'}`}>
                                                <button onClick={(e) => { e.stopPropagation(); handleEditWs(ws); setOpenDropdownId(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md w-full text-left">
                                                    <Edit className="w-4 h-4" /> Edit Info
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); suspendWorkspace(ws.id, ws.is_active); setOpenDropdownId(null); }} className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md w-full text-left ${ws.is_active ? 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-400/10' : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-400/10'}`}>
                                                    {ws.is_active ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                    {ws.is_active ? 'Suspend Workspace' : 'Activate Workspace'}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id); setOpenDropdownId(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-md w-full text-left">
                                                    <Trash2 className="w-4 h-4" /> Delete Permanently
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Other Tabs remain generic for simplicity in this replacement, usually handled by conditional render above */}
                {activeTab === 'features' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <Box className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                Global Feature Flags & Modules
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {flagsLoading ? (
                                    <div className="text-slate-500">Loading features...</div>
                                ) : globalFlags.length === 0 ? (
                                    <div className="text-slate-500">No feature flags defined.</div>
                                ) : (
                                    globalFlags.map(flag => (
                                        <div key={flag.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center group hover:border-indigo-500/50 transition-colors">
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white capitalize">{flag.name.replace(/_/g, ' ')}</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{flag.description || 'No description'}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-mono px-2 py-1 rounded ${flag.is_enabled ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                                                    {flag.is_enabled ? 'ENABLED' : 'DISABLED'}
                                                </span>
                                                <button
                                                    onClick={() => toggleFlag(flag.name, flag.is_enabled)}
                                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${flag.is_enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${flag.is_enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && <SettingsDashboard />}

                {workspaceAnalytics && (
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'analytics' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-medium'}`}
                    >
                        Analytics
                    </button>
                )}

                <div className="overflow-x-auto p-4">
                    {activeTab === 'analytics' && workspaceAnalytics && (
                        <div className="p-6 space-y-8 animate-in slide-in-from-bottom duration-500">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    <Activity className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    <span className="truncate">{workspaceAnalytics.workspace.name} Service</span>
                                </h3>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 flex-1 sm:flex-none">
                                        <button
                                            onClick={() => setAnalyticsTab('overview')}
                                            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${analyticsTab === 'overview' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                        >
                                            Overview
                                        </button>
                                        <button
                                            onClick={() => setAnalyticsTab('branding')}
                                            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${analyticsTab === 'branding' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                        >
                                            Identity
                                        </button>
                                    </div>
                                    <button onClick={() => setWorkspaceAnalytics(null) || setActiveTab('workspaces')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium">Close</button>
                                </div>
                            </div>

                            {analyticsTab === 'overview' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div
                                            className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/30 cursor-pointer hover:border-indigo-500/50 transition-colors group shadow-sm"
                                            onClick={() => openUserList('staff', 'Total Staff')}
                                        >
                                            <p className="text-slate-500 dark:text-slate-400 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Total staff</p>
                                            <h4 className="text-3xl font-bold text-slate-900 dark:text-white">{workspaceAnalytics.stats.staff}</h4>
                                        </div>
                                        <div
                                            className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/30 cursor-pointer hover:border-indigo-500/50 transition-colors group shadow-sm"
                                            onClick={() => openUserList('students', 'Total Students')}
                                        >
                                            <p className="text-slate-500 dark:text-slate-400 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Total Students</p>
                                            <h4 className="text-3xl font-bold text-slate-900 dark:text-white">{workspaceAnalytics.stats.students}</h4>
                                        </div>
                                        <div
                                            className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/30 cursor-pointer hover:border-indigo-500/50 transition-colors group shadow-sm"
                                            onClick={() => openUserList('active', 'Active Users')}
                                        >
                                            <p className="text-slate-500 dark:text-slate-400 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Active Users</p>
                                            <h4 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{workspaceAnalytics.stats.active}</h4>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/30 shadow-sm">
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">Status</p>
                                            <h4 className="text-xl font-bold text-blue-600 dark:text-blue-400">Stable</h4>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/30 shadow-sm">
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-200 mb-4">Recent Activity</h4>
                                        <div className="space-y-3">
                                            {workspaceAnalytics.lists.recent_activity.length === 0 ? (
                                                <p className="text-slate-500 italic">No recent activity logs found</p>
                                            ) : (
                                                workspaceAnalytics.lists.recent_activity.map(log => (
                                                    <div key={log.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400">LOG</div>
                                                            <div>
                                                                <p className="text-sm text-slate-700 dark:text-slate-200">{log.action}</p>
                                                                <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-mono text-slate-500 dark:text-slate-600">{log.ip_address}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-700/30 shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Institution Logo</h4>
                                                <div className="bg-slate-50 dark:bg-white rounded-xl p-6 border border-slate-200 dark:border-transparent">
                                                    <LogoUpload
                                                        label="Upload Workspace Logo"
                                                        initialLogo={workspaceAnalytics.workspace.logo_url}
                                                        uploadUrl={`/superadmin/workspaces/${workspaceAnalytics.workspace.id}/logo`}
                                                        onUploadSuccess={(url) => {
                                                            notify('Logo updated', 'success');
                                                            fetchWorkspaceAnalytics(workspaceAnalytics.workspace.id);
                                                        }}
                                                    />
                                                </div>
                                                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                                                    This logo will be displayed on the sidebar and login screens for all users in this workspace.
                                                </p>
                                            </div>

                                            <div className="space-y-6">
                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Visual Identity</h4>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 block mb-2">Primary Brand Color</label>
                                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                                            <div className="relative w-12 h-12 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                                                                <input
                                                                    type="color"
                                                                    className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer"
                                                                    defaultValue={workspaceAnalytics.workspace.settings?.primary_color || '#3b82f6'}
                                                                    onBlur={(e) => updateWorkspaceBranding(workspaceAnalytics.workspace.id, { primary_color: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                                                                {workspaceAnalytics.workspace.settings?.primary_color || '#3b82f6'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 block mb-2">Secondary / Text Color</label>
                                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                                            <div className="relative w-12 h-12 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                                                                <input
                                                                    type="color"
                                                                    className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer"
                                                                    defaultValue={workspaceAnalytics.workspace.settings?.secondary_color || '#6366f1'}
                                                                    onBlur={(e) => updateWorkspaceBranding(workspaceAnalytics.workspace.id, { secondary_color: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                                                                {workspaceAnalytics.workspace.settings?.secondary_color || '#6366f1'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4">
                                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl">
                                                            <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                                                <strong className="block mb-1">Tip:</strong>
                                                                Changes auto-save when you click outside the color picker.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Users Assignment Tab */}
                    {activeTab === 'users' && (
                        <div className="p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Assign Users to Workspaces</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">Bulk assign lecturers and students to institutions</p>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-2">User Role</label>
                                    <select
                                        value={userRole}
                                        onChange={(e) => { setUserRole(e.target.value); setSelectedUsers([]); }}
                                        className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    >
                                        <option value="teacher">Lecturers/Staff</option>
                                        <option value="student">Students</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-2">Search Users</label>
                                    <input
                                        type="text"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                                        placeholder="Search by name or email..."
                                        className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={fetchUsers}
                                        disabled={usersLoading}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center shadow-lg shadow-indigo-900/20"
                                    >
                                        {usersLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                        ) : (
                                            <Search className="w-4 h-4 inline mr-2" />
                                        )}
                                        {usersLoading ? 'Searching...' : 'Load Users'}
                                    </button>
                                </div>
                            </div>

                            {/* Assignment Section */}
                            {users.length > 0 && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Users List */}
                                    <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                                        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                                            <h4 className="font-bold text-slate-900 dark:text-white">Unassigned {userRole === 'teacher' ? 'Lecturers' : 'Students'} ({users.length})</h4>
                                            <button
                                                onClick={selectAllUsers}
                                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                                            >
                                                {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                                            </button>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {usersLoading ? (
                                                <div className="p-12 text-center text-slate-500">Loading...</div>
                                            ) : (
                                                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {users.map(user => (
                                                        <div
                                                            key={user.id}
                                                            onClick={() => toggleUserSelection(user.id)}
                                                            className={`p-4 cursor-pointer transition-colors ${selectedUsers.includes(user.id) ? 'bg-indigo-50 dark:bg-indigo-500/10 border-l-4 border-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedUsers.includes(user.id)}
                                                                    onChange={() => { }}
                                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                                                    {user.username[0].toUpperCase()}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-slate-900 dark:text-slate-100 font-medium">{user.full_name}</p>
                                                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{user.email}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Assignment Panel */}
                                    <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-6 h-fit shadow-sm">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-4">Assign To Workspace</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-2">
                                                    Selected Users
                                                </label>
                                                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-center border border-slate-200 dark:border-transparent">
                                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{selectedUsers.length}</span>
                                                    <p className="text-xs text-slate-500 mt-1">user(s) selected</p>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-2">
                                                    Target Workspace
                                                </label>
                                                <select
                                                    value={targetWorkspace}
                                                    onChange={(e) => setTargetWorkspace(e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                >
                                                    <option value="">Select Workspace...</option>
                                                    {workspaces.filter(ws => ws.is_active).map(ws => (
                                                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                onClick={handleAssignUsers}
                                                disabled={!targetWorkspace || selectedUsers.length === 0}
                                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-500 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center shadow-lg shadow-green-900/20 disabled:shadow-none"
                                            >
                                                <UserPlus className="w-4 h-4 inline mr-2" />
                                                Assign Users
                                            </button>

                                            {selectedUsers.length > 0 && targetWorkspace && (
                                                <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg p-3">
                                                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                                        <strong>Action:</strong> Assign {selectedUsers.length} {userRole === 'teacher' ? 'lecturer(s)' : 'student(s)'} to {workspaces.find(w => w.id === parseInt(targetWorkspace))?.name}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!usersLoading && users.length === 0 && (
                                <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-12 text-center shadow-sm">
                                    <Users className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400">No unassigned {userRole === 'teacher' ? 'lecturers' : 'students'} found</p>
                                    <p className="text-slate-500 text-sm mt-2">Click "Load Users" to search for unassigned users</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && <SettingsDashboard />}

                    {activeTab === 'admins' && (
                        <div className="mt-8 px-4 sm:px-6 pb-8">
                            <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                                {loading ? <div className="p-12 text-center text-slate-500">Loading...</div> : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                                <th className="px-6 py-4 font-medium">Head of Institution</th>
                                                <th className="px-6 py-4 font-medium">Status</th>
                                                <th className="px-6 py-4 font-medium">Workspace</th>
                                                <th className="px-6 py-4 font-medium">Staff</th>
                                                <th className="px-6 py-4 font-medium">Students</th>
                                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                            {admins.map((admin) => (
                                                <tr key={admin.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors ${!admin.is_active ? 'opacity-60' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                                                {admin.username[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-900 dark:text-slate-100 font-medium">{admin.username}</p>
                                                                <p className="text-slate-500 dark:text-slate-400 text-xs">{admin.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${admin.is_active ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20' : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                                                            {admin.is_active ? 'Active' : 'Suspended'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {admin.workspace_name ? (
                                                            <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-500/20">
                                                                {admin.workspace_name}
                                                            </span>
                                                        ) : <span className="text-slate-500 dark:text-slate-600 text-xs">Unassigned</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{admin.staff_count || 0}</td>
                                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{admin.student_count || 0}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {admin.workspace_id && (
                                                                <button
                                                                    onClick={() => fetchWorkspaceAnalytics(admin.workspace_id)}
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                                    title="View Analytics"
                                                                >
                                                                    <Activity className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => suspendAdmin(admin.id, admin.is_active)}
                                                                className={`p-2 ${admin.is_active ? 'text-slate-400 hover:text-orange-500 dark:hover:text-orange-400' : 'text-slate-400 hover:text-green-500 dark:hover:text-green-400'}`}
                                                                title={admin.is_active ? 'Suspend Admin' : 'Activate Admin'}
                                                            >
                                                                {admin.is_active ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                                            </button>
                                                            <button onClick={() => handleEditAdmin(admin)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" title="Edit Admin Details"><Edit className="w-5 h-5" /></button>
                                                            <button onClick={() => deleteAdmin(admin.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400" title="Delete Admin"><Trash2 className="w-5 h-5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'workspaces' && (
                        <div className="mt-8 px-4 sm:px-6 pb-8">
                            <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                                {wsLoading ? <div className="p-12 text-center text-slate-500">Loading...</div> : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[900px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                                <th className="px-6 py-4 font-medium">Workspace Name</th>
                                                <th className="px-6 py-4 font-medium">Status</th>
                                                <th className="px-6 py-4 font-medium">Code / Slug</th>
                                                <th className="px-6 py-4 font-medium">Presiding Admin</th>
                                                <th className="px-6 py-4 font-medium">Community Breakdown</th>
                                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                            {workspaces.map((ws) => (
                                                <tr key={ws.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors ${!ws.is_active ? 'opacity-60' : ''}`}>
                                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{ws.name}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ws.is_active ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20' : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                                                            {ws.is_active ? 'Active' : 'Suspended'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm font-mono">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{ws.code}</span>
                                                            <span className="text-xs text-slate-400">{ws.slug}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                        {ws.admin_name ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-700 dark:text-slate-300">
                                                                    {ws.admin_name[0].toUpperCase()}
                                                                </div>
                                                                {ws.admin_name}
                                                            </div>
                                                        ) : <span className="text-slate-500 dark:text-slate-600 italic">No Head Assigned</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                        <div className="flex flex-col text-xs text-slate-500 dark:text-slate-400">
                                                            <span className="text-slate-700 dark:text-slate-200">Staff: {ws.staff_count || 0}</span>
                                                            <span>Students: {ws.student_count || 0}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => fetchWorkspaceAnalytics(ws.id)}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                                title="Workspace Analytics"
                                                            >
                                                                <Activity className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => suspendWorkspace(ws.id, ws.is_active)}
                                                                className={`p-2 ${ws.is_active ? 'text-slate-400 hover:text-orange-500 dark:hover:text-orange-400' : 'text-slate-400 hover:text-green-500 dark:hover:text-green-400'}`}
                                                                title={ws.is_active ? 'Suspend Workspace' : 'Activate Workspace'}
                                                            >
                                                                {ws.is_active ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                                            </button>
                                                            <button
                                                                onClick={() => enterWorkspace(ws)}
                                                                className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400"
                                                                title="Enter Workspace"
                                                            >
                                                                <LogIn className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={() => handleEditWs(ws)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"><Edit className="w-5 h-5" /></button>
                                                            <button onClick={() => deleteWorkspace(ws.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Activity Logs</h2>
                                <button onClick={fetchLogs} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">Refresh Logs</button>
                            </div>
                            <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                                {logsLoading ? <div className="p-12 text-center text-slate-500">Loading activity...</div> : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[1000px]">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                                    <th className="px-6 py-4 font-medium">User</th>
                                                    <th className="px-6 py-4 font-medium">Action</th>
                                                    <th className="px-6 py-4 font-medium">Resource</th>
                                                    <th className="px-6 py-4 font-medium">IP Address</th>
                                                    <th className="px-6 py-4 font-medium">Details</th>
                                                    <th className="px-6 py-4 font-medium text-right">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                                {logs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-slate-900 dark:text-slate-100">{log.username || 'System'}</div>
                                                            <div className="text-xs text-slate-500">{log.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${log.log_type === 'security' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                                                                log.log_type === 'error' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                                                                    'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                                                }`}>
                                                                {log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{log.resource_type || '-'}</td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm font-mono">{log.ip_address || '-'}</td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm max-w-xs truncate" title={log.details_str || log.details}>
                                                            {log.details_str || log.details || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Global Feature Flags</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage system-wide feature availability</p>
                                </div>
                                <button onClick={fetchFlags} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">Refresh Flags</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {flagsLoading ? <div className="col-span-full py-12 text-center text-slate-500">Loading features...</div> :
                                    globalFlags.map((flag) => (
                                        <div key={flag.name} className={`relative p-6 rounded-xl border transition-all ${flag.is_enabled
                                            ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30'
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                                            }`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${flag.is_enabled
                                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                                    }`}>
                                                    <Box className="w-5 h-5" />
                                                </div>
                                                <div onClick={() => toggleFlag(flag.name, flag.is_enabled)}
                                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${flag.is_enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                                                        }`}>
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${flag.is_enabled ? 'translate-x-6' : 'translate-x-0'
                                                        }`} />
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-white mb-1">{flag.name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10 overflow-hidden">{flag.description || 'No description available'}</p>

                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={`px-2 py-0.5 rounded border ${flag.is_enabled
                                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                    }`}>
                                                    {flag.is_enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                                <span className="text-slate-400">
                                                    Default: {flag.default_value ? 'On' : 'Off'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Modal */}
            {
                isAdminModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 shadow-2xl">
                            <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingAdmin ? 'Edit Admin' : 'New Admin'}</h2>
                                <button onClick={() => setIsAdminModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><XCircle /></button>
                            </header>
                            <form onSubmit={handleAdminSubmit} className="p-6 space-y-4 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">First Name</label>
                                        <input placeholder="First Name" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={adminForm.first_name} onChange={e => setAdminForm({ ...adminForm, first_name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Last Name</label>
                                        <input placeholder="Last Name" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={adminForm.last_name} onChange={e => setAdminForm({ ...adminForm, last_name: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Username</label>
                                    <input required placeholder="Username" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={adminForm.username} onChange={e => setAdminForm({ ...adminForm, username: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Email Address</label>
                                    <input required type="email" placeholder="Email" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} />
                                </div>
                                {!editingAdmin && (
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Temporary Password</label>
                                        <input required type="password" placeholder="Temporary Password" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Assign Workspace</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={adminForm.workspace_id}
                                        onChange={e => setAdminForm({ ...adminForm, workspace_id: e.target.value })}
                                    >
                                        <option value="">No Workspace (Global Admin)</option>
                                        {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                                    </select>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 py-3 rounded-lg font-bold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                                    {editingAdmin ? 'Update Administrator' : 'Create Administrator'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Workspace Modal */}
            {
                isWsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 shadow-2xl">
                            <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingWs ? 'Edit Workspace' : 'Build Workspace'}</h2>
                                <button onClick={() => setIsWsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><XCircle /></button>
                            </header>
                            <form onSubmit={handleWsSubmit} className="p-6 space-y-4 overflow-y-auto">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Institution Name</label>
                                    <input required placeholder="Institution Name (e.g. Harvard University)" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={wsForm.name} onChange={e => setWsForm({ ...wsForm, name: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">URL Slug</label>
                                    <input required placeholder="Unique Slug (e.g. harvard-edu)" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg font-mono border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={wsForm.slug} onChange={e => setWsForm({ ...wsForm, slug: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Workspace Code</label>
                                    <input placeholder="Workspace Code (Optional - Auto-generated if blank)" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg font-mono border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={wsForm.code} onChange={e => setWsForm({ ...wsForm, code: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Description</label>
                                    <textarea placeholder="Description / Mission Statement" className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 placeholder:text-slate-400 resize-none" value={wsForm.description} onChange={e => setWsForm({ ...wsForm, description: e.target.value })} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Workspace Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden text-slate-400">
                                            {wsForm.logoFile ? (
                                                <img src={URL.createObjectURL(wsForm.logoFile)} alt="Preview" className="w-full h-full object-cover" />
                                            ) : editingWs?.logo_url ? (
                                                <img src={editingWs.logo_url} alt="Current" className="w-full h-full object-cover" />
                                            ) : (
                                                <Shield className="w-8 h-8" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => {
                                                    if (e.target.files?.[0]) {
                                                        setWsForm({ ...wsForm, logoFile: e.target.files[0] });
                                                    }
                                                }}
                                                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400 transition-all cursor-pointer"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">Accepts PNG, JPG, GIF up to 2MB</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Assign Head Admin</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={wsForm.admin_id}
                                        onChange={e => setWsForm({ ...wsForm, admin_id: e.target.value })}
                                    >
                                        <option value="">None</option>
                                        {admins.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
                                    </select>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 py-3 rounded-lg font-bold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                                    {editingWs ? 'Update Workspace' : 'Launch Workspace'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            <UserListModal
                isOpen={userModalOpen}
                onClose={() => setUserModalOpen(false)}
                title={userModalTitle}
                type={userModalType}
                workspaceId={workspaceAnalytics?.workspace?.id}
            />
        </div>
        </>
    );
};

// --- Sub-components (Moved outside main to stabilize hooks) ---

const DashboardHome = ({
    onNewWorkspace,
    onAddAdmin,
    onGlobalConfig,
    onManageFeatures,
    onRefreshLogs,
    logs,
    logsLoading,
    stats,
    workspacesCount
}) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <SuperAdminStats stats={stats} workspacesCount={workspacesCount} />
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
                onClick={onNewWorkspace}
                className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-left hover:scale-[1.02] transition-all duration-300 shadow-xl shadow-indigo-900/20"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Monitor className="w-24 h-24 transform rotate-12" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 text-white">
                        <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">New Workspace</h3>
                    <p className="text-indigo-100 text-sm">Deploy a new institutional environment</p>
                </div>
            </button>

            <button
                onClick={onAddAdmin}
                className="group relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Shield className="w-24 h-24 transform -rotate-12 text-slate-900 dark:text-white" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Add Admin</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Grant system access</p>
                </div>
            </button>

            <button
                onClick={onGlobalConfig}
                className="group relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:border-purple-500/50 hover:shadow-lg transition-all duration-300"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Settings className="w-24 h-24 transform rotate-45 text-slate-900 dark:text-white" />
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                        <Settings className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Global Config</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">System-wide settings</p>
                </div>
            </button>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">System Status</h3>
                        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Operational</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">API Latency</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">24ms</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[95%]"></div>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Database</span>
                            <span className="text-blue-600 dark:text-blue-400 font-mono">Connected</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity Feed */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        Live Activity Feed
                    </h3>
                    <button onClick={onRefreshLogs} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Refresh
                    </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {logsLoading ? (
                        <div className="text-center py-12 text-slate-500">Loading activity...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 italic">No recent activity</div>
                    ) : (
                        logs.slice(0, 10).map((log, idx) => (
                            <div key={log.id || idx} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/30 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${log.log_type === 'security' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    }`}>
                                    {log.log_type === 'security' ? <Shield className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                            {log.username || 'System User'} <span className="text-slate-500 font-normal">performed</span> {log.action.replace(/_/g, ' ')}
                                        </p>
                                        <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 truncate">
                                        {log.details_str || log.details || 'No details provided'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* System Stats Vertical */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Box className="w-32 h-32 transform rotate-12 text-slate-900 dark:text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 relative z-10">Feature Lab</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 relative z-10">
                        Configure global feature flags and experiential modules.
                    </p>
                    <button
                        onClick={onManageFeatures}
                        className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors relative z-10"
                    >
                        Manage Features
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default SuperAdminDashboard;
