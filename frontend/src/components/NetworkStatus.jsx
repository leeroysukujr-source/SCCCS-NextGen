import React from 'react'
import { useNetworkStore } from '../store/networkStore'
import './NetworkStatus.css'

export default function NetworkStatus() {
  const apiUrl = useNetworkStore((s) => s.apiUrl)
  const transport = useNetworkStore((s) => s.socketTransport)

  return (
    <div className="network-status" title={`API: ${apiUrl || 'unknown'} • Transport: ${transport || 'unknown'}`}>
      <div className="network-status-item">
        <strong>API:</strong>
        <span className="network-value">{apiUrl || '—'}</span>
      </div>
      <div className="network-status-item">
        <strong>Socket:</strong>
        <span className={`network-transport ${transport || 'unknown'}`}>{transport || '—'}</span>
      </div>
    </div>
  )
}
