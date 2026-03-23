This repository contains a full-stack application (frontend, backend, mediasoup server).

This file describes how to run the stack locally using Docker / docker-compose (production-like):

Prerequisites
- Docker Engine and Docker Compose installed on the host
- Ensure ports 80, 4000, 5000, 5432, and 6379 are available

Build & Run (production compose)
```powershell
# From repo root
docker compose -f docker-compose.prod.yml build --pull
docker compose -f docker-compose.prod.yml up -d
```

Important environment variables
- `SECRET_KEY` in the `backend` service should be set to a secure value for production
- Use a managed Postgres/Redis in production instead of local containers
- If you're behind a proxy or load balancer, ensure socket.io traffic can upgrade to WebSocket

Notes
- Frontend is served by nginx at port 80 and proxies API `/api` to the `backend` service.
- The mediasoup server runs on port 4000 and is exposed for WebRTC connections; you must configure TURN/STUN for public deployments.
- This setup is intended for simple local or staging deployments. For production, consider:
  - TLS termination (nginx/letsencrypt or load balancer)
  - Use a process manager / orchestrator like Kubernetes
  - Secure environment variables using a secret manager

Troubleshooting
- If the backend fails on startup due to DB migrations, run:
```powershell
# enter backend container
docker compose -f docker-compose.prod.yml exec backend /bin/sh
# inside container
python init_db.py
```

Contact
- Provide these files to your platform operator or run locally with Docker to verify.
