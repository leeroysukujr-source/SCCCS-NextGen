# Backend API Spec — Proposed Endpoints

This is an initial API surface to implement the new collaboration + classroom features.

Auth
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- GET /api/auth/me

Channels & Messages
- GET /api/channels
- POST /api/channels
- GET /api/channels/:id
- POST /api/channels/:id/messages
- GET /api/channels/:id/messages?cursor=&limit=
- PUT /api/messages/:id
- DELETE /api/messages/:id
- POST /api/messages/:id/reactions { emoji }
- GET /api/channels/:id/pins
- POST /api/channels/:id/pins { message_id }

Threads
- POST /api/channels/:channel_id/threads { parent_message_id }
- GET /api/threads/:thread_id/messages

Files
- POST /api/files/initiate (returns upload URL or upload session)
- POST /api/files/complete
- GET /api/files/:id

Meetings
- POST /api/rooms (create meeting)
- GET /api/rooms/:id
- POST /api/rooms/:id/schedule
- POST /api/rooms/:id/recordings/start
- POST /api/rooms/:id/recordings/stop
- GET /api/rooms/:id/participants

Classroom / Assignments
- POST /api/classes
- POST /api/classes/:id/assignments
- GET /api/assignments/:id
- POST /api/assignments/:id/submit
- POST /api/assignments/:id/grade

Admin & Audit
- GET /api/admin/usage
- GET /api/admin/audit?start=&end=

Jobs
- GET /api/jobs/:id (status for async tasks)

Notes
- All endpoints require JWT auth unless explicitly public.
- Long running tasks (recording export, transcript generation) should be queued (Redis/RQ, Celery, or Bull) and exposed via job endpoints.
