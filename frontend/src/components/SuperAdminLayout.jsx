import React, { useEffect, useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import SuperAdminSidebar from './SuperAdminSidebar';
import { initializeTheme } from '../store/themeStore';
import ThemeToggle from './ThemeToggle';
import UserProfileDropdown from './UserProfileDropdown';
import { FiMenu, FiGrid, FiArrowRight, FiChevronLeft } from 'react-icons/fi';
import './SuperAdminLayout.css';

const SuperAdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        initializeTheme();
    }, []);

    return (
        <div className="sa-layout bg-slate-50 dark:bg-slate-900 transition-colors duration-300 min-h-screen">
            <SuperAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 text-slate-600 dark:text-slate-400 lg:hidden"
                        >
                            <FiMenu size={24} />
                        </button>
                        <div className="font-bold text-slate-800 dark:text-indigo-400 hidden sm:block">Control Plane</div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:block">
                            <ThemeToggle />
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden lg:block"></div>
                        <UserProfileDropdown />
                    </div>
                </header>

                <main className="sa-main flex-1 relative">
                    <button 
                        onClick={() => window.history.back()}
                        className="fixed top-4 left-4 lg:left-8 z-[100] w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xl hover:scale-110 active:scale-95 transition-all group"
                        title="Go Back"
                    >
                        <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="sa-content p-4 md:p-6 lg:p-8 pt-4 text-slate-800 dark:text-slate-200">
                        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] text-slate-500 animate-pulse">Initializing Interface...</div>}>
                            <Outlet />
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SuperAdminLayout;
