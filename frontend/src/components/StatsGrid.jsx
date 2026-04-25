import React from 'react'
import './dashboard-components.css'

export default function StatsGrid({ stats = [] }) {
  return (
    <div className="dc-stats-grid-container relative group/grid mb-8">
      {/* Animated Neon Border Beam for the entire grid */}
      <div className="absolute -inset-[2px] rounded-[22px] overflow-hidden pointer-events-none opacity-0 group-hover/grid:opacity-100 transition-opacity duration-1000">
        <div className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#6366f1_20%,transparent_40%,#ec4899_60%,transparent_80%)]"></div>
      </div>

      <div className="dc-stats-grid relative z-10 bg-[#02040a]/80 backdrop-blur-xl rounded-[20px] p-2 border border-white/5">
        {stats.map((s, i) => (
          <div key={i} className="dc-stat-card group/card">
            <div className="dc-stat-inner">
              <div className="flex items-center gap-4 mb-3">
                <div 
                  className="dc-stat-icon-wrapper" 
                  style={{ 
                    '--icon-color': s.iconColor || 'var(--primary)',
                    ...s.iconStyle 
                  }}
                >
                  <div className="dc-stat-icon-glow"></div>
                  <div className="dc-stat-icon-main">{s.icon}</div>
                </div>
                <div className="dc-stat-label-container">
                  <div className="dc-stat-label">{s.label}</div>
                  {s.trend && (
                    <div className={`dc-stat-trend ${s.trendVariant || ''}`}>
                      {s.trend}
                    </div>
                  )}
                </div>
              </div>
              <div className="dc-stat-value-row">
                <div className="dc-stat-value">{s.value}</div>
                <div className="dc-stat-progress-bar">
                  <div 
                    className="dc-stat-progress-fill" 
                    style={{ backgroundColor: s.iconColor || 'var(--primary)', width: '45%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
