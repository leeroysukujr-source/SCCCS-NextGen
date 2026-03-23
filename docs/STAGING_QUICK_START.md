# 🚀 Staging Deployment Quick Start

## ⚡ One-Command Start (Choose One)

### Start AI Service + Frontend (Docker)
```powershell
docker-compose -f docker-compose.ai.yml up -d
```

### Start AI Service Only (Python)
```powershell
cd backend/ai
python -m uvicorn ai_service:app --host 0.0.0.0 --port 8001
```

### Start Everything (Full Stack)
```powershell
docker-compose up -d
```

---

## 🔍 Verification Commands

### Check AI Service Status
```powershell
# Health check
curl http://localhost:8001/health

# View API docs
Start-Process "http://localhost:8001/docs"
```

### Check Docker Status
```powershell
docker ps
docker logs -f ai-features-service
```

### Test API Integration
```powershell
cd backend/ai
python test_post.py
```

---

## 📦 What's Deployed

✅ **AI Microservice** (Port 8001)
- FastAPI application
- OpenAI integration (optional)
- Rate limiting enabled
- CORS configured

✅ **Frontend** (Port 80/3000)
- React + Vite build
- Production optimized
- Proxies to backend

✅ **Docker Infrastructure**
- Nginx reverse proxy
- Environment isolation
- Easy scaling

---

## 🛑 Stop Services

```powershell
# Stop Docker
docker-compose -f docker-compose.ai.yml down

# Or stop all
docker-compose down
```

---

## 📝 Configuration

### Optional: Set OpenAI Key
```powershell
$env:OPENAI_API_KEY='sk-your-key-here'
```

### View/Edit Configuration
```powershell
# AI Service config
Get-Content backend/ai/.env

# Docker compose
Get-Content docker-compose.ai.yml

# Frontend config
Get-Content frontend/vite.config.js
```

---

## 🔗 Key URLs (When Running)

| Service | URL |
|---------|-----|
| AI Service | http://localhost:8001 |
| API Docs | http://localhost:8001/docs |
| Frontend | http://localhost:3000 or http://localhost |
| Health Check | http://localhost:8001/health |

---

## 📊 Service Architecture

```
┌─────────────┐
│  Frontend   │
│ (React App) │
└──────┬──────┘
       │ (port 3000/80)
       ↓
┌──────────────────────┐
│  Nginx Proxy         │
│  (Reverse Proxy)     │
└──────────┬───────────┘
           │ (port 8001)
           ↓
┌──────────────────────┐
│  AI Service          │
│  (FastAPI)           │
│  - OpenAI (opt)      │
│  - Rate Limiting     │
│  - CORS Config       │
└──────────────────────┘
```

---

## ✨ Features Ready

- ✅ AI Text Summarization
- ✅ Chat Integration
- ✅ Real-time WebSocket Support
- ✅ Rate Limiting
- ✅ Security Headers
- ✅ API Documentation
- ✅ Health Monitoring
- ✅ Docker Deployment

---

## 🚨 Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| Port 8001 in use | `docker ps` → stop conflicting container |
| npm not found | Already fixed in setup.py |
| Frontend not building | `cd frontend && npm install && npm run build` |
| Docker not running | Start Docker Desktop (Windows) |
| CORS errors | Check CORS_ORIGINS in .env |

---

## 📞 Support

For detailed information, see: `STAGING_DEPLOYMENT_STATUS.md`
