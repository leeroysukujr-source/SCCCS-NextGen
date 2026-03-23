import React from 'react'
import './FeatureOverview.css'

export default function FeatureOverview() {
  return (
    <div className="feature-overview">
      <header className="feature-header">
        <h1>Product Vision — Unified Classroom & Collaboration</h1>
        <p className="lead">Roadmap and feature scaffolds to evolve chat + meetings into a modern collaboration platform.</p>
      </header>

      <section className="feature-grid">
        <div className="card">
          <h3>Channels & Threads</h3>
          <p>Threaded conversations, reactions, message pins, and searchable history.</p>
        </div>
        <div className="card">
          <h3>Files & Assignments</h3>
          <p>Robust file sharing, resumable uploads and classroom assignments with submissions.</p>
        </div>
        <div className="card">
          <h3>Meetings</h3>
          <p>Recording, breakout rooms, captions, and calendar scheduling.</p>
        </div>
        <div className="card">
          <h3>Admin & Security</h3>
          <p>SSO, roles, audit logs, and admin dashboards for usage and compliance.</p>
        </div>
      </section>

      <section className="next-steps">
        <h2>Next Steps</h2>
        <ol>
          <li>Implement Redis adapter and message ACKs for Socket.IO</li>
          <li>Scaffold DB schema for threads, reactions, files, assignments</li>
          <li>Create E2E smoke tests for chat + meeting flows</li>
        </ol>
      </section>
    </div>
  )
}
