# SCCCS NextGen System - Project Summary

## Overview

SCCCS NextGen is a comprehensive educational collaboration platform that integrates features from Zoom, Google Classroom, Slack, and Microsoft Teams into a single advanced platform.

## Complete Feature List

### ✅ Authentication & User Management
- JWT-based authentication
- User roles: Admin, Teacher, Student
- User registration and login
- Profile management
- Secure password hashing with bcrypt

### ✅ Video/Audio Meetings (Zoom-like)
- Multi-user video/audio rooms using Mediasoup SFU
- Real-time video/audio streaming
- Mute/unmute audio
- Enable/disable video
- Screen sharing placeholder (ready for implementation)
- Room code system for easy joining
- Participant management
- Real-time participant updates

### ✅ Chat & Messaging (Slack/Teams-like)
- Channel-based messaging (public/private)
- Direct messaging support
- Threaded replies
- Real-time message delivery via WebSocket
- Typing indicators
- Message editing and deletion
- File attachments support
- Notifications for new messages

### ✅ Class & Lesson Management (Google Classroom-like)
- Class creation and management
- Class code system for joining
- Lesson creation with rich content
- Due dates and assignments
- Class member management
- Teacher/student role separation
- File attachments for lessons

### ✅ Team Collaboration
- Channels for team communication
- Thread discussions
- File sharing and uploads
- Notifications system
- User search
- Member management

### ✅ AI Integration
- **Offline AI**: Local analysis using keyword matching
  - Sentiment analysis
  - Keyword detection
  - Content suggestions
- **Online AI**: Cloud-powered features (OpenAI integration)
  - Text analysis
  - Summarization
  - Intelligent suggestions
- Hybrid mode: Combines offline and online AI

### ✅ Real-time Features
- WebSocket support for instant updates
- Real-time chat messaging
- Live participant updates in meetings
- Typing indicators
- Notification system

### ✅ File Management
- File upload and storage
- Support for multiple file types
- File attachment to messages and lessons
- File download
- File size limits and validation

## Technical Stack

### Backend
- **Framework**: Flask (Python 3.12+)
- **Database**: SQLAlchemy (SQLite by default, supports PostgreSQL/MySQL)
- **Authentication**: Flask-JWT-Extended
- **WebSocket**: Flask-SocketIO with Eventlet
- **AI**: OpenAI API integration + custom offline AI
- **File Storage**: Local filesystem (uploads/)

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **UI Icons**: React Icons
- **Video/Audio**: Mediasoup-client
- **WebSocket**: Socket.io-client
- **HTTP Client**: Axios

### SFU Server
- **Runtime**: Node.js v22+
- **Framework**: Express
- **WebRTC**: Mediasoup
- **Signaling**: Socket.io

## Project Structure

```
scccs-nextgen/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app initialization
│   │   ├── models.py             # Database models
│   │   ├── socketio_events.py   # WebSocket event handlers
│   │   └── routes/
│   │       ├── auth.py           # Authentication endpoints
│   │       ├── users.py          # User management
│   │       ├── rooms.py          # Meeting rooms
│   │       ├── channels.py       # Chat channels
│   │       ├── messages.py       # Chat messages
│   │       ├── classes.py        # Classes management
│   │       ├── lessons.py        # Lessons management
│   │       ├── files.py          # File uploads
│   │       └── ai.py             # AI endpoints
│   ├── config.py                 # Configuration
│   ├── run.py                    # Application entry point
│   ├── init_db.py                # Database initialization
│   ├── requirements.txt          # Python dependencies
│   └── uploads/                  # File upload directory
│
├── frontend/
│   ├── src/
│   │   ├── api/                  # API client functions
│   │   │   ├── client.js
│   │   │   ├── auth.js
│   │   │   ├── rooms.js
│   │   │   ├── channels.js
│   │   │   ├── messages.js
│   │   │   ├── classes.js
│   │   │   ├── lessons.js
│   │   │   └── ai.js
│   │   ├── components/           # Reusable components
│   │   │   └── Layout.jsx
│   │   ├── hooks/                # Custom React hooks
│   │   │   └── useMediasoup.js
│   │   ├── pages/                # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Meeting.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── Classes.jsx
│   │   │   ├── ClassDetail.jsx
│   │   │   └── Profile.jsx
│   │   ├── store/                # State management
│   │   │   └── authStore.js
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── mediasoup-server/
│   ├── server.js                 # SFU server
│   └── package.json
│
├── README.md                     # Main documentation
├── QUICKSTART.md                 # Quick start guide
├── SETUP.md                      # Detailed setup guide
├── DEPLOY.md                     # Deployment guide
└── package.json                  # Root package.json

```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Rooms (Meetings)
- `POST /api/rooms` - Create room
- `GET /api/rooms` - List user's rooms
- `GET /api/rooms/<id>` - Get room details
- `POST /api/rooms/join/<code>` - Join room by code
- `POST /api/rooms/<id>/leave` - Leave room
- `GET /api/rooms/<id>/participants` - Get participants

