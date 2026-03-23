import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiClient from '../api/client'

export const useFeatureStore = create(
    persist(
        (set, get) => ({
            features: {},
            isLoading: false,
            error: null,

            fetchFeatures: async (workspaceId = null) => {
                set({ isLoading: true, error: null })
                try {
                    const params = workspaceId ? { workspace_id: workspaceId } : {}
                    const response = await apiClient.get('/features/config', { params })
                    set({ features: response.data, isLoading: false })
                } catch (err) {
                    console.error('Failed to fetch features:', err)
                    set({ error: err.message, isLoading: false })
                }
            },

            isFeatureEnabled: (featureName) => {
                const { features } = get()
                const feature = features[featureName]
                if (!feature) return true // Enabled by default if unknown

                // Support both old boolean format and new object format
                if (typeof feature === 'boolean') return feature
                return feature.enabled
            },

            getFeatureConfig: (featureName) => {
                const { features } = get()
                const feature = features[featureName]
                if (!feature || typeof feature === 'boolean') return {}
                return feature.config || {}
            },

            updateGlobalFeature: async (data) => {
                try {
                    const response = await apiClient.post('/features/global', data)
                    const updatedFeature = response.data
                    set((state) => ({
                        features: {
                            ...state.features,
                            [updatedFeature.name]: {
                                enabled: updatedFeature.is_enabled,
                                config: updatedFeature.config
                            }
                        }
                    }))
                    return { success: true }
                } catch (err) {
                    console.error('Failed to update global feature:', err)
                    return { success: false, error: err.message }
                }
            },

            setWorkspaceOverride: async (data) => {
                try {
                    const response = await apiClient.post('/features/override', data)
                    // If we are currently viewing this workspace, we might want to update local state
                    // But usually Feature Lab is a separate UI.
                    return { success: true, data: response.data }
                } catch (err) {
                    console.error('Failed to set workspace override:', err)
                    return { success: false, error: err.message }
                }
            }
        }),
        {
            name: 'feature-flags-storage',
        }
    )
)
