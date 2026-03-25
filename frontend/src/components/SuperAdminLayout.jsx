import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SuperAdminSidebar from './SuperAdminSidebar';
import { initializeTheme } from '../store/themeStore';
import ThemeToggle from './ThemeToggle';
import { FiMenu, FiGrid, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import './SuperAdminLayout.css';

const SuperAdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    useEffect(() => {
        initializeTheme();
    }, []);

    return (
        <div className="sa-layout bg-slate-50 dark:bg-slate-900 transition-colors duration-300 min-h-screen">
            <SuperAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Top Bar */}
                <header className="h-16 flex lg:hidden items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-slate-600 dark:text-slate-400"
                    >
                        <FiMenu size={24} />
                    </button>
                    <div className="font-bold text-slate-800 dark:text-indigo-400">Control Plane</div>
                    <div className="w-10"></div> {/* Spacer for symmetry */}
                </header>

                <main className="sa-main flex-1 relative">
                    <button 
                        onClick={() => window.history.back()}
                        className="fixed top-4 left-4 lg:left-8 z-[100] w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xl hover:scale-110 active:scale-95 transition-all group"
                        title="Go Back"
                    >
                        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="absolute top-4 right-8 z-50 hidden lg:block">
                        <ThemeToggle />
                    </div>
                    <div className="sa-content p-4 md:p-6 lg:p-8 pt-16 lg:pt-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SuperAdminLayout;
