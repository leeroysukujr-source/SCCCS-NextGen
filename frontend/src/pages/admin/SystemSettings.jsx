import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { workspaceAPI } from '../../api/workspace'
import {
  FiSettings, FiSave, FiGlobe, FiBriefcase, FiLock, FiToggleRight,
  FiServer, FiImage, FiKey, FiCpu, FiMessageSquare, FiVideo, FiHardDrive,
  FiFileText, FiInfo, FiCheck, FiX, FiShield
} from 'react-icons/fi'
import { useNotify } from '../../components/NotificationProvider'
import './SystemSettings.css' // We will create this

export default function SystemSettings() {
  const { user } = useAuthStore()
  const { settings, fetchSettings, updateSetting, fetchSystemSettings, updateSystemSetting } = useSettingsStore()
  const notify = useNotify()

  const [activeTab, setActiveTab] = useState('general')
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const isSuperAdmin = user?.platform_role === 'SUPER_ADMIN' || user?.role === 'super_admin'

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        if (isSuperAdmin) {
          await fetchSystemSettings()
          if (user?.workspace_id) {
            const ws = await workspaceAPI.get(user.workspace_id)
            setWorkspace(ws)
          }
        } else {
          await fetchSettings()
          const ws = await workspaceAPI.getIdentity()
          setWorkspace(ws)
        }
      } catch (e) {
        notify('error', 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user, isSuperAdmin, fetchSettings, fetchSystemSettings])

  // Handlers
  const handleUpdateSetting = async (key, value) => {
    try {
      if (isSuperAdmin) {
        await updateSystemSetting(key, value)
      } else {
        await updateSetting(key, value)
        await fetchSettings() // Refresh to get effective
      }
      notify('success', 'Setting saved')
    } catch (err) {
      notify('error', 'Failed to save setting')
      console.error(err)
    }
  }

  const handleUpdateIdentity = async (field, value) => {
    if (!workspace) return
    const updated = { ...workspace, [field]: value }
    setWorkspace(updated)
    try {
      if (isSuperAdmin) {
        await workspaceAPI.update(workspace.id, { [field]: value })
      } else {
        await workspaceAPI.updateIdentity({ [field]: value })
      }
      notify('success', 'Identity updated')
    } catch (err) {
      notify('error', 'Failed to update identity')
    }
  }

  const getS = (key) => settings.find(s => s.key === key)

  if (loading) return <div className="settings-loading">Loading configuration...</div>

  // Tab Content Renderers
  const renderGeneralTab = () => (
    <div className="settings-tab-content fade-in">
      <div className="settings-card">
        <div className="card-header">
          <FiBriefcase className="card-icon text-blue-500" />
          <div>
            <h3>Organization Identity</h3>
            <p>How this workspace appears to users.</p>
          </div>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label>Organization Name</label>
            <input
              value={workspace?.name || ''}
              onChange={(e) => handleUpdateIdentity('name', e.target.value)}
              className="settings-input"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={workspace?.description || ''}
              onChange={(e) => handleUpdateIdentity('description', e.target.value)}
              className="settings-input"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-header">
          <FiGlobe className="card-icon text-indigo-500" />
          <div>
            <h3>Platform Branding</h3>
            <p>Customize the look and feel.</p>
          </div>
        </div>
        <div className="card-body">
          <SettingItem
            setting={getS('APP_NAME')}
            label="Application Name"
            onSave={handleUpdateSetting}
          />
          <SettingItem
            setting={getS('theme_primary_color')}
            label="Primary Brand Color"
            type="color"
            onSave={handleUpdateSetting}
          />
        </div>
      </div>
    </div>
  )

  const renderFeaturesTab = () => (
    <div className="settings-tab-content fade-in">
      <div className="feature-grid">
        <FeatureToggle
          setting={getS('feature_chat_enabled')}
          label="Chat & Messaging"
          icon={<FiMessageSquare />}
          description="Real-time messaging, channels, and group chats."
          onSave={handleUpdateSetting}
        />
        <FeatureToggle
          setting={getS('feature_video_meet_enabled')}
          label="Video Meetings"
          icon={<FiVideo />}
          description="Live video classes and conferences via LiveKit."
          onSave={handleUpdateSetting}
        />
        <FeatureToggle
          setting={getS('feature_drive_enabled')}
          label="Cloud Drive"
          icon={<FiHardDrive />}
          description="File storage, sharing, and folder management."
          onSave={handleUpdateSetting}
        />
        <FeatureToggle
          setting={getS('feature_assignments_enabled')}
          label="Assignments"
          icon={<FiFileText />}
          description="Assignment creation, submission, and grading workflow."
          onSave={handleUpdateSetting}
        />
        <FeatureToggle
          setting={getS('feature_ai_assistant_enabled')}
          label="AI Assistant"
          icon={<FiCpu />}
          description="LLM-powered chatbot and content generation features."
          onSave={handleUpdateSetting}
        />
      </div>
    </div>
  )

  const renderSecurityTab = () => (
    <div className="settings-tab-content fade-in">
      <div className="settings-card">
        <div className="card-header">
          <FiShield className="card-icon text-red-500" />
          <div>
            <h3>Security & Access Control</h3>
            <p>Manage authentication and limits.</p>
          </div>
        </div>
        <div className="card-body">
          <SettingSwitch
            setting={getS('allow_public_registration')}
            label="Allow Public Registration"
            onSave={handleUpdateSetting}
          />
          <SettingSwitch
            setting={getS('require_mfa_admins')}
            label="Require MFA for Admins"
            onSave={handleUpdateSetting}
          />

          <div className="divider my-4"></div>

          <SettingItem
            setting={getS('max_upload_size_mb')}
            label="Max Upload Size (MB)"
            type="number"
            onSave={handleUpdateSetting}
          />

          {isSuperAdmin && (
            <SettingItem
              setting={getS('storage_limit_gb')}
              label="Default Storage Limit (GB)"
              type="number"
              onSave={handleUpdateSetting}
            />
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="settings-page-premier">
      <header className="settings-header">
        <div className="header-icon-box">
          <FiSettings size={28} />
        </div>
        <div>
          <h1>{isSuperAdmin ? 'Global Control Center' : 'Workspace Settings'}</h1>
          <p>{isSuperAdmin ? 'Manage platform-wide configurations' : `Manage settings for ${workspace?.name || 'your workspace'}`}</p>
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <nav>
            <button
              className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <FiBriefcase /> General
            </button>
            <button
              className={`nav-item ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              <FiToggleRight /> Features & Modules
            </button>
            <button
              className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FiLock /> Security & Limits
            </button>
            {/* Add more tabs as needed */}
          </nav>

          <div className="sidebar-info-box">
            <FiInfo size={16} />
            <p>
              {isSuperAdmin
                ? "Changes here affect the Default System Settings."
                : "Settings marked with 'Override' are specific to this workspace."}
            </p>
          </div>
        </aside>

        <main className="settings-main">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'features' && renderFeaturesTab()}
          {activeTab === 'security' && renderSecurityTab()}
        </main>
      </div>
    </div>
  )
}

// --- Sub-components (could be in separate files) ---

function SettingItem({ setting, label, type = "text", onSave }) {
  const [val, setVal] = useState('')
  useEffect(() => { setVal(setting?.value || '') }, [setting])

  // Detect unsaved changes (naïve) - ideally compare better
  const hasChanged = String(val) !== String(setting?.value || '')

  return (
    <div className={`setting-item ${setting?.is_overridden ? 'overridden' : ''}`}>
      <div className="setting-label">
        <label>{label}</label>
        {setting?.is_overridden && <span className="badge-override">Override</span>}
      </div>
      <div className="setting-input-group">
        <input
          type={type}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="settings-input"
        />
        {hasChanged && (
          <button className="btn-save-mini" onClick={() => onSave(setting.key, type === 'number' ? Number(val) : val)}>
            <FiSave />
          </button>
        )}
      </div>
      {setting?.description && <small>{setting.description}</small>}
    </div>
  )
}

function SettingSwitch({ setting, label, onSave }) {
  const enabled = setting?.value === true || setting?.value === 'true'

  return (
    <div className={`setting-switch-row ${setting?.is_overridden ? 'overridden' : ''}`}>
      <div className="setting-info">
        <label>{label}</label>
        {setting?.is_overridden && <span className="badge-override">Override</span>}
        {setting?.description && <small>{setting.description}</small>}
      </div>
      <div className="switch-wrapper">
        <button
          className={`toggle-switch ${enabled ? 'on' : 'off'}`}
          onClick={() => onSave(setting.key, !enabled)}
        >
          <div className="knob" />
        </button>
      </div>
    </div>
  )
}

function FeatureToggle({ setting, label, icon, description, onSave }) {
  const enabled = setting?.value === true || setting?.value === 'true'

  return (
    <div className={`feature-card ${enabled ? 'enabled' : 'disabled'}`}>
      <div className="feature-icon">{icon}</div>
      <div className="feature-content">
        <h4>{label} {setting?.is_overridden && <span className="badge-override">Override</span>}</h4>
        <p>{description}</p>
      </div>
      <button
        className={`feature-toggle-btn ${enabled ? 'btn-active' : ''}`}
        onClick={() => onSave(setting.key, !enabled)}
      >
        {enabled ? <FiCheck /> : <FiX />}
        {enabled ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  )
}
