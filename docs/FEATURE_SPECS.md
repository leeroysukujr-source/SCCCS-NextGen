# Feature Specifications — High-level

This document captures concrete specs for the initial feature set to bring Slack/Meet/Classroom-like functionality.

1) Messaging Enhancements
- Threads
  - UI: inline threaded view; a thread opens as a right-side panel.
  - API: POST /api/channels/:channel_id/threads, GET thread messages, replies linked to parent message id.
  - DB: `threads` table with parent_message_id, channel_id, created_by, locked, pinned.

- Reactions
  - UI: hover on message -> reaction picker; reaction counts shown inline.
  - API: POST /api/messages/:id/reactions
  - DB: `message_reactions` (message_id, user_id, emoji)

- Edits / Deletes
  - Support edit history (last N edits) and soft-delete with audit logs.

- Pins & Bookmarks
  - Pin messages to channel; channel-level pin list via GET /api/channels/:id/pins

2) Files
- Uploads via chunked uploads (resumable) to S3 (or local fallback).
- Preview: images, PDFs, audio playback inline.
- Permissions: file owner, channel visibility.

3) Presence & Search
- Presence: online/away/idle with last active timestamp.
- Search: full-text index (Postgres tsvector or Elastic), search across channels and files.

4) Meeting / Mediasoup Improvements
- Scheduling: store meeting metadata, invite link, recurring rules.
- Recording: server-side orchestration to store WebM/MP4; provide timestamps and transcript attachment.
- Breakout rooms: server-managed sub-rooms with their own mediasoup routers or logical room separation.
- Captions: webhook to STT provider; store transcript lines with time offset.

5) Classroom
- Assignments: create/assign/submit/grade with statuses and comments.
- Materials: file folders per class with versioning.
- Attendance: auto-check based on meeting join events; UI to mark excused/absent.

6) Admin / Security
- Audit logs: who did what, exportable by date range.
- Role management: channel roles (admin, moderator, member, read-only).
- SSO/OAuth: Google, Microsoft; implement token exchange and domain-based auto-provisioning.

7) Integrations
- Calendar: OAuth connectors for Google/Outlook for scheduling.
- LMS: Basic LTI or CSV sync for class rosters.


API Design Notes
- Use RESTful endpoints with JSON; protect with JWT session tokens for API and Socket.IO auth.
- For long-running operations (recording export), return a job id and provide GET /api/jobs/:id status.

DB Schema Notes (high-level)
- messages(id, channel_id, user_id, content, metadata, created_at, edited_at)
- threads(id, parent_message_id, channel_id, created_by, created_at)
- message_reactions(message_id, user_id, emoji)
- files(id, owner_id, storage_key, mime, size, created_at)
- assignments(id, title, description, due_date, created_by, class_id)
- submissions(id, assignment_id, user_id, file_id, status, grade, feedback)


UX/Accessibility
- Keyboard navigation for threads and messages.
- ARIA labels on modal dialogs and message controls.
- Color contrast check and adjustable font sizes for classrooms.


Telemetry & Monitoring
- Track latency for critical flows: socket handshake, transport creation, produce/consume time.
- Expose Prometheus metrics from backend and mediasoup-worker.


Deployment Considerations
- Use Redis for Socket.IO adapter in production.
- Run multiple mediasoup workers per host (configurable via env). Use load-balancer for signaling.
- Provide sample Docker Compose and Kubernetes manifests in `DEPLOY.md` (later task).
