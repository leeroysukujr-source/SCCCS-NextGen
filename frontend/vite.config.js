import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend URL - Use localhost if running locally, otherwise use network IP
const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    proxy: {
      '/api/ai': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/ws/caption': {
        target: 'ws://localhost:8001',
        ws: true,
      },
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})


// touched for rebuild
