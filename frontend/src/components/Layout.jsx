import axios from '../api/client'
import { useEffect, useState, Suspense } from 'react'
import { Outlet, Link, useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getApiBaseUrl, getFullImageUrl } from '../utils/api'
import {
  FiVideo, FiMessageSquare, FiMessageCircle, FiUser, FiLogOut, FiArrowRight, FiChevronLeft,
  FiUsers, FiSettings, FiSearch, FiAlertCircle, FiShield, FiGrid, FiBookOpen, FiActivity, FiBriefcase, FiMenu, FiX
} from 'react-icons/fi'
import SearchBar from './SearchBar'
import './Layout.css'
import useTheme from '../hooks/useTheme'
import PresenceManager from './PresenceManager'
import UserProfileDropdown from './UserProfileDropdown'
import { useSettingsStore } from '../store/settingsStore'
import { useFeatureStore } from '../store/featureStore'
import { useBranding } from '../contexts/BrandingContext'

export default function Layout() {
  const { user, logout, refreshUser } = useAuthStore()
  const { getSettingValue } = useSettingsStore()
  const { fetchFeatures, isFeatureEnabled } = useFeatureStore()
  const { getLogoUrl } = useBranding()
  const navigate = useNavigate()
  const location = useLocation()
  const [showSearch, setShowSearch] = useState(false)
  const [theme, setTheme] = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1200)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200 && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true)
      } else if (window.innerWidth >= 1200 && isSidebarCollapsed) {
        setIsSidebarCollapsed(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isSidebarCollapsed])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSwitchWorkspace = async () => {
    try {
      await axios.post('/workspace/exit')
      await refreshUser()
      navigate('/workspace-entry')
    } catch (err) {
      console.error('Failed to exit workspace', err)
      navigate('/workspace-entry')
    }
  }

  const handleBack = () => {
    navigate(-1)
  }


  // Branding Observer Logic: Uses cache-busting provided by BrandingProvider
  const platformLogo = getLogoUrl('system')
  const workspaceLogo = getLogoUrl('workspace')
  const workspaceName = user?.workspace_name

  useEffect(() => {
    if (user?.role) {
      document.body.setAttribute('data-role', user.role)
    }
    fetchFeatures(user?.workspace_id)
  }, [user?.role, user?.workspace_id, fetchFeatures])

  const isSuperAdmin = () => user?.platform_role === 'SUPER_ADMIN' || user?.role === 'super_admin'
  const isAtLeastAdmin = () => ['admin', 'super_admin'].includes(user?.role)

  const navGroups = [
    {
      title: 'Main',
      items: [
        { path: '/dashboard', icon: <FiGrid />, text: 'Overview' },
        { path: '#', icon: <FiSearch />, text: 'Global Search', action: () => setShowSearch(true), feature: 'search' },
      ].filter(item => !item.feature || isFeatureEnabled(item.feature))
    },
    {
      title: 'Academic',
      items: [
        { path: '/creation-hub', icon: <FiGrid />, text: 'Creation Hub', feature: 'creation_hub' },
        { path: '/classes', icon: <FiBookOpen />, text: 'My Classes', feature: 'classes' },
      ].filter(item => !item.feature || isFeatureEnabled(item.feature))
    },
    {
      title: 'Communication',
      items: [
        { path: '/chat', icon: <FiMessageSquare />, text: 'Channels', feature: 'channels' },
        { path: '/direct-messages', icon: <FiMessageCircle />, text: 'Messages', feature: 'messages' },
        { path: '/video-room', icon: <FiVideo />, text: 'Video Room', feature: 'video_room' },
      ].filter(item => !item.feature || isFeatureEnabled(item.feature))
    }
  ]

  if (isAtLeastAdmin()) {
    const adminGroup = {
      title: isSuperAdmin() ? 'Global Control' : 'Administration',
      items: []
    }

    if (isSuperAdmin()) {
      adminGroup.items.push({ path: '/superadmin/control-center', icon: <FiShield />, text: 'Control Plane' })
    }

    adminGroup.items.push({ path: '/admin/users', icon: <FiUsers />, text: 'Users' })
    adminGroup.items.push({ path: '/admin/creation-hub-audit', icon: <FiActivity />, text: 'Creation Hub Audit' })
    adminGroup.items.push({ path: '/admin/creation-policy', icon: <FiShield />, text: 'Creation Policy' })
    adminGroup.items.push({ path: '/admin/security', icon: <FiShield />, text: 'Security & Audit' })
    adminGroup.items.push({ path: '/admin/settings', icon: <FiSettings />, text: 'Institutional Settings' })

    navGroups.push(adminGroup)
  }

  navGroups.push({
    title: 'Account',
    items: [
      { path: '/profile', icon: <FiUser />, text: 'Profile' },
      { path: '/settings', icon: <FiSettings />, text: 'Preferences' },
    ]
  })

  // Filter out empty groups
  const filteredNavGroups = navGroups.filter(group => group.items && group.items.length > 0)

  return (
    <div className="layout">
      {/* Top Navigation Bar */}
      <header className="top-navbar">
        <div className="top-navbar-left">
          <button className="mobile-menu-toggle-navbar" onClick={() => setMobileMenuOpen(true)}>
            <FiMenu />
          </button>
          
          {location.pathname !== '/' && location.pathname !== '/dashboard' && (
            <button className="nav-back-btn" onClick={handleBack} title="Go Back">
              <FiChevronLeft />
            </button>
          )}

          <div className="page-context">
            {workspaceLogo && (
              <img 
                src={getFullImageUrl(workspaceLogo)} 
                alt={workspaceName} 
                className="header-workspace-logo" 
              />
            )}
            <div className="context-text">
              <span className="context-label">{workspaceName || 'Global View'}</span>
              <h2 className="context-title">
                {location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard'}
              </h2>
            </div>
          </div>
        </div>

        <div className="top-navbar-center">
          <NavLink to="/dashboard" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            <FiGrid />
            <span>Home</span>
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            <FiMessageSquare />
            <span>Chat</span>
          </NavLink>
          <NavLink to="/classes" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            <FiBookOpen />
            <span>Classes</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
            <FiUser />
            <span>Profile</span>
          </NavLink>
        </div>

        <div className="top-navbar-right">
          <button className="icon-btn search-trigger" onClick={() => setShowSearch(true)} title="Search Everywhere">
            <FiSearch />
          </button>
          
          <button className="theme-toggle-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <UserProfileDropdown user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* Global Search Overlay */}
      {showSearch && <SearchBar onClose={() => setShowSearch(false)} />}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />}
      
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="flex justify-between items-center mb-4 lg:hidden">
              <div className="scccs-branding">
                <span className="scccs-text">SCCCS</span>
                <span className="nextgen-text">EDUCATIONAL OS</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-800 rounded-full text-white">
                <FiX size={20} />
              </button>
          </div>
          {platformLogo && (
            <img src={getFullImageUrl(platformLogo)} alt="Platform Logo" className="sidebar-logo" />
          )}
          <div className="hidden lg:block scccs-branding">
            <span className="scccs-text">SCCCS</span>
            <span className="nextgen-text">EDUCATIONAL OS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredNavGroups.map((group, idx) => (
            <div key={idx} className="nav-group">
              <h3 className="nav-group-title">{group.title}</h3>
              <div className="nav-items">
                {group.items.map((item, itemIdx) => (
                  item.action ? (
                    <button 
                      key={itemIdx} 
                      className="nav-item" 
                      onClick={() => { item.action(); setMobileMenuOpen(false); }}
                    >
                      {item.icon}
                      <span className="nav-text">{item.text}</span>
                    </button>
                  ) : (
                    <NavLink 
                      key={itemIdx} 
                      to={item.path} 
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.icon}
                      <span className="nav-text">{item.text}</span>
                    </NavLink>
                  )
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-footer-btn" onClick={handleSwitchWorkspace}>
            <FiArrowRight />
            <span>Switch Workspace</span>
          </button>
          <button className="sidebar-footer-btn logout" onClick={handleLogout}>
            <FiLogOut />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <PresenceManager />
        <div className="content-container">
          <Suspense fallback={<div className="loading-spinner-container"><div className="spinner"></div></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <FiGrid />
          <span>Home</span>
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <FiMessageSquare />
          <span>Chat</span>
        </NavLink>
        <NavLink to="/classes" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <FiBookOpen />
          <span>Classes</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <FiUser />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  )
}
