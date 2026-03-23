# SCCCS Complete Deployment Guide

## Status: ✅ PRODUCTION READY

All components have been tested and are ready for deployment. This guide covers local development setup, containerized deployment, and production hardening.

---

## Table of Contents

1. [Quick Start (Local Dev)](#quick-start-local-dev)
2. [Docker Deployment](#docker-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Smoke Tests & Verification](#smoke-tests--verification)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start (Local Dev)

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 15 (or SQLite for local dev)
- Redis 7 (optional, mediasoup falls back to in-memory adapter if unavailable)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python init_db.py  # Initialize database
python run.py      # Runs on http://127.0.0.1:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev        # Runs on http://127.0.0.1:5173 (Vite dev server)
```

### 3. Mediasoup Server Setup
```bash
cd mediasoup-server
npm install
npm start          # Runs on 0.0.0.0:4000
```

### 4. Verify Services
All services should be running. Use the provided smoke test:
```bash
cd backend
python tools/smoke_test.py
```

Expected output:
```
SMOKE TEST SUMMARY: 8/8 tests passed
```

---

## Docker Deployment

### Build Production Images
```bash
docker compose -f docker-compose.prod.yml build --pull
```

This builds:
- `scccs-backend:latest` - Flask API + Socket.IO
- `scccs-frontend:latest` - React SPA served by nginx
- `scccs-mediasoup-server:latest` - Mediasoup SFU
- Uses official images for PostgreSQL, Redis

### Run Production Stack
```bash
# Start all services (Postgres, Redis, mediasoup, backend, frontend)
docker compose -f docker-compose.prod.yml up -d

# Verify services are running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f backend

# Stop all services
docker compose -f docker-compose.prod.yml down
```

### Access Services
- Frontend: http://localhost/ (port 80)
- Backend API: http://localhost:5000/api/*
- WebSocket: ws://localhost/socket.io/ (proxied by nginx)

---

## Environment Configuration

### Backend Environment Variables
Create `.env` in `backend/` directory:

```bash
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-secure-secret-key-here-min-32-chars

# Database (if using Docker, use postgres:5432)
DATABASE_URL=postgresql://scccs:scccs_pass@localhost:5432/scccs_db

# Redis (optional, for scaling Socket.IO across workers)
REDIS_URL=redis://localhost:6379/0

# Socket.IO Message Queue (for multi-worker scaling)
SOCKET_MESSAGE_QUEUE=redis://localhost:6379/1

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://yourdomain.com

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key

# OAuth (if using GitHub, Google, etc.)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Storage (S3/MinIO)
S3_BUCKET=scccs-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_ENDPOINT_URL=http://minio:9000
```

### Frontend Environment Variables
Create `.env` in `frontend/` directory (for build-time):

```bash
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_MEDIASOUP_URL=ws://localhost:4000
```

### Mediasoup Environment Variables
Create `.env` in `mediasoup-server/` directory:

```bash
# Listening configuration
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=your.public.ip  # For production NAT traversal

# Worker configuration
MEDIASOUP_NUM_WORKERS=4  # Match CPU core count

# Redis (for scaling across multiple mediasoup instances)
REDIS_URL=redis://localhost:6379/0
```

---

## Smoke Tests & Verification

### Run Local Smoke Tests
```bash
cd backend
python tools/smoke_test.py
```

Verifies:
- ✓ Backend /health endpoint
- ✓ Backend /status endpoint  
- ✓ Rooms API endpoints
- ✓ Socket.IO connectivity
- ✓ Database connectivity
- ✓ Frontend build output

### Manual Testing
```bash
# Test backend health
curl http://127.0.0.1:5000/health

# Test rooms API
curl http://127.0.0.1:5000/api/rooms

# Test participant list (requires valid room_id)
curl http://127.0.0.1:5000/api/rooms/1/participants

# Test Socket.IO
curl http://127.0.0.1:5000/socket.io/?EIO=4&transport=polling
```

---

## Production Deployment

### Recommended Architecture
```
┌─────────────────────────────────────────┐
│         Internet / Users                 │
└──────────┬──────────────────────────────┘
           │ HTTPS (Letsencrypt)
┌──────────▼──────────────────────────────┐
│    Nginx Reverse Proxy                   │
│    (TLS Termination, Load Balancer)      │
└──────────┬──────────────────────────────┘
           │
  ┌────────┼────────┐
  │        │        │
  ▼        ▼        ▼
[API1]  [API2]  [API3]   (Multiple Backend Instances)
  │        │        │
  └────────┼────────┘
           │
  ┌────────┴─────────┐
  │                  │
  ▼                  ▼
[PostgreSQL]   [Redis Cluster]
(Managed RDS)  (Managed ElastiCache)
```

### Kubernetes Deployment
See `docker-compose.prod.yml` for container configuration. For Kubernetes:

1. Build images and push to registry:
```bash
docker build -f backend/Dockerfile -t your-registry/scccs-backend:latest backend/
docker build -f frontend/Dockerfile -t your-registry/scccs-frontend:latest frontend/
docker build -f mediasoup-server/Dockerfile -t your-registry/scccs-mediasoup:latest mediasoup-server/

docker push your-registry/scccs-backend:latest
docker push your-registry/scccs-frontend:latest
docker push your-registry/scccs-mediasoup:latest
```

2. Create Kubernetes manifests for Deployment, Service, Ingress (can be generated from docker-compose.prod.yml using `kompose`)

### Cloud Platform Deployments

#### AWS (Elastic Container Service / ECS)
- Push images to ECR
- Create ECS task definitions from docker-compose
- Use Application Load Balancer (ALB) for TLS termination
- Use RDS for PostgreSQL (managed)
- Use ElastiCache for Redis (managed)

#### Google Cloud (Cloud Run / GKE)
- Push images to Artifact Registry
- Deploy backend service to Cloud Run (requires stateless design)
- Use Cloud SQL for PostgreSQL
- Use Memorystore for Redis

#### Azure (Container Instances / App Service)
- Push images to Azure Container Registry (ACR)
- Deploy to Azure Container Instances or App Service
- Use Azure Database for PostgreSQL
- Use Azure Cache for Redis

### Security Hardening
```bash
# 1. Set strong SECRET_KEY
export SECRET_KEY=$(openssl rand -hex 32)

# 2. Use environment variables for all secrets (NEVER commit .env to git)
# 3. Enable HTTPS/TLS (nginx + Letsencrypt)
# 4. Configure CORS properly (don't use * in production)
# 5. Set up firewall rules (only allow necessary ports)
# 6. Regular backups of PostgreSQL
# 7. Monitor logs and set up alerts
# 8. Rate limit API endpoints (already configured with Flask-Limiter)
# 9. Use VPN/private networks for inter-service communication
# 10. Rotate JWT secrets periodically
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
python run.py

# Verify database connection
python -c "from app import db, create_app; app = create_app(); app.app_context().push(); db.session.execute('SELECT 1')"

# Verify all dependencies installed
pip install -r requirements.txt

# Clear and reinitialize database
rm instance/scccs.db  # If using SQLite
python init_db.py
```

### Frontend won't load
```bash
# Check if dev server is running
npm run dev

# Verify VITE_API_URL points to correct backend
cat frontend/.env

# Clear cache and rebuild
npm run build

# Check for port conflicts
lsof -i :5173  # macOS/Linux
netstat -a -n | findstr ":5173"  # Windows
```

### Socket.IO connection fails
```bash
# Check backend is accepting socket connections
curl http://127.0.0.1:5000/socket.io/?EIO=4&transport=polling

# Verify CORS is configured
curl -H "Origin: http://localhost:5173" http://127.0.0.1:5000/health -v

# Check for firewall blocking port 5000
```

### Mediasoup connection fails
```bash
# Verify mediasoup server is running
ps aux | grep node
lsof -i :4000

# Check for port conflicts
# Restart mediasoup server
npm start

# For production, configure TURN/STUN servers for NAT traversal
```

### Database queries slow
```bash
# Check database indexes
psql -c "\d messages"

# Analyze query performance
EXPLAIN ANALYZE SELECT ...

# Consider adding indexes for frequently queried columns
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
```

---

## Key Files & Configurations

- `docker-compose.prod.yml` - Production stack definition
- `backend/Dockerfile` - Backend container image
- `frontend/Dockerfile` - Frontend container image
- `mediasoup-server/Dockerfile` - Mediasoup container image
- `frontend/nginx.conf` - Nginx configuration (API & Socket.IO proxy)
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node dependencies
- `backend/.env.example` - Environment template

---

## Support & Documentation

- **Backend API Docs**: http://localhost:5000/api/docs
- **Frontend Structure**: `frontend/src/pages/` contains React components
- **Socket.IO Events**: `backend/app/socketio_events.py`
- **Database Models**: `backend/app/models.py`

---

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Database backup strategy in place
- [ ] TLS certificates obtained (Letsencrypt)
- [ ] Reverse proxy (nginx/ALB) configured
- [ ] Logs aggregated and monitored
- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring enabled
- [ ] Database backups automated
- [ ] Security scanning on images
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested

---

**Last Updated**: December 3, 2025  
**Version**: 1.0 - Production Ready  
**Status**: ✅ All Systems Operational
