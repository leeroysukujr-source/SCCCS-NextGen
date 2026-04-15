import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  FiShield, FiBox, FiUsers, FiBarChart2, FiSettings,
  FiActivity, FiLock, FiUser, FiSliders, FiLogOut
} from 'react-icons/fi'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'

const SuperAdminSidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore()
  const { getSettingValue } = useSettingsStore()
  const rawAppName = getSettingValue('APP_NAME', 'SCCCS Control')
  const appName = rawAppName.replace(/^['"]|['"]$/g, '')

  const menuItems = [
    { path: '/superadmin/control-center', icon: <FiShield />, text: 'Control Center' },
    { path: '/superadmin/workspaces', icon: <FiBox />, text: 'Workspaces' },
    { path: '/superadmin/system-admins', icon: <FiUsers />, text: 'System Admins' },
    { path: '/superadmin/global-users', icon: <FiUsers />, text: 'Global Users' },
    { path: '/superadmin/reports', icon: <FiBarChart2 />, text: 'Reports' },
    { path: '/superadmin/settings', icon: <FiSettings />, text: 'Institutional Settings' },
    { path: '/superadmin/platform-settings', icon: <FiSliders />, text: 'Platform Master' },
    { path: '/superadmin/feature-lab', icon: <FiActivity />, text: 'Feature Lab' },
    { path: '/superadmin/security', icon: <FiLock />, text: 'Security & Audit' },
    { path: '/superadmin/profile', icon: <FiUser />, text: 'Profile' },
    { path: '/superadmin/preferences', icon: <FiSliders />, text: 'Preferences' },
  ]

  const logoUrl = getSettingValue('SYSTEM_LOGO_URL')

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[55] lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-72 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed left-0 top-0 z-[60] transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-8 w-auto object-contain max-w-[150px]" />
            ) : (
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FiShield className="text-lg" />
              </div>
            )}
            <span className="font-extrabold text-lg text-slate-800 dark:text-indigo-400 tracking-tight leading-none">
              {appName}
            </span>
          </div>

          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 lg:hidden"
          >
            <FiLogOut style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <div className="px-4 mb-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Platform Management
          </div>
          <div className="space-y-1 mb-6">
            {menuItems.slice(0, 8).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.text}</span>
              </NavLink>
            ))}
          </div>

          <div className="px-4 mb-2 mt-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-t border-slate-100 dark:border-slate-800/50 pt-6">
            Account
          </div>
          <div className="space-y-1">
            {menuItems.slice(8).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.text}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-slate-300 dark:border-slate-700 shadow-sm">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate">{user?.username}</span>
              <span className="text-xs text-slate-500 dark:text-slate-500 truncate">Super Administrator</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all font-medium text-sm"
          >
            <FiLogOut /> <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default SuperAdminSidebar
