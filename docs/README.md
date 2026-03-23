# SCCCS NextGen System

A comprehensive educational collaboration platform integrating features from Zoom, Google Classroom, Slack, and Microsoft Teams.

> **✅ PRODUCTION READY** | All systems tested and verified | See [SYSTEM_COMPLETE.md](SYSTEM_COMPLETE.md) for full status

## Features

- **Multi-user Video/Audio Meetings** (Zoom-like) with screen sharing support
- **Real-time Chat & Messaging** (Slack/Teams-like) with channels, threads, and DMs
- **Class & Lesson Management** (Google Classroom-like) with assignments and materials
- **AI Integration** (Offline & Online) for assisted learning and analysis
- **Team Collaboration** with file sharing, notifications, and collaborative tools
- **Role-based Access Control** (Admin, Teacher, Student)
- **Secure Authentication** with JWT tokens

## Architecture

- **Backend**: Python/Flask with SQLAlchemy, Flask-SocketIO
- **Frontend**: React + Vite with Mediasoup-client
- **SFU Server**: Node.js Mediasoup server for video/audio streaming

## Prerequisites

- Node.js v22+
- Python 3.12+
- npm or yarn
- pip

## Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python run.py
```

Backend runs on `http://localhost:5000`

### 2. Mediasoup SFU Server Setup

```bash
cd mediasoup-server
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

SFU Server runs on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Frontend runs on `http://localhost:5173`

## Environment Configuration

### Backend (.env)

```
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///scccs.db
JWT_SECRET_KEY=your-jwt-secret-key
MEDIASOUP_HOST=localhost
MEDIASOUP_PORT=3001
AI_OFFLINE_ENABLED=true
AI_ONLINE_API_KEY=your-online-ai-api-key
```

### Mediasoup Server (.env)

```
PORT=3001
WS_PORT=3001
LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_MEDIASOUP_URL=http://localhost:4000
```

## Default Users

After running `python init_db.py`, sample users are created:

- **Admin**: admin@example.com / password123
- **Teacher**: teacher@example.com / password123
- **Student**: student@example.com / password123

**Note**: Run `python init_db.py` in the backend directory before starting the server.

## API Documentation

API endpoints are available at `http://localhost:5000/api/docs` (when running in development mode)

## Project Structure

```
.
├── backend/           # Flask backend application
├── frontend/          # React + Vite frontend
├── mediasoup-server/  # Node.js SFU server
└── README.md
```

## Development Scripts

- `npm run dev` - Start frontend dev server
- `python run.py` - Start backend server
- `npm start` - Start Mediasoup SFU server (from mediasoup-server/)

## Production Deployment

1. Build frontend: `cd frontend && npm run build`
2. Configure production environment variables
3. Use production WSGI server (gunicorn) for backend
4. Use PM2 or similar for Mediasoup server
5. Configure reverse proxy (nginx) for all services

## License

MIT
