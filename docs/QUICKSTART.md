# SCCCS NextGen - Quick Start Guide

## Prerequisites

- **Node.js** v22+ (for frontend and Mediasoup server)
- **Python** 3.12+ (for backend)
- **npm** or **yarn** (Node.js package manager)
- **pip** (Python package manager)

## Installation Steps

### 1. Install All Dependencies

From the project root:

```bash
npm run install:all
```

Or manually:

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install

# Mediasoup Server
cd ../mediasoup-server
npm install
```

### 2. Configure Environment Variables

#### Backend (.env)
Create `backend/.env`:
```
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
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

#### Frontend (.env)
Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_MEDIASOUP_URL=http://localhost:4000
```

#### Mediasoup Server (.env)
Create `mediasoup-server/.env`:
```
PORT=4000
HOST=0.0.0.0
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
MEDIASOUP_NUM_WORKERS=1
```

### 3. Initialize Database

```bash
cd backend
python init_db.py
```

This creates:
- Default users (admin, teacher, student)
- Sample room, channel, and class

### 4. Start All Services

#### Option A: Run in Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python run.py
```
Backend runs on `http://localhost:5000`

**Terminal 2 - Mediasoup SFU Server:**
```bash
cd mediasoup-server
npm start
```
SFU runs on `http://localhost:4000`

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

#### Option B: Use npm scripts

From project root:
```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:sfu

# Terminal 3
npm run dev:frontend
```

## Default Login Credentials

After running `init_db.py`:

- **Admin**: `admin@example.com` / `password123`
- **Teacher**: `teacher@example.com` / `password123`
- **Student**: `student@example.com` / `password123`

## Access the Platform

1. Open browser: `http://localhost:5173`
2. Login with any of the default credentials above
3. Explore:
   - Dashboard: Create/join meetings
   - Chat: Channels and messaging
   - Classes: Google Classroom-style features
   - Profile: Update your information

## Features to Test

### Video Meetings
1. Go to Dashboard
2. Click "New Meeting" or enter a room code
3. Allow camera/microphone permissions
4. Test mute, video toggle, and screen sharing (placeholder)

### Chat & Channels
1. Navigate to Chat
2. Select a channel or create new one
3. Send messages, reply in threads
4. Real-time updates via WebSocket

### Classes & Lessons
1. Go to Classes
2. Create a class or join with code
3. Add lessons with content
4. View class members and materials

### AI Features
1. Use AI analyze/summarize in chat or lessons
2. Test offline AI (always available)
3. Test online AI (requires OPENAI_API_KEY)

## Troubleshooting

### Backend Issues
- Check Python version: `python --version` (should be 3.12+)
- Activate virtual environment before running
- Check if port 5000 is available
- Verify `.env` file exists in backend/

### Frontend Issues
- Check Node.js version: `node --version` (should be v22+)
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check if port 5173 is available
- Verify `.env` file exists in frontend/

### Mediasoup Issues
- Check if port 4000 is available
- Ensure UDP/TCP ports 40000-49999 are accessible
- Check `.env` configuration
- Verify Node.js version compatibility

### Database Issues
- Delete `backend/scccs.db` and run `init_db.py` again
- Check database permissions

## Development Notes

- Backend uses Flask-SocketIO for real-time features
- Frontend uses React Query for data fetching
- Mediasoup handles WebRTC video/audio streaming
- All services use CORS for cross-origin requests

## Next Steps

- Configure production environment variables
- Set up HTTPS/SSL certificates
- Configure proper database (PostgreSQL/MySQL)
- Set up reverse proxy (nginx)
- Deploy to production servers
