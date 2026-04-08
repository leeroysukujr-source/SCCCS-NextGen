import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getSettingValue } from '../store/settingsStore';
import { initializeTheme } from '../store/themeStore';
import ThemeToggle from './ThemeToggle';
import {
    FiShield, FiBox, FiUsers, FiBarChart2, FiSettings,
    FiActivity, FiLock, FiMenu, FiSearch, FiBell, FiHardDrive
} from 'react-icons/fi';
import './Layout.css'; // Inheriting exactly the same aesthetic framework!

export default function SuperAdminLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        initializeTheme();
    }, []);

    const adminLinks = [
        { path: '/superadmin/control-center', icon: <FiShield />, text: 'Control Center' },
        { path: '/superadmin/workspaces', icon: <FiBox />, text: 'Workspaces' },
        { path: '/superadmin/system-admins', icon: <FiUsers />, text: 'System Admins' },
        { path: '/superadmin/global-users', icon: <FiUsers />, text: 'Global Users' },
        { path: '/superadmin/reports', icon: <FiBarChart2 />, text: 'Reports' },
        { path: '/superadmin/settings', icon: <FiSettings />, text: 'Institutional Settings' },
        { path: '/superadmin/platform-settings', icon: <FiSettings />, text: 'Platform Master' },
        { path: '/superadmin/security', icon: <FiLock />, text: 'Security Audit' }
    ];

    const appName = "SCCCS Control";

    return (
        <div className="app-container">
            {/* Top White Header - Matches Drive Style Perfectly! */}
            <header className="top-header">
                <div className="brand-logo-area">
                    <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                        <FiMenu />
                    </button>
                    <div className="brand-icon">
                        <FiShield size={18} />
                    </div>
                    <span className="brand-title">{appName}</span>
                </div>

                <div className="header-search-bar">
                    <div className="search-input-wrapper">
                        <FiSearch className="search-icon" />
                        <input type="text" placeholder="Search Registry..." />
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn-icon"><FiBell /></button>
                    <ThemeToggle />
                    <div className="profile-chip" onClick={() => navigate('/profile')}>
                        <span className="profile-chip-text hidden sm:block">
                            Super Admin
                        </span>
                        <div className="profile-avatar bg-red-500">
                            SA
                        </div>
                    </div>
                </div>
            </header>

            {/* Layout Body */}
            <div className="body-layout">
                {/* Vibrant Blue Sidebar */}
                <aside className={`vibrant-sidebar ${mobileOpen ? 'open' : ''}`}>
                    <button className="upload-btn" onClick={() => navigate('/superadmin/workspaces')}>
                       <FiBox /> Provision Workspace
                    </button>

                    <nav className="sidebar-nav">
                        {adminLinks.map((link) => (
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
                        <h4 className="storage-title">Platform Resources</h4>
                        
                        <div className="storage-item">
                            <div className="storage-item-header">
                                <FiHardDrive /> Infrastructure Load
                            </div>
                            <div className="storage-bar-bg">
                                <div className="storage-bar-fill" style={{ width: '45%' }}></div>
                            </div>
                            <div className="storage-text">System Stable • 45% Capacity</div>
                        </div>
                        
                        <button onClick={logout} className="mt-4 text-xs font-bold uppercase tracking-wide opacity-80 hover:opacity-100 transition-opacity text-left bg-transparent border-none text-white cursor-pointer w-full">
                            Force Log Out ↗
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
