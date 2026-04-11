/**
 * Utility functions for API URL detection
 * Supports multi-browser/multi-device access with isolated sessions
 */

/**
 * Get the current hostname from window location
 * This allows the app to work when accessed from different devices/browsers
 */
function getCurrentHostname() {
  if (typeof window === 'undefined') {
    return 'localhost'
  }

  const hostname = window.location.hostname

  // If accessed via localhost or 127.0.0.1, use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost'
  }

  // Otherwise, use the network hostname (e.g., 192.168.1.65)
  return hostname
}

/**
 * Get the API base URL (without /api suffix)
 * Uses the current window hostname to support network access
 * This ensures each browser/device connects to the backend correctly
 */
export function getApiBaseUrl() {
  // If explicitly set in env, use it as primary source
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '').replace(/\/$/, '')
  }

  const hostname = getCurrentHostname()
  
  // If we are on localhost, always prefer localhost for the backend too
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000'
  }

  return `http://${hostname}:5000`
}

/**
 * Get the full API URL (with /api suffix)
 */
export function getApiUrl() {
  return `${getApiBaseUrl()}/api`
}

/**
 * Get the Socket.IO URL (same hostname as API, default port for Flask-SocketIO)
 * Always uses localhost for WebSocket to avoid network IP issues
 */
export function getSocketUrl() {
  // If explicitly set in env, use it
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }

  // Default to the same host as the API base URL to avoid cross-host mismatches.
  // If the API is configured via VITE_API_URL, use that host; otherwise fall back to localhost.
  try {
    const apiBase = getApiBaseUrl()
    // getApiBaseUrl returns a base like http://hostname:5000
    return apiBase
  } catch (e) {
    return 'http://localhost:5000'
  }
}

/**
 * Get the Mediasoup URL (same hostname, port 4000)
 */
export function getMediasoupUrl() {
  // If explicitly set in env, use it
  if (import.meta.env.VITE_MEDIASOUP_URL) {
    return import.meta.env.VITE_MEDIASOUP_URL
  }

  // Use same hostname with mediasoup port
  const hostname = getCurrentHostname()
  return `http://${hostname}:4000`
}

/**
 * Test which backend URL works - tries current hostname first, then localhost
 * This ensures the app works when accessed from network devices
 */
export async function findWorkingApiUrl() {
  const hostname = getCurrentHostname()

  // In production mode, do NOT attempt automatic discovery
  // This prevents Mixed Content errors (HTTPS page requesting HTTP)
  if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '')
  }

  const urls = [
    `http://${hostname}:5000`,  // Try current hostname first (network IP if accessed remotely)
    'http://localhost:5000'      // Fallback to localhost
  ]

  // Remove duplicates if hostname is localhost
  const uniqueUrls = [...new Set(urls)]

  for (const baseUrl of uniqueUrls) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)

      const response = await fetch(`${baseUrl}/api/auth/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return baseUrl
      }
    } catch (err) {
      // Try next URL
      continue
    }
  }

  // Default to current hostname (will be localhost if accessed locally)
  return `http://${hostname}:5000`
}

/**
 * Get the full URL for an image/file from the backend
 * Handles /api, /static, and protocol-relative URLs
 */
export function getFullImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http')) return url;

  const base = getApiBaseUrl();

  // Ensure we have a leading slash if not present
  const path = url.startsWith('/') ? url : `/${url}`;

  // If it already starts with /api or /static, just prepend the base
  if (path.startsWith('/api') || path.startsWith('/static')) {
    return `${base}${path}`;
  }

  // Fallback: assume it's an API route if no prefix
  return `${base}/api${path}`;
}

