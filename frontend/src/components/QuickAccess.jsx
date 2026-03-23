import React from 'react'
import './dashboard-components.css'

export default function QuickAccess({ actions = [] }) {
  return (
    <div className="dc-quick-grid">
      {actions.map((a, idx) => (
        <button key={idx} className={`dc-action-card ${a.className || ''}`} onClick={a.onClick}>
          <div className="dc-action-icon">{a.icon ? <a.icon.type {...a.icon.props} /> : null}</div>
          <div className="dc-action-body">
            <div className="dc-action-title">{a.title}</div>
            {a.subtitle && <div className="dc-action-sub">{a.subtitle}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}
