# Enhanced Product Roadmap — Unified Collaboration & Classroom Platform

Goal: Transform the existing chat + meeting app into a polished, production-ready collaboration platform combining the best ideas from Slack, Google Classroom, Google Meet, and Microsoft Teams, while adding unique features tailored for teaching and enterprise workflows.

Phases

Phase 0 — Foundations (0–2 weeks)
- Stabilize realtime stack: single socket per session, Redis adapter, message ACKs, durable delivery, reconnection strategy.
- Mediasoup hardening: stable transport lifecycles, consumer stream persistence, server-side engine.io logging.
- UX fixes: repair CSS, consistent modal/dialog components, responsive behavior.
- Deliverables: Stability alpha, smoke tests, updated docs.

Phase 1 — Core Collaboration (2–6 weeks)
- Channels & threads: threaded replies, persistent message threads.
- Reactions and rich messages: emojis, edits, deletes, message pins.
- File sharing & previews: attachments, image previews, inline documents (PDF thumbnails).
- Presence & typing indicators.
- Search across messages and files.
- Deliverables: Channel threads, reactions, file uploads (S3/local), search index.

Phase 2 — Meetings & Conferencing (3–8 weeks)
- Scheduling + calendar integration (Google/Outlook OAuth connectors).
- Recording & cloud storage with timestamps and per-user download.
- Breakout rooms, hand-raise, host controls, recording indicators.
- Live captions (browser-based or third-party STT integration), live transcription.
- Bandwidth adaptation (simulcast, quality selection), screenshare improvements.
- Deliverables: Scheduling UI, recording pipeline, breakout rooms, captions.

Phase 3 — Classroom Features (3–6 weeks)
- Assignments: create, submit, grade, attachments, due dates.
- Announcements and class materials (folders).
- Attendance tracking and gradebook exports.
- Student/teacher roles and permissions; class roster sync via CSV/OAuth.
- Deliverables: Assignment flow, gradebook UI, exportable CSV reports.

Phase 4 — Enterprise & Admin (2–6 weeks)
- Admin dashboards: usage metrics, active rooms, audit logs.
- SSO (SAML/OAuth), role-based access, MFA support.
- Data retention, compliance controls, and export tools.
- Scalable deployment: containerization, Redis, clustered mediasoup, monitoring (Prometheus/Grafana).
- Deliverables: Admin dashboard, SSO integration guides, sample k8s manifests.

Phase 5 — Polish & Unique Features (ongoing)
- AI-assisted features: smart meeting summaries, message triage, auto-transcript highlights.
- Adaptive UI: focus modes for classes vs. meetings, whiteboard integration.
- Rich integrations marketplace (LMS connectors, file providers).

Acceptance criteria
- Automated smoke tests pass for chat, meeting, join/leave flows.
- No repeated 400 WebSocket errors in normal conditions.
- Media production/consumption stable across reconnects.
- Core classroom flows (create assignment, submit, grade) work end-to-end.


Roadmap Notes
- Prioritize stability first; feature speed without stability leads to poor UX.
- Incrementally build: each phase should ship a small, testable subset and be validated with E2E tests.
- Keep components modular to allow swapping third-party providers (STT, storage).

Next actions (immediate)
1. Implement Redis adapter for Socket.IO and add message ACK support.
2. Add backend API specs for threads, reactions, files, assignments.
3. Scaffold frontend feature overview and modular UI components for modals and invites.
4. Add E2E smoke tests (headless browser) for core flows.

Contact and ownership
- Proposed owner: core-team (backend + frontend leads).
- Suggested cadence: 2-week sprints with a weekly deploy to a staging environment.
