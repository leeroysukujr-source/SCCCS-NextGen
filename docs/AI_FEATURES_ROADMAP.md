# AI Features Roadmap & Cross-Platform Integration

Date: December 8, 2025
Version: 0.1 (roadmap)

Purpose
- Define a prioritized roadmap of AI features to make the meeting system competitive.
- Provide an initial scaffold and prototype for cross-platform integration (web, Electron, iOS, Android).

Principles
- Privacy-first: Transcripts and user data must be stored only when consented and must be configurable per deployment.
- Modular microservice architecture: AI features run as separate services that the meeting server calls (REST/gRPC/webhooks).
- Pluggable model providers: Support local models (huggingface), managed APIs (OpenAI, Azure, Anthropic), and on-prem inference.
- Cross-platform SDKs: Provide thin clients for Web (JS), Electron (same JS), iOS (Swift), Android (Kotlin) that call the central AI microservice.

MVP (short-term, highest value)
1. Meeting Summarization (post-meeting and live draft)
2. Live Captions & Speaker Diarization (per participant captions)
3. Noise suppression enhancements via adaptive filters (server-assisted)
4. Quick highlights (auto detection of important moments)
5. Meeting action-item extraction (todo list generation)

Phase 2 (mid-term)
1. Sentiment & engagement analytics (post-meeting)
2. Automated moderator (detect toxic language, spam)
3. Voice-level translation (live or post-meeting)
4. Auto-recording chaptering + searchable transcripts
5. Adaptive bitrate and audio quality profiler (AI hints)

Phase 3 (long-term / differentiators)
1. Real-time assistant (voice or chat) answering questions about the meeting
2. AI-driven automatic scheduling & follow-ups (integrations with calendars)
3. Multi-modal context enrichment (slides + chat + audio fused)
4. On-device (mobile) lightweight models for low-latency features

Cross-Platform Integration Strategy
- Web: standard REST/WS to AI microservice; provide `frontend/src/utils/aiClient.js` as lightweight wrapper.
- Electron: reuse web wrappers; add native file access for recordings.
- Mobile (iOS/Android): small SDK that calls the same REST endpoints; provide gRPC options for efficiency.
- Webhooks & Connectors: Outgoing webhooks for downstream systems (Slack, Teams), and connectors for calendar/email.

API Contracts (Example MVP)
- POST /api/ai/summarize
  - body: { meeting_id: string, transcript?: string, mode: "post" | "live", brief?: boolean }
  - returns: { meeting_id, summary_text, highlights: [{start, end, text}], metrics }

- POST /api/ai/caption (WebSocket preferred for real-time)
  - stream: audio chunks or interim transcripts
  - returns: caption objects { participant_id, text, start, end }

Security and Privacy
- All AI endpoints must support:
  - Request-level `consent` flag
  - Per-tenant API keys and rate limits
  - Option to disable cloud provider usage (on-prem only)

Operational Notes
- Provide a monitoring dashboard for AI latency, error rates, and cost
- Add telemetry (sampled) and quota enforcement to avoid runaway costs

Developer Prototype (what we'll scaffold now)
- FastAPI service with `/api/ai/summarize` endpoint (placeholder summarization).
- Frontend utility `aiClient.js` and a small `AISummaryButton` React component.
- `backend/requirements-ai.txt` listing minimal dependencies (FastAPI, uvicorn).  

Next steps (if you want me to implement now)
- Implement a server prototype and run locally.
- Wire up the frontend button to call the endpoint.
- Add tests and a demo transcript to verify summarization.

