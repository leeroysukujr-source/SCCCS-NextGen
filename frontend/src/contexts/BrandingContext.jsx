import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { socket } from '../api/socket';

const BrandingContext = createContext();

export const BrandingProvider = ({ children }) => {
    const { getSettingValue, brandingVersion, handleSettingUpdate } = useSettingsStore();
    const { user } = useAuthStore();
    
    // Instruction: Use a "Global Observer" that listens for logo updates.
    useEffect(() => {
        const handleGlobalUpdate = (update) => {
            console.log('[BrandingObserver] Received global branding update:', update);
            handleSettingUpdate(update);
        };

        const handleWorkspaceUpdate = (update) => {
            console.log('[BrandingObserver] Received workspace branding update:', update);
            // This force-refreshes the local cache for logos
            handleSettingUpdate({ 
                key: 'WORKSPACE_LOGO_URL', 
                value: update.logo_url 
            });
        };

        socket.on('system_setting_updated', handleGlobalUpdate);
        socket.on('workspace_branding_updated', handleWorkspaceUpdate);

        return () => {
            socket.off('system_setting_updated', handleGlobalUpdate);
            socket.off('workspace_branding_updated', handleWorkspaceUpdate);
        };
    }, [handleSettingUpdate]);

    // Instruction: Add a cache-buster timestamp to the logo URL to force the browser 
    // to stop showing the old version.
    const getLogoUrl = (type = 'system') => {
        let url = '';
        if (type === 'system') {
            url = getSettingValue('SYSTEM_LOGO_URL') || getSettingValue('branding_logo_url');
        } else {
            url = user?.workspace_logo || getSettingValue('WORKSPACE_LOGO_URL');
        }

        if (!url) return null;

        // Clean existing version tags to avoid duplication
        const cleanUrl = url.split('?v=')[0];
        return `${cleanUrl}?v=${brandingVersion || Date.now()}`;
    };

    return (
        <BrandingContext.Provider value={{ getLogoUrl, brandingVersion }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => useContext(BrandingContext);
