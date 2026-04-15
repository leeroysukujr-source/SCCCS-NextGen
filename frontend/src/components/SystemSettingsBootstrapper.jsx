import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { FiRefreshCcw, FiLogOut, FiTool } from 'react-icons/fi';

export default function SystemSettingsBootstrapper() {
    const { settings, fetchSettings, getSettingValue } = useSettingsStore();
    const { user, logout } = useAuthStore();
    const [isMaintenance, setIsMaintenance] = useState(false);

    useEffect(() => {
        // Fetch initial public settings
        fetchSettings(true);
    }, [fetchSettings]);

    useEffect(() => {
        // 1. Update Document Title with APP_NAME
        const appName = getSettingValue('APP_NAME', 'SCCCS');
        document.title = appName;

        // 2. Apply Theme Colors to :root CSS variables
        const workspaceSettings = user?.workspace_settings || {};
        const primaryColor = workspaceSettings.primary_color || getSettingValue('BRAND_COLOR_PRIMARY') || getSettingValue('PRIMARY_COLOR');
        
        if (primaryColor) {
            document.documentElement.style.setProperty('--primary-color', primaryColor);
            document.documentElement.style.setProperty('--blue-500', primaryColor);
        }

        // 3. Update local state for Maintenance Mode
        // Supports both boolean and string "true" from DB
        const maint = getSettingValue('MAINTENANCE_MODE');
        setIsMaintenance(maint === true || maint === 'true');

    }, [settings, getSettingValue, user]);

    // Bypass logic: Super Admins or users currently logging in (public routes)
    const isSuperAdmin = user?.platform_role === 'SUPER_ADMIN' || user?.role === 'super_admin';
    const isPublicRoute = window.location.pathname.includes('/login') || 
                         window.location.pathname.includes('/signup') ||
                         window.location.pathname.includes('/auth/callback');

    if (isMaintenance && !isSuperAdmin && !isPublicRoute) {
        return (
            <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full"></div>
                
                <div className="relative space-y-8 max-w-md w-full animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                        <FiTool className="text-amber-500 text-5xl animate-bounce" />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-white tracking-tight">System Under Maintenance</h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            We're currently performing scheduled updates to improve your experience. 
                            The platform will be back online shortly.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98]"
                        >
                            Check Status
                        </button>
                        <button 
                            onClick={logout}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold rounded-2xl transition-all border border-slate-800 flex items-center justify-center gap-2"
                        >
                            <FiLogOut /> Exit Platform
                        </button>
                    </div>

                    <p className="text-slate-600 text-sm font-medium">
                        Administrator? Please log in with a Super Admin account.
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
