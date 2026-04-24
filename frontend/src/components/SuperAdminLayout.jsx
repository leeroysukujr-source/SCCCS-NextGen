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
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => window.history.length > 2 ? window.history.back() : window.location.href = '/dashboard'}
                            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
                            title="Go Back"
                        >
                            <FiChevronLeft size={24} />
                        </button>
                        <button 
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 text-slate-600 dark:text-slate-400 lg:hidden"
                        >
                            <FiMenu size={24} />
                        </button>
                        <div className="font-bold text-slate-800 dark:text-indigo-400 hidden sm:block ml-2">Control Plane</div>
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
