import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from '../api/client';
import { 
  FiPlus, FiArrowRight, FiBriefcase, FiUser, 
  FiHash, FiShield, FiVideo, FiMessageCircle, 
  FiLayers, FiLogOut, FiSearch, FiChevronLeft,
  FiCheckCircle, FiLoader, FiInfo
} from 'react-icons/fi';
import { useNotify } from '../components/NotificationProvider';
import { getFullImageUrl } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import './WorkspaceEntry.css';

const WorkspaceEntry = () => {
    const { user, token, refreshUser, logout } = useAuthStore();
    const { getSettingValue } = useSettingsStore();
    const navigate = useNavigate();
    const notify = useNotify();

    // Wizard States: 'search' | 'verify'
    const [step, setStep] = useState('search');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWorkspace, setSelectedWorkspace] = useState(null);
    
    // Form States
    const [joinCode, setJoinCode] = useState('');
    const [role, setRole] = useState('student');
    const [regNo, setRegNo] = useState('');

    const logoUrl = getSettingValue('SYSTEM_LOGO_URL') || getSettingValue('INSTITUTION_LOGO');
    const appName = getSettingValue('APP_NAME') || 'SCCCS';

    // 1. Search Workspaces
    const { data: searchResults, isFetching: isSearching } = useQuery({
        queryKey: ['workspace-search', searchTerm],
        queryFn: async () => {
            const { data } = await axios.get(`/workspace/search?q=${searchTerm}`);
            return data;
        },
        enabled: step === 'search',
        staleTime: 30000
    });

    // 2. Fetch My Workspaces
    const { data: myWorkspaces, isLoading: loadingMy } = useQuery({
        queryKey: ['my-workspaces'],
        queryFn: async () => {
            const { data } = await axios.get('/workspace/my');
            return data;
        },
        enabled: !!token
    });

    // 3. Join Mutation
    const joinMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axios.post('/workspace/join', data);
            return res.data;
        },
        onSuccess: async (data) => {
            notify('success', data.message || 'Entered workspace successfully');
            await refreshUser();
            navigate('/dashboard');
        },
        onError: (err) => {
            notify('error', err.response?.data?.error || 'Failed to join workspace');
        }
    });

    const handleJoin = (e) => {
        if (e) e.preventDefault();
        joinMutation.mutate({
            code: joinCode,
            role: role,
            reg_no: role === 'student' ? regNo : undefined
        });
    };

    const handleSelectWorkspace = (ws) => {
        setSelectedWorkspace(ws);
        setStep('verify');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Animation Variants
    const pageVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <div className="workspace-entry-page">
            <div className="logout-anchor">
                <button onClick={handleLogout} className="logout-btn">
                    <FiLogOut /> Sign Out
                </button>
            </div>

            <div className="cosmos-background">
                <div className="cosmos-orb orb-1"></div>
                <div className="cosmos-orb orb-2"></div>
                <div className="cosmos-orb orb-3"></div>
                <div className="grid-overlay"></div>
            </div>

            <div className="split-layout">
                {/* Left Branding */}
                <div className="left-branding">
                    <div className="logo-stack">
                        {logoUrl ? (
                            <img src={getFullImageUrl(logoUrl)} alt="App Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <FiLayers size={40} />
                        )}
                    </div>
                    <h1 className="hero-title typing-wrapper">
                        <span className="typing-text">
                            {appName} <span className="highlight">NextGen</span>
                        </span>
                    </h1>
                    <p className="hero-subtitle">Experience the future of collaborative learning</p>

                    <div className="feature-grid">
                        {[
                            { icon: <FiVideo />, title: "HD Conferencing", sub: "Crystal clear video meetings" },
                            { icon: <FiMessageCircle />, title: "Collaboration", sub: "Real-time chat & groups" },
                            { icon: <FiLayers />, title: "Course Hub", sub: "Organized learning space" }
                        ].map((f, i) => (
                            <div key={i} className="feature-item">
                                <div className="feature-icon">{f.icon}</div>
                                <div className="feature-text"><h3>{f.title}</h3><p>{f.sub}</p></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Interactive Wizard */}
                <div className="right-form">
                    <div className="glass-form-card">
                        <AnimatePresence mode="wait">
                            {step === 'search' ? (
                                <motion.div key="search" {...pageVariants} className="wizard-step">
                                    <div className="form-header">
                                        <h2 className="text-2xl font-bold mb-1">Find Your Workspace</h2>
                                        <p className="text-gray-400 text-sm">Search for your institution or team</p>
                                    </div>

                                    <div className="modern-input-group mb-6">
                                        <FiSearch className="search-icon" />
                                        <input 
                                            className="modern-input" 
                                            placeholder="Search by name (e.g. Unilak)"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        {isSearching && <FiLoader className="loader-icon animate-spin" />}
                                    </div>

                                    <div className="search-results custom-scrollbar">
                                        {searchResults?.map(ws => (
                                            <button 
                                                key={ws.id} 
                                                className="result-item"
                                                onClick={() => handleSelectWorkspace(ws)}
                                            >
                                                <div className="result-logo">
                                                    {ws.logo_url ? <img src={getFullImageUrl(ws.logo_url)} alt="Logo" /> : <span>{ws.name[0]}</span>}
                                                </div>
                                                <div className="result-info">
                                                    <div className="font-bold">{ws.name}</div>
                                                    <div className="text-xs text-indigo-300">@{ws.slug}</div>
                                                </div>
                                                <FiArrowRight className="arrow" />
                                            </button>
                                        ))}
                                        {searchTerm && searchResults?.length === 0 && !isSearching && (
                                            <div className="empty-search">
                                                <FiInfo /> No workspace found. Try a different name?
                                            </div>
                                        )}
                                    </div>

                                    {myWorkspaces?.length > 0 && (
                                        <div className="previous-workspaces mt-8">
                                            <p className="section-label">Your Workspaces</p>
                                            <div className="space-y-2">
                                                {myWorkspaces.map(ws => (
                                                    <button key={ws.id} className="ws-item" onClick={() => navigate('/dashboard')}>
                                                        <div className="ws-logo-mini">
                                                            {ws.logo_url ? <img src={getFullImageUrl(ws.logo_url)} alt="Logo" /> : ws.name[0]}
                                                        </div>
                                                        <div className="flex-1 text-sm font-medium">{ws.name}</div>
                                                        <FiArrowRight className="text-white/30" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div key="verify" {...pageVariants} className="wizard-step">
                                    <button className="back-btn mb-4" onClick={() => setStep('search')}>
                                        <FiChevronLeft /> Use a different workspace
                                    </button>

                                    <div className="selected-ws-header">
                                        <div className="ws-large-logo">
                                            {selectedWorkspace.logo_url ? <img src={getFullImageUrl(selectedWorkspace.logo_url)} alt="Logo" /> : selectedWorkspace.name[0]}
                                        </div>
                                        <h2 className="text-xl font-bold">{selectedWorkspace.name}</h2>
                                        <p className="text-xs text-indigo-400">Join Verification</p>
                                    </div>

                                    <div className="role-buttons mb-6">
                                        <button className={`role-btn ${role === 'student' ? 'active' : ''}`} onClick={() => setRole('student')}>
                                            <span>🎓</span> Student
                                        </button>
                                        <button className={`role-btn ${role === 'teacher' ? 'active' : ''}`} onClick={() => setRole('teacher')}>
                                            <span>👨‍🏫</span> Staff
                                        </button>
                                    </div>

                                    <div className="form-inputs">
                                        <div className="modern-input-group">
                                            <FiHash />
                                            <input 
                                                className="modern-input" 
                                                placeholder="Verification Code"
                                                value={joinCode}
                                                onChange={(e) => setJoinCode(e.target.value)}
                                            />
                                            <div className="field-hint">Ask your admin for the workspace code</div>
                                        </div>

                                        {role === 'student' && (
                                            <div className="modern-input-group mt-4">
                                                <FiBriefcase />
                                                <input 
                                                    className="modern-input" 
                                                    placeholder="Registration Number"
                                                    value={regNo}
                                                    onChange={(e) => setRegNo(e.target.value)}
                                                />
                                            </div>
                                        )}

                                        <button 
                                            className="action-btn mt-6" 
                                            onClick={handleJoin}
                                            disabled={joinMutation.isPending || !joinCode}
                                        >
                                            {joinMutation.isPending ? 'Verifying...' : 'Link & Enter'}
                                            {!joinMutation.isPending && <FiCheckCircle />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceEntry;
