import axios from '../api/client'
import { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getApiBaseUrl, getFullImageUrl } from '../utils/api'
import {
  FiHome, FiVideo, FiMessageSquare, FiMessageCircle, FiBook, FiUser, FiLogOut, FiArrowRight,
  FiUsers, FiSettings, FiSearch, FiTrendingUp, FiAlertCircle, FiMonitor, FiLayers, FiMail,
  FiShield, FiBarChart2, FiDatabase, FiSun, FiMoon, FiGrid, FiBookOpen, FiActivity, FiCpu, FiBriefcase
} from 'react-icons/fi'
import SearchBar from './SearchBar'
import './Layout.css'
import useTheme from '../hooks/useTheme'
import PresenceManager from './PresenceManager'
import { useSettingsStore } from '../store/settingsStore'
import { useFeatureStore } from '../store/featureStore'

export default function Layout() {
  const { user, logout, refreshUser } = useAuthStore()
  const { getSettingValue } = useSettingsStore()
  const { fetchFeatures, isFeatureEnabled } = useFeatureStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showSearch, setShowSearch] = useState(false)
  const [theme, setTheme] = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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


  // Use system logo for sidebar (workspace logo shown in dashboard header)
  const systemLogo = getSettingValue('INSTITUTION_LOGO') || getSettingValue('SYSTEM_LOGO_URL')
  const displayLogo = systemLogo

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

  // Image error state
  const [imgError, setImgError] = useState(false)

  // Reset error when user changes
  useEffect(() => {
    setImgError(false)
  }, [user?.avatar_url])

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <FiGrid />
        </button>
        <div className="mobile-logo">
           {getSettingValue('APP_NAME', 'SCCCS')}
        </div>
        <div className="mobile-user" onClick={() => navigate('/profile')}>
           <FiUser />
        </div>
      </div>

      <nav className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''} expanded`}>
        {/* Close button for mobile */}
        <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
          <FiLogOut style={{transform: 'rotate(180deg)'}} />
        </button>
        <div className="sidebar-header">
          <Link to="/dashboard" className="logo-link">
            <div className="branding-container">
              {displayLogo ? (
                <div className="flex items-center gap-3">
                  <img
                    src={getFullImageUrl(displayLogo)}
                    alt="Logo"
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
            <div className="sidebar-user-container" onClick={() => navigate('/profile')}>
              <div className="sidebar-user-avatar">
                {user?.avatar_url && !imgError ? (
                  <img
                    src={getFullImageUrl(user.avatar_url)}
                    alt="User"
                    className="avatar-img"
                    onError={(e) => {
                      console.warn("Avatar load failed:", user.avatar_url);
                      setImgError(true);
                    }}
                  />
                ) : (
                  <div className="avatar-initial">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="sidebar-user-info">
                <span className="user-name">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </span>
                <span className="user-role">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <button className="nav-item" onClick={handleSwitchWorkspace} title="Switch Workspace">
              <span className="nav-icon"><FiBriefcase /></span>
              <span className="nav-text">Switch Workspace</span>
            </button>
            <button className="nav-item theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <span className="nav-icon">{theme === 'dark' ? <FiMoon /> : <FiSun />}</span>
              <span className="nav-text">{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
            </button>
            <button className="nav-item logout-button" onClick={handleLogout}>
              <span className="nav-icon"><FiLogOut /></span>
              <span className="nav-text">Sign Out</span>
            </button>
          </div>
        </div>
      </nav >

      {/* Overlay to close mobile menu */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>}

      <main className="main-content">
        <PresenceManager />
        {location.pathname !== '/' && location.pathname !== '/dashboard' && (
          <button className="premium-back-btn" onClick={handleBack} title="Go Back">
            <FiArrowRight />
          </button>
        )}
        <div className="content-container">
          <Outlet />
        </div>
      </main>

      {isFeatureEnabled('video_room') && (
        <button className="floating-video-btn" onClick={() => navigate('/video-room')} title="Start Meeting">
          <FiVideo />
        </button>
      )}

      {showSearch && <SearchBar onClose={() => setShowSearch(false)} />}
    </div >
  )
}
