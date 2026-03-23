import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';

export default function SystemSettingsBootstrapper() {
    const { settings, fetchSettings, getSettingValue } = useSettingsStore();
    const { user } = useAuthStore();

    useEffect(() => {
        // Fetch initial public settings
        fetchSettings(true);
    }, [fetchSettings]);

    useEffect(() => {
        // 1. Update Document Title with APP_NAME
        const appName = getSettingValue('APP_NAME', 'SCCCS');
        document.title = appName;

        // 2. Apply Theme Colors to :root CSS variables
        // Priority: Workspace Settings > Global Settings
        const workspaceSettings = user?.workspace_settings || {};

        const primaryColor = workspaceSettings.primary_color || getSettingValue('BRAND_COLOR_PRIMARY') || getSettingValue('PRIMARY_COLOR');
        const secondaryColor = workspaceSettings.secondary_color || getSettingValue('BRAND_COLOR_SECONDARY') || getSettingValue('SECONDARY_COLOR');
        const borderRadius = getSettingValue('BORDER_RADIUS');

        if (primaryColor) {
            document.documentElement.style.setProperty('--primary-color', primaryColor);
            document.documentElement.style.setProperty('--blue-500', primaryColor); // Overriding some common variables
        }
        if (secondaryColor) {
            document.documentElement.style.setProperty('--secondary-color', secondaryColor);
            document.documentElement.style.setProperty('--indigo-600', secondaryColor);
        }
        if (borderRadius) {
            document.documentElement.style.setProperty('--border-radius-xl', borderRadius);
        }

        // 3. Handle Maintenance Mode (simplified overlay)
        const isMaintenance = getSettingValue('MAINTENANCE_MODE');
        if (isMaintenance && !window.location.pathname.includes('/login')) {
            // We could redirect or show overlay, for now just log
            console.warn('System is in MAINTENANCE MODE');
        }

    }, [settings, getSettingValue, user]); // Re-run when user (workspace_settings) changes

    return null; // This component doesn't render anything
}
