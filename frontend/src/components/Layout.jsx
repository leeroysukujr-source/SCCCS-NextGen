import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getFullImageUrl, getApiBaseUrl } from '../utils/api';
import { useFeatureStore } from '../store/featureStore';
import { useSettingsStore } from '../store/settingsStore';
import ThemeToggle from './ThemeToggle';
import PresenceManager from './PresenceManager';
import { 
    FiHardDrive, FiMonitor, FiUsers, FiClock, FiTrash2, FiStar, FiDatabase,
    FiMenu, FiSearch, FiBell, FiHelpCircle, FiSettings, FiPlus
} from 'react-icons/fi';
import './Layout.css';

export default function Layout() {
    const { user, logout } = useAuthStore();
    const { fetchFeatures } = useFeatureStore();
    const { getSettingValue } = useSettingsStore();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        fetchFeatures(user?.workspace_id);
    }, [user?.workspace_id, fetchFeatures]);

    // Mimic the left sidebar links exactly as shown in the Drive-clone image
    const navLinks = [
        { path: '/dashboard', icon: <FiHardDrive />, text: 'My Drive' },
        { path: '/classes', icon: <FiMonitor />, text: 'Computers' },
        { path: '/chat', icon: <FiUsers />, text: 'Shared With Me' },
        { path: '/notifications', icon: <FiClock />, text: 'Recents' },
        { path: '/trash', icon: <FiTrash2 />, text: 'Trash' },
        { path: '/starred', icon: <FiStar />, text: 'Starred' },
        { path: '/backups', icon: <FiDatabase />, text: 'Backups' }
    ];

    const appName = getSettingValue('APP_NAME', 'Goodle Drive').replace(/^['"]|['"]$/g, '');

    return (
        <div className="app-container">
            <PresenceManager />
            {/* Top White Header */}
            <header className="top-header">
                <div className="brand-logo-area">
                    <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                        <FiMenu />
                    </button>
                    <div className="brand-icon">
                        <FiHardDrive size={18} />
                    </div>
                    <span className="brand-title">{appName}</span>
                </div>

                <div className="header-search-bar">
                    <div className="search-input-wrapper">
                        <FiSearch className="search-icon" />
                        <input type="text" placeholder="Search Drive..." />
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn-icon"><FiBell /></button>
                    <button className="btn-icon"><FiHelpCircle /></button>
                    <button className="btn-icon"><FiSettings /></button>
                    <ThemeToggle />
                    <div className="profile-chip" onClick={() => navigate('/profile')}>
                        <span className="profile-chip-text hidden sm:block">
                            {user?.first_name || user?.username || 'User'}
                        </span>
                        {user?.avatar_url ? (
                            <img src={getFullImageUrl(user.avatar_url)} alt="Profile" className="profile-avatar object-cover" />
                        ) : (
                            <div className="profile-avatar">
                                {user?.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Layout Body */}
            <div className="body-layout">
                {/* Vibrant Blue Sidebar */}
                <aside className={`vibrant-sidebar ${mobileOpen ? 'open' : ''}`}>
                    {/* The prominent "Upload" button from the image */}
                    <button className="upload-btn" onClick={() => navigate('/creation-hub')}>
                       <FiPlus /> Upload New Files
                    </button>

                    <nav className="sidebar-nav">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <span className="nav-link-icon">{link.icon}</span>
                                {link.text}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="sidebar-footer">
                        <h4 className="storage-title">Storage Details</h4>
                        
                        <div className="storage-item">
                            <div className="storage-item-header">
                                <FiDatabase /> Storage
                            </div>
                            <div className="storage-bar-bg">
                                <div className="storage-bar-fill" style={{ width: '60%' }}></div>
                            </div>
                            <div className="storage-text">60.70 GB of 1 TB used</div>
                        </div>

                        <div className="storage-item">
                            <div className="storage-item-header">
                                <FiStar /> Photos
                            </div>
                            <div className="storage-bar-bg">
                                <div className="storage-bar-fill" style={{ width: '10%' }}></div>
                            </div>
                            <div className="storage-text">10.70 GB of 1 TB used</div>
                        </div>
                        
                        <button onClick={logout} className="mt-4 text-xs font-bold uppercase tracking-wide opacity-80 hover:opacity-100 transition-opacity text-left bg-transparent border-none text-white cursor-pointer w-full">
                            Sign Out ↗
                        </button>
                    </div>
                </aside>

                {/* Main Dashboard Content */}
                <main className="main-area">
                    <Suspense fallback={<div className="flex items-center justify-center h-full animate-pulse text-[var(--text-tertiary)]">Booting up...</div>}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
            
            {/* Mobile overlay */}
            {mobileOpen && <div className="fixed inset-0 bg-black/20 z-80 lg:hidden" onClick={() => setMobileOpen(false)}></div>}
        </div>
    );
}
