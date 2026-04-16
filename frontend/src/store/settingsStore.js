import { create } from 'zustand'
import apiClient from '../api/client'
import { socket } from '../api/socket'

export const useSettingsStore = create((set, get) => ({
    settings: [],
    loading: false,
    error: null,
    brandingVersion: Date.now(), // Stable version for cache busting

    fetchSettings: async (isPublicOnly = false) => {
        set({ loading: true, error: null })
        try {
            const endpoint = isPublicOnly ? '/settings/public' : '/settings'
            const response = await apiClient.get(endpoint)
            set({ settings: response.data, loading: false })
        } catch (err) {
            set({ error: err.message, loading: false })
            console.error('Failed to fetch settings:', err)
        }
    },

    updateSetting: async (key, value) => {
        try {
            const response = await apiClient.patch(`/settings/${key}`, { value })
            // Local update will also happen via Socket.IO, but we can do it here too for responsiveness
            const updatedSetting = response.data.setting
            set((state) => ({
                settings: state.settings.map((s) =>
                    s.key === key ? { ...s, ...updatedSetting } : s
                )
            }))
            return { success: true }
        } catch (err) {
            console.error(`Failed to update setting ${key}:`, err)
            return { success: false, error: err.message }
        }
    },

    // --- System Settings (Super Admin - Platform) ---
    fetchSystemSettings: async () => {
        set({ loading: true, error: null })
        try {
            const response = await apiClient.get('/settings/platform')
            set({ settings: response.data, loading: false })
        } catch (err) {
            set({ error: err.message, loading: false })
            console.error('Failed to fetch platform settings:', err)
        }
    },

    updateSystemSetting: async (key, value, metadata = {}) => {
        try {
            const payload = {
                key,
                value,
                ...metadata
            }
            await apiClient.put('/settings/platform', payload)

            set((state) => ({
                settings: state.settings.map((s) =>
                    s.key === key ? { ...s, value, ...metadata } : s
                )
            }))
            return { success: true }
        } catch (err) {
            console.error(`Failed to update platform setting ${key}:`, err)
            return { success: false, error: err.message }
        }
    },

    // --- Institutional Settings (Workspace Admin) ---
    fetchInstitutionalSettings: async (workspaceId) => {
        set({ loading: true, error: null })
        try {
            const response = await apiClient.get(`/settings/institutional/${workspaceId}`)
            set({ settings: response.data, loading: false })
        } catch (err) {
            set({ error: err.message, loading: false })
            console.error('Failed to fetch institutional settings:', err)
        }
    },

    updateInstitutionalSetting: async (workspaceId, key, value) => {
        try {
            await apiClient.put(`/settings/institutional/${workspaceId}`, { key, value })

            set((state) => ({
                settings: state.settings.map((s) =>
                    s.key === key ? { ...s, value, is_overridden: true, workspace_value: value } : s
                )
            }))
            return { success: true }
        } catch (err) {
            console.error(`Failed to update institutional setting ${key}:`, err)
            return { success: false, error: err.message }
        }
    },

    updateWorkspaceDetails: async (workspaceId, data) => {
        try {
            await apiClient.patch(`/workspace/${workspaceId}`, data)
            return { success: true }
        } catch (err) {
            console.error('Failed to update workspace details:', err)
            return { success: false, error: err.message }
        }
    },

    // Real-time update handler
    handleSettingUpdate: (update) => {
        const { key, value } = update
        set((state) => {
            const isBranding = key.includes('LOGO') || key.includes('BRANDING')
            return {
                settings: state.settings.map((s) =>
                    s.key === key ? { ...s, value } : s
                ),
                brandingVersion: isBranding ? Date.now() : state.brandingVersion
            }
        })
    },

    getSettingValue: (key, defaultValue = null) => {
        const state = get()
        const setting = state.settings.find((s) => s.key === key)
        if (!setting) return defaultValue
        
        const value = setting.value
        // Add stable cache-buster to logo URLs
        if (value && typeof value === 'string' && (key.includes('LOGO') || key.includes('BRANDING'))) {
            return `${value}${value.includes('?') ? '&' : '?'}v=${state.brandingVersion}`
        }
        
        return value
    }
}))

// Initialize Socket.IO listener
if (typeof window !== 'undefined') {
    socket.on('system_setting_updated', (update) => {
        console.log('[SettingsStore] Real-time update received:', update)
        useSettingsStore.getState().handleSettingUpdate(update)
    })
    socket.on('institutional_setting_updated', (update) => {
        console.log('[SettingsStore] Institutional update received:', update)
        useSettingsStore.getState().handleSettingUpdate(update)
    })
}
