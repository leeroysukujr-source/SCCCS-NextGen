import React from 'react'
import './dashboard-components.css'

export default function StatsGrid({ stats = [] }) {
  return (
    <div className="dc-stats-grid">
      {stats.map((s, i) => (
        <div key={i} className="dc-stat-card">
          <div className="dc-stat-icon" style={s.iconStyle}>{s.icon}</div>
          <div className="dc-stat-info">
            <div className="dc-stat-value">{s.value}</div>
            <div className="dc-stat-label">{s.label}</div>
          </div>
          {s.trend && <div className="dc-stat-trend">{s.trend}</div>}
        </div>
      ))}
    </div>
  )
}
