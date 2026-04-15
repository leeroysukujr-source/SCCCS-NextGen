import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { getApiUrl } from '../utils/api'
import { useNetworkStore } from '../store/networkStore'

// Network-aware API client for multi-browser/multi-device access
// Automatically detects current hostname (localhost or network IP) and uses it
// This ensures each browser/device session connects independently without conflicts
// Backend runs on 0.0.0.0 which binds to all interfaces for network access

// Function to get the backend host based on current location
function getBackendHost() {
  if (typeof window === 'undefined') {
    return 'localhost'
  }
  const hostname = window.location.hostname
  return (hostname === 'localhost' || hostname === '127.0.0.1') ? 'localhost' : hostname
}

// Initialize API_URL using smart detection from getApiUrl()
let API_URL = getApiUrl()

// Validation: If in production and API_URL is relative (/api), it MUST be converted to absolute
// if we want to hit the tunnel, otherwise it hits Firebase Hosting functions (which are 404).
if (import.meta.env.PROD && API_URL.startsWith('/')) {
  console.warn('[API Client] PROD detected with relative API_URL. Ensure this is intended for Firebase Functions.')
}

console.log('[API Client] Initial API URL:', API_URL)
console.log('[API Client] Environment:', import.meta.env.MODE)

// Test connection function (call manually if needed for debugging)
export const testBackendConnection = async () => {
  if (typeof window === 'undefined') return

  try {
    const testUrl = `${API_URL}/auth/test`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const res = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true'
      },
      mode: 'cors',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      console.log('[API Client] ✅ Backend connection test successful:', data)
      return { success: true, data }
    } else {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[API Client] ⏱️ Backend connection test timed out')
    } else {
      console.error('[API Client] ❌ Backend connection test failed:', err)
    }
    console.error('[API Client] Test URL was:', `${API_URL}/auth/test`)
    const baseUrl = getApiBaseUrl()
    console.error('[API Client] Please verify:')
    console.error(`  1. Backend is running on ${baseUrl}`)
    console.error('  2. Backend is accessible from this browser')
    console.error('  3. No firewall is blocking the connection')
    return { success: false, error: err }
  }
}

// Export helper function
export { getApiBaseUrl } from '../utils/api'

// Ensure a single shared axios client exists on the global object to avoid duplicate
// top-level declarations if this module is bundled/loaded multiple times.
if (typeof globalThis.__SCCCS_API_CLIENT__ === 'undefined') {
  // Create axios instance - baseURL will be set dynamically
  globalThis.__SCCCS_API_CLIENT__ = axios.create({
    baseURL: API_URL,
    headers: {
      'bypass-tunnel-reminder': 'true',
    },
    timeout: 30000,
  })

  // Ensure baseURL is set correctly and attempt to find working backend
  if (typeof window !== 'undefined') {
    globalThis.__SCCCS_API_CLIENT__.defaults.baseURL = API_URL
    try {
      // update network store for UI visibility
      useNetworkStore.getState().setApiUrl(API_URL)
    } catch (e) {
      // ignore in non-react contexts
    }

    // Disable dynamic discovery in production to avoid Mixed Content errors
    if (typeof window !== 'undefined' && !import.meta.env.PROD) {
      setTimeout(async () => {
        try {
          const { findWorkingApiUrl } = await import('../utils/api')
          const workingUrl = await findWorkingApiUrl()
          const newApiUrl = `${workingUrl}/api`
          if (newApiUrl !== globalThis.__SCCCS_API_CLIENT__.defaults.baseURL) {
            globalThis.__SCCCS_API_CLIENT__.defaults.baseURL = newApiUrl
            console.log('[API Client] ✅ Updated to working backend:', workingUrl)
          }
        } catch (err) {
          // ignore
        }
      }, 0)
    }
  }

  // Request interceptor to add token
  globalThis.__SCCCS_API_CLIENT__.interceptors.request.use(
    (config) => {
      const token = useAuthStore.getState().token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      // Aggressively clean baseURL and url for safe joining
      const base = config.baseURL || '';
      const path = config.url || '';
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const cleanUrl = path.startsWith('/') ? path : `/${path}`;
      const fullUrl = `${cleanBase}${cleanUrl}`;
      
      console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`, {
        baseURL: config.baseURL,
        url: config.url,
        fullUrl: fullUrl,
        data: config.data,
        headers: config.headers
      })
      return config
    },
    (error) => {
      console.error('[API Request Error]', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor to handle errors
  globalThis.__SCCCS_API_CLIENT__.interceptors.response.use(
    (response) => {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status, response.data)
      return response
    },
    (error) => {
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN'
      const url = error.config?.url || 'UNKNOWN'
      const status = error.response?.status
      const errorData = error.response?.data || error.message

      console.error('[API Response Error]', {
        method,
        url,
        status,
        statusText: error.response?.statusText,
        error: errorData,
        message: error.message,
        code: error.code
      })

      if (error.response?.data) {
        console.error('[API Response Error Data]', JSON.stringify(error.response.data, null, 2))
      }

      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        console.error('[Network Error Details]', {
          baseURL: error.config?.baseURL,
          fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'N/A',
          timeout: error.config?.timeout,
          headers: error.config?.headers
        })
      }

      if (error.response?.status === 401 && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )
}

export const apiClient = globalThis.__SCCCS_API_CLIENT__
export default globalThis.__SCCCS_API_CLIENT__

