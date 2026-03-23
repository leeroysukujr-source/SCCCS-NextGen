import React, { useState } from 'react'
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash, 
  FaDesktop,
  FaPhone,
  FaUsers,
  FaComments,
  FaEllipsisH,
  FaHandPaper,
  FaCircle,
  FaCog,
  FaGripHorizontal,
  FaBroadcastTower
} from 'react-icons/fa'
import './MeetingControlBar.css'

export default function MeetingControlBar({
  muted = false,
  onMuteToggle,
  videoOff = false,
  onVideoToggle,
  screenSharing = false,
  onScreenShare,
  onLeave,
  onChat,
  onParticipants,
  onSettings,
  onMoreMenu,
  recording = false,
  onRecordingToggle,
  handRaised = false,
  onHandRaise,
  chatActive = false,
  participantsActive = false,
  moreMenuOpen = false,
  layout = 'grid',
  onLayoutChange = () => {}
}) {
  const [hoveredBtn, setHoveredBtn] = useState(null)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)

  const buttons = [
    {
      id: 'mic',
      icon: muted ? <FaMicrophoneSlash /> : <FaMicrophone />,
      label: muted ? 'Unmute' : 'Mute',
      onClick: onMuteToggle,
      active: !muted,
      danger: muted,
      order: 1
    },
    {
      id: 'video',
      icon: videoOff ? <FaVideoSlash /> : <FaVideo />,
      label: videoOff ? 'Turn Camera On' : 'Turn Camera Off',
      onClick: onVideoToggle,
      active: !videoOff,
      danger: videoOff,
      order: 2
    },
    {
      id: 'screen',
      icon: <FaDisplay />,
      label: screenSharing ? 'Stop Sharing' : 'Share Screen',
      onClick: onScreenShare,
      active: screenSharing,
      success: screenSharing,
      order: 3
    },
    {
      id: 'record',
      icon: <FaCircle />,
      label: recording ? 'Stop Recording' : 'Start Recording',
      onClick: onRecordingToggle,
      active: recording,
      danger: recording,
      order: 4
    },
    {
      id: 'hand',
      icon: <FaHandPaper />,
      label: handRaised ? 'Lower Hand' : 'Raise Hand',
      onClick: onHandRaise,
      active: handRaised,
      warning: handRaised,
      order: 5
    },
    {
      id: 'chat',
      icon: <FaComments />,
      label: 'Chat',
      onClick: onChat,
      active: chatActive,
      order: 7
    },
    {
      id: 'participants',
      icon: <FaUsers />,
      label: 'Participants',
      onClick: onParticipants,
      active: participantsActive,
      order: 8
    },
    {
      id: 'settings',
      icon: <FaGear />,
      label: 'Settings',
      onClick: onSettings,
      order: 9
    },
    {
      id: 'more',
      icon: <FaEllipsis />,
      label: 'More Options',
      onClick: onMoreMenu,
      active: moreMenuOpen,
      order: 10
    }
  ]

  return (
    <div className="meeting-control-bar">
      {/* Primary Controls */}
      <div className="control-group primary">
        {buttons.slice(0, 5).map(btn => (
          <button
            key={btn.id}
            className={`control-btn ${btn.active ? 'active' : ''} ${btn.danger ? 'danger' : ''} ${btn.success ? 'success' : ''} ${btn.warning ? 'warning' : ''}`}
            onClick={btn.onClick}
            onMouseEnter={() => setHoveredBtn(btn.id)}
            onMouseLeave={() => setHoveredBtn(null)}
            title={btn.label}
            aria-label={btn.label}
          >
            {btn.icon}
            {hoveredBtn === btn.id && <div className="tooltip">{btn.label}</div>}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="control-divider"></div>

      {/* Secondary Controls */}
      <div className="control-group secondary">
        {buttons.slice(5, 9).map(btn => (
          <button
            key={btn.id}
            className={`control-btn ${btn.active ? 'active' : ''}`}
            onClick={btn.onClick}
            onMouseEnter={() => setHoveredBtn(btn.id)}
            onMouseLeave={() => setHoveredBtn(null)}
            title={btn.label}
            aria-label={btn.label}
          >
            {btn.icon}
            {hoveredBtn === btn.id && <div className="tooltip">{btn.label}</div>}
          </button>
        ))}
      </div>

        {/* Layout Button with Dropdown */}
        <div className="control-group layout-group" style={{ position: 'relative' }}>
          <button
            className={`control-btn ${layout ? 'active' : ''}`}
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            onMouseEnter={() => setHoveredBtn('layout')}
            onMouseLeave={() => setHoveredBtn(null)}
            title="Layout"
            aria-label="Layout"
            style={{ position: 'relative' }}
          >
            <FaGripHorizontal />
            {hoveredBtn === 'layout' && <div className="tooltip">Layout</div>}
          </button>

          {/* Layout Dropdown Menu */}
          {showLayoutMenu && (
            <div className="layout-menu">
              <button
                className={`layout-option ${layout === 'grid' ? 'active' : ''}`}
                onClick={() => {
                  onLayoutChange('grid')
                  setShowLayoutMenu(false)
                }}
                title="Grid Layout"
              >
                <FaGripHorizontal style={{ marginRight: '0.5rem' }} />
                Grid
              </button>
              <button
                className={`layout-option ${layout === 'speaker' ? 'active' : ''}`}
                onClick={() => {
                  onLayoutChange('speaker')
                  setShowLayoutMenu(false)
                }}
                title="Speaker Layout"
              >
                <FaBroadcastTower style={{ marginRight: '0.5rem' }} />
                Speaker
              </button>
              <button
                className={`layout-option ${layout === 'focus' ? 'active' : ''}`}
                onClick={() => {
                  onLayoutChange('focus')
                  setShowLayoutMenu(false)
                }}
                title="Focus Layout"
              >
                <FaDesktop style={{ marginRight: '0.5rem' }} />
                Focus
              </button>
            </div>
          )}
        </div>

      {/* Leave Button */}
      <div className="control-group leave">
        <button
          className="leave-btn"
          onClick={onLeave}
          onMouseEnter={() => setHoveredBtn('leave')}
          onMouseLeave={() => setHoveredBtn(null)}
          title="Leave Meeting"
          aria-label="Leave Meeting"
        >
          <FaPhone className="leave-icon" />
          <span className="leave-text">Leave</span>
          {hoveredBtn === 'leave' && <div className="tooltip">Leave Meeting</div>}
        </button>
      </div>
    </div>
  )
}
