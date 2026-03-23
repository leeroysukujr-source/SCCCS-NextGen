import React from 'react'
import './dashboard-components.css'

export default function DashboardCard({ title, subtitle, icon: Icon, children, onClick, className = '' }) {
  return (
    <div className={`dc-card ${className}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="dc-card-header">
        {Icon && (
          <div className="dc-card-icon">
            <Icon />
          </div>
        )}
        <div className="dc-card-title">
          <div className="dc-title">{title}</div>
          {subtitle && <div className="dc-subtitle">{subtitle}</div>}
        </div>
      </div>
      {children && <div className="dc-card-body">{children}</div>}
    </div>
  )
}
