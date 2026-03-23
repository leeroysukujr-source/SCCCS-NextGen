import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import NotificationProvider from './components/NotificationProvider'
import './tailwind.css'
import './index.css'
import './utils/tooltipify'

// Initialize theme from localStorage or default to dark
const savedTheme = localStorage.getItem('theme-storage')
let initialTheme = 'dark'
if (savedTheme) {
  try {
    const parsed = JSON.parse(savedTheme)
    initialTheme = parsed.state?.theme || 'dark'
  } catch (e) {
    console.error('Error parsing theme storage:', e)
  }
}
document.documentElement.setAttribute('data-theme', initialTheme)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>,
)

// Register service worker conditionally if admin enabled PWA in local settings
try {
  const sys = JSON.parse(localStorage.getItem('system_settings') || '{}')
  if (sys && sys.enablePWA && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('ServiceWorker registered:', reg.scope)
      }).catch(err => console.warn('SW registration failed:', err))
    })
  }
} catch (e) { console.warn('Error checking system settings for PWA', e) }

