import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (user, token) => {
        console.log('[AuthStore] setAuth called', { user: user?.username })
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        console.log('[AuthStore] List logging out...')
        set({ user: null, token: null, isAuthenticated: false })
        localStorage.removeItem('auth-storage')
        // Clear any other auth items if needed
      },

      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      })),

      updateUserRole: (newRole) => set((state) => ({
        user: { ...state.user, role: newRole }
      })),

      updateUserPrivileges: (newPrivileges) => set((state) => ({
        user: { ...state.user, privileges: newPrivileges }
      })),

      setHasHydrated: (value) => set({ hasHydrated: value }),

      refreshUser: async () => {
        // Refresh user data from server
        try {
          const { authAPI } = await import('../api/auth')
          console.log('[AuthStore] Fetching fresh user data from server...')
          const userData = await authAPI.getCurrentUser()
          if (userData) {
            console.log('[AuthStore] Received fresh user data:', userData)
            set((state) => {
              const oldRole = state.user?.role
              const newRole = userData.role
              if (oldRole && oldRole !== newRole) {
                console.log('[AuthStore] Role changed in store:', oldRole, '->', newRole)
              }
              return { user: userData }
            })
            return userData
          }
          return null
        } catch (error) {
          console.error('[AuthStore] Error refreshing user:', error)
          // If user not found (404), automatically log out
          if (error?.response?.status === 404 || error?.response?.data?.error === 'User not found') {
            console.log('[AuthStore] User not found, logging out...')
            set({ user: null, token: null, isAuthenticated: false })
            localStorage.removeItem('auth-storage')
            // Redirect to login page
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          }
          return null
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[AuthStore] Error rehydrating auth storage:', error)
        }
        state?.setHasHydrated(true)
        console.log('[AuthStore] Hydration complete. user:', state?.user?.username, 'isAuthenticated:', state?.isAuthenticated, 'hasHydrated:', state?.hasHydrated)
      },
    }
  )
)

