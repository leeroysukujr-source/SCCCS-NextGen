import axios from '../api/client'
import { useEffect, useState, Suspense } from 'react'
import { Outlet, Link, useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getApiBaseUrl, getFullImageUrl } from '../utils/api'
import {
  FiVideo, FiMessageSquare, FiMessageCircle, FiUser, FiLogOut, FiArrowRight, FiChevronLeft,
  FiUsers, FiSettings, FiSearch, FiAlertCircle,
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
        { path: '/search', icon: <FiSearch />, text: 'Search', action: () => setShowSearch(true), feature: 'search' },
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
          <button className="navbar-action-btn" onClick={() => setShowSearch(true)} title="Search">
            <FiSearch />
          </button>
          <div className="navbar-divider"></div>
          <UserProfileDropdown />
        </div>
      </header>

      <nav className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? '' : 'expanded'}`}>
        {/* Toggle Button for Desktop */}
        <button 
          className="sidebar-collapse-toggle" 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <FiArrowRight /> : <FiChevronLeft />}
        </button>
        {/* Close button for mobile */}
        <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
          <FiLogOut style={{transform: 'rotate(180deg)'}} />
        </button>
        <div className="sidebar-header">
          <Link to="/dashboard" className="logo-link">
            <div className="branding-container">
              {platformLogo ? (
                <div className="flex items-center gap-3">
                  <img
                    src={getFullImageUrl(platformLogo)}
                    alt="Platform Logo"
                    className="h-12 w-auto object-contain max-w-[120px]"
                  />
                  <div className="logo-text-wrapper overflow-hidden">
                    <h1 className="logo text-lg leading-tight truncate">
                      {getSettingValue('APP_NAME', 'SCCCS')}
                    </h1>
                    <p className="logo-subtitle text-[10px] tracking-[0.2em] font-bold">Educational OS</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <h1 className="logo text-2xl">{getSettingValue('APP_NAME', 'SCCCS')}</h1>
                  <p className="logo-subtitle">Educational OS</p>
                </div>
              )}
            </div>
          </Link>

        </div>

        <div className="sidebar-nav">
          {filteredNavGroups.map((group, gIdx) => (
            <div key={gIdx} className="nav-group">
              <div className="nav-group-title">{group.title}</div>
              <div className="nav-group-items">
                {group.items.map((item, iIdx) => (
                  item.action ? (
                    <button key={iIdx} onClick={item.action} className="nav-item">
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-text">{item.text}</span>
                    </button>
                  ) : (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-text">{item.text}</span>
                    </NavLink>
                  )
                ))}
              </div>
            </div>
          ))}

          <div className="nav-footer">
            <button className="nav-item" onClick={handleSwitchWorkspace} title="Switch Workspace">
              <span className="nav-icon"><FiBriefcase /></span>
              <span className="nav-text">Switch Workspace</span>
            </button>
          </div>
        </div>
      </nav >

      {/* Overlay to close mobile menu */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>}

      <main className="main-content">
        <PresenceManager />
        <div className="content-container">
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-500 animate-pulse">Initializing Interface...</div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {isFeatureEnabled('video_room') && (
        <button className="floating-video-btn" onClick={() => navigate('/video-room')} title="Start Meeting">
          <FiVideo />
        </button>
      )}

      {showSearch && <SearchBar onClose={() => setShowSearch(false)} />}

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
    </div >
  )
}
