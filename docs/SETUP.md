# SCCCS NextGen - Complete Setup Guide

This document provides step-by-step instructions for setting up the complete SCCCS NextGen system.

## System Architecture

```
┌─────────────────┐
│   Frontend      │  React + Vite (Port 5173)
│   (React)       │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐  ┌─────▼──────────┐
│   Backend       │  │  Mediasoup SFU │
│   (Flask)       │  │  (Node.js)     │
│   Port 5000     │  │  Port 4000     │
└─────────────────┘  └────────────────┘
```

## Step 1: Install Prerequisites

### Windows
1. Install Python 3.12+ from [python.org](https://www.python.org/)
2. Install Node.js v22+ from [nodejs.org](https://nodejs.org/)
3. Verify installations:
   ```powershell
   python --version  # Should be 3.12+
   node --version    # Should be v22+
   npm --version
   ```

### Linux/macOS
```bash
# Python 3.12+
sudo apt-get update
sudo apt-get install python3.12 python3-pip

# Node.js v22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
python3 --version
node --version
```

## Step 2: Clone and Setup Project

```bash
# Navigate to project directory
cd scccs-nextgen

# Install all dependencies
npm run install:all
```

## Step 3: Configure Environment

### Backend Configuration

Create `backend/.env`:
```bash
cd backend
cp .env.example .env  # If .env.example exists, or create manually
```

Edit `backend/.env`:
```env
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production

DATABASE_URL=sqlite:///scccs.db

CORS_ORIGINS=http://localhost:5173

OPENAI_API_KEY=your-openai-api-key-optional
AI_MODE=hybrid
OFFLINE_AI_ENABLED=true
ONLINE_AI_ENABLED=true

MEDIASOUP_HOST=localhost
MEDIASOUP_PORT=4000

SERVER_HOST=0.0.0.0
SERVER_PORT=5000
```

### Frontend Configuration

Create `frontend/.env`:
```bash
cd frontend
cp .env.example .env  # If .env.example exists, or create manually
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_MEDIASOUP_URL=http://localhost:4000
```

### Mediasoup Server Configuration

Create `mediasoup-server/.env`:
```bash
cd mediasoup-server
cp .env.example .env  # If .env.example exists, or create manually
```

Edit `mediasoup-server/.env`:
```env
PORT=4000
HOST=0.0.0.0
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
MEDIASOUP_NUM_WORKERS=1
```

**Important**: For LAN access, change `MEDIASOUP_ANNOUNCED_IP` to your machine's LAN IP address.

## Step 4: Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database with sample data
python init_db.py
```

Expected output:
```
============================================================
Database initialized with sample data:
============================================================

Default Users:
  Admin:   admin@example.com / password123
  Teacher: teacher@example.com / password123
  Student: student@example.com / password123

Sample data created:
  - 1 Meeting Room (sample room)
  - 1 Channel (general)
  - 1 Class (Introduction to Computer Science)
============================================================
```

## Step 5: Start All Services

### Option A: Separate Terminals (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python run.py
```

**Terminal 2 - Mediasoup SFU:**
```bash
cd mediasoup-server
npm start
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option B: Background Processes

**Windows (PowerShell):**
```powershell
# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; python run.py"

# Mediasoup
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd mediasoup-server; npm start"

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
```

**Linux/macOS:**
```bash
# Backend
cd backend && source venv/bin/activate && python run.py &

# Mediasoup
cd mediasoup-server && npm start &

# Frontend
cd frontend && npm run dev &
```

## Step 6: Verify Installation

1. **Check Backend**: Open http://localhost:5000
   - Should see Flask response or 404 (which is normal)

2. **Check Mediasoup**: Open http://localhost:4000/health
   - Should see: `{"status":"ok","rooms":0}`

3. **Check Frontend**: Open http://localhost:5173
   - Should see login page

4. **Login**: Use credentials:
   - Username: `admin` (or `admin@example.com`)
   - Password: `password123`

## Step 7: Test Features

### Video Meeting
1. Navigate to Dashboard
2. Click "New Meeting"
3. Allow camera/microphone permissions
4. Test mute, video toggle

### Chat
1. Navigate to Chat
2. Select "general" channel
3. Send a test message
4. Verify real-time updates

### Classes
1. Navigate to Classes
2. Open "Introduction to Computer Science"
3. Create a new lesson
4. View class members

### AI Features
1. In chat or lessons, use AI analyze feature
2. Test offline AI (always available)
3. Test online AI (requires OpenAI API key)

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
# Windows:
netstat -ano | findstr :5000
netstat -ano | findstr :4000
netstat -ano | findstr :5173

# Linux/macOS:
lsof -i :5000
lsof -i :4000
lsof -i :5173

# Kill process (replace PID with actual process ID)
# Windows:
taskkill /PID <PID> /F

# Linux/macOS:
kill -9 <PID>
```

### Database Errors
```bash
cd backend
# Delete database and reinitialize
rm scccs.db  # Linux/macOS
del scccs.db  # Windows
python init_db.py
```

### Module Not Found Errors
```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Mediasoup
cd mediasoup-server
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
- Verify `CORS_ORIGINS` in `backend/.env` includes frontend URL
- Check that all services are running
- Clear browser cache

### WebSocket Connection Failed
- Verify `VITE_WS_URL` in `frontend/.env`
- Check backend SocketIO is running
- Check firewall settings

### Video/Audio Not Working
- Check browser permissions for camera/microphone
- Verify HTTPS for production (required for media)
- Check Mediasoup server is running
- Verify `VITE_MEDIASOUP_URL` is correct

## Next Steps

- Read [QUICKSTART.md](QUICKSTART.md) for quick reference
- Read [DEPLOY.md](DEPLOY.md) for production deployment
- Customize UI theme in `frontend/src/index.css`
- Add more features as needed

## Support

For issues or questions:
1. Check existing documentation
2. Review error logs in terminal
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