### Channels
- `POST /api/channels` - Create channel
- `GET /api/channels` - List user's channels
- `GET /api/channels/<id>` - Get channel details
- `POST /api/channels/<id>/join` - Join channel
- `POST /api/channels/<id>/leave` - Leave channel
- `GET /api/channels/<id>/members` - Get members

### Messages
- `POST /api/messages/channel/<id>` - Send message
- `GET /api/messages/channel/<id>` - Get messages
- `PUT /api/messages/<id>` - Edit message
- `DELETE /api/messages/<id>` - Delete message
- `GET /api/messages/<id>/thread` - Get thread replies

### Classes
- `POST /api/classes` - Create class
- `GET /api/classes` - List user's classes
- `GET /api/classes/<id>` - Get class details
- `POST /api/classes/join/<code>` - Join class by code
- `GET /api/classes/<id>/members` - Get members

### Lessons
- `POST /api/lessons/class/<id>` - Create lesson
- `GET /api/lessons/class/<id>` - Get class lessons
- `GET /api/lessons/<id>` - Get lesson details
- `PUT /api/lessons/<id>` - Update lesson
- `DELETE /api/lessons/<id>` - Delete lesson

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/<id>` - Download file
- `GET /api/files/info/<id>` - Get file info
- `DELETE /api/files/<id>` - Delete file

### AI
- `POST /api/ai/analyze` - Analyze text
- `POST /api/ai/summarize` - Summarize text
- `POST /api/ai/suggest` - Get suggestions
- `GET /api/ai/status` - Get AI status

## WebSocket Events

### Client → Server
- `connect` - Connect with auth token
- `join_room` - Join video/audio room
- `leave_room` - Leave room
- `join_channel` - Join chat channel
- `leave_channel` - Leave channel
- `new_message` - Send new message
- `typing` - Typing indicator

### Server → Client
- `connected` - Connection confirmed
- `joined_room` - Room joined
- `left_room` - Room left
- `user_joined` - User joined room
- `user_left` - User left room
- `joined_channel` - Channel joined
- `message_received` - New message received
- `user_typing` - User typing indicator

## Database Models

- **User** - Users with roles
- **Room** - Video/audio meeting rooms
- **RoomParticipant** - Room membership
- **Channel** - Chat channels
- **ChannelMember** - Channel membership
- **Message** - Chat messages with threading
- **Class** - Educational classes
- **ClassMember** - Class membership
- **Lesson** - Class lessons/assignments
- **File** - Uploaded files
- **Notification** - User notifications

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation
- File type restrictions
- Role-based access control
- Secure file upload handling

## Development Scripts

```bash
# Install all dependencies
npm run install:all

# Backend
npm run dev:backend
python run.py  # Or directly

# Frontend
npm run dev:frontend
npm run dev  # Or directly from frontend/

# Mediasoup SFU
npm run dev:sfu
npm start  # Or directly from mediasoup-server/

# Database initialization
npm run init:db
python init_db.py  # Or directly from backend/

# Build frontend
npm run build:frontend
```

## Default Sample Data

After running `init_db.py`:

- **Users**:
  - Admin: `admin@example.com` / `password123`
  - Teacher: `teacher@example.com` / `password123`
  - Student: `student@example.com` / `password123`

- **Sample Room**: "Sample Meeting Room"
- **Sample Channel**: "general" (public channel)
- **Sample Class**: "Introduction to Computer Science"

## Production Readiness

- Environment-based configuration
- Database migrations support
- File upload handling
- Error handling and logging
- CORS configuration
- Production deployment guides
- Docker support ready
- Scalability considerations

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (with some limitations)
- Modern browsers with WebRTC support

## Performance Considerations

- Efficient WebSocket connections
- Optimized database queries
- File upload size limits
- Media stream optimization
- Frontend code splitting ready

## Future Enhancements (Ready for Extension)

- Screen sharing implementation
- Recording functionality
- Mobile app support
- Advanced AI features
- Enhanced notifications
- Email integration
- Calendar integration
- Analytics dashboard

## License

MIT

## Support

For setup and deployment:
- See [SETUP.md](SETUP.md) for detailed setup
- See [QUICKSTART.md](QUICKSTART.md) for quick start
- See [DEPLOY.md](DEPLOY.md) for production deployment
