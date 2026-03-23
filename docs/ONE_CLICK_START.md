# SCCCS Production System - Quick Start Guide

## 🚀 One-Click Startup

### Option 1: Double-Click (Easiest)
1. Open File Explorer
2. Navigate to `C:\Users\PC\Desktop\dd`
3. **Double-click** `START_SYSTEM.bat`
4. Wait for the system to boot and health checks to complete

### Option 2: PowerShell
```powershell
cd C:\Users\PC\Desktop\dd
.\START_SYSTEM.ps1
```

### Option 3: Command Line
```cmd
cd C:\Users\PC\Desktop\dd
START_SYSTEM.bat
```

---

## 🛑 One-Click Shutdown

### Option 1: Double-Click
1. Open File Explorer
2. Navigate to `C:\Users\PC\Desktop\dd`
3. **Double-click** `STOP_SYSTEM.bat`

### Option 2: PowerShell
```powershell
cd C:\Users\PC\Desktop\dd
.\STOP_SYSTEM.ps1
```

### Option 3: Docker Command
```powershell
cd C:\Users\PC\Desktop\dd
docker compose -f docker-compose.prod.yml down
```

---

## 📱 Access Your Services

Once the system is running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost | React web application |
| **Backend API** | http://localhost:5000 | Flask API endpoints |
| **Socket.IO** | http://localhost:5000/socket.io/ | Real-time communications |
| **Mediasoup** | localhost:4000 | Video/media server |
| **Database** | localhost:5432 | PostgreSQL (internal) |
| **Redis Cache** | localhost:6379 | Cache server (internal) |

---

## ✅ Health Checks

The startup script automatically runs 8 smoke tests:
- Backend health endpoints
- Rooms API functionality
- Socket.IO connectivity
- Mediasoup SFU server
- Database connectivity
- Frontend build output

All tests passing = ✓ System is healthy

---

## 🐳 Docker Services

All services run in Docker containers. To check manually:

```powershell
# Show container status
docker compose -f docker-compose.prod.yml ps

# View logs for a service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f mediasoup-server

# Restart a service
docker compose -f docker-compose.prod.yml restart backend
```

---

## 📊 Services Running

- **Frontend**: React + Vite on nginx (port 80)
- **Backend**: Flask + Socket.IO + eventlet (port 5000)
- **Mediasoup**: Node.js SFU server (port 4000)
- **PostgreSQL**: Database (port 5432, internal only)
- **Redis**: Cache layer (port 6379, internal only)

---

## 🔧 Advanced Commands

```powershell
# Build images (if you make code changes)
docker compose -f docker-compose.prod.yml build

# Build and restart
docker compose -f docker-compose.prod.yml up -d --build

# View recent logs
docker compose -f docker-compose.prod.yml logs --tail 200

# Remove all volumes (WARNING: deletes data)
docker compose -f docker-compose.prod.yml down -v

# View resource usage
docker stats
```

---

## 📝 Configuration

### Environment Variables
Edit `docker-compose.prod.yml` to change:
- Database credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`)
- Flask environment (`FLASK_ENV`, `SECRET_KEY`)
- Mediasoup settings

### Ports
All ports can be customized in `docker-compose.prod.yml`:
- Frontend: `80:80` (change first number to use different host port)
- Backend: `5000:5000`
- Mediasoup: `4000:4000`

---

## 🆘 Troubleshooting

### Services won't start
1. Ensure Docker Desktop is running
2. Check Docker is in PATH: `docker --version`
3. Try restarting Docker Desktop

### Port conflicts
- Check if another service is using ports 80, 5000, 4000, 5432
- Modify `docker-compose.prod.yml` to use different ports

### Can't connect to services
1. Run smoke tests to diagnose: `python .\backend\tools\smoke_test.py`
2. Check container logs: `docker compose logs [service-name]`
3. Ensure containers are running: `docker compose ps`

### Database errors
1. Check PostgreSQL is running: `docker compose ps postgres`
2. Verify credentials in `docker-compose.prod.yml`
3. Check backend logs: `docker compose logs backend`

---

## 📚 Documentation

- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `STATUS_SUMMARY.md` - System status and capabilities
- `QUICK_REFERENCE.md` - Common commands and troubleshooting
- `docker-compose.prod.yml` - Full service configuration

---

## ✨ That's It!

**Your production system is ready to use.** Just:
1. Double-click `START_SYSTEM.bat` to start
2. Access http://localhost in your browser
3. Double-click `STOP_SYSTEM.bat` when done

No complex commands needed!
