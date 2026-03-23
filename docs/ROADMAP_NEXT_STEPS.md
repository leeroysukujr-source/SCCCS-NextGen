**Prioritized Next Steps & Modernization Roadmap**

This file captures recommended next work items and a suggested priority order for modernization.

1) Authentication & Security (Done)
   - 2FA/TOTP, token revocation, session management, audit logs
   - Encrypt TOTP secrets and support key rotation

2) Observability & Admin (High)
   - Admin analytics endpoints and dashboards (basic skeleton added)
   - Audit export, CSV reporting, activity dashboards
   - Metrics ingestion (Prometheus + Grafana)

3) Messaging & Realtime (High)
   - Extract messaging into a dedicated microservice (scaffold added)
   - Use Redis pub/sub (or Kafka) for cross-worker events
   - Add presence service and durable message store if required

4) Media (Video) Scaling (Medium)
   - Use SFU (mediasoup) with signaling in Socket.IO
   - Autoscale SFU workers and gateway

5) Frontend / UX (Medium)
   - Theming and UI improvements (basic theme toggle added)
   - Reduce bundle size and lazy-load large routes
   - Add accessibility audits and fixes

6) Testing & CI (High)
   - E2E tests for critical flows (GPA import/save, login/2FA)
   - Add unit tests for crypto helpers and migration scripts

7) Infrastructure & Deployment (High)
   - Harden KMS/Vault integration (secure key provisioning)
   - Add automated migrations and backup strategy
   - CI/CD for services and canary deploys

8) Long-term Architecture
   - Define bounded contexts and move services independently
   - Add cross-service API gateways and shared auth service

Notes:
- Use the repo's `services/messaging` scaffold as a starting point for a dedicated messaging service.
- Prioritize encrypting secrets and key rotation before enabling 2FA for many users.
