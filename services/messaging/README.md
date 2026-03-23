Messaging microservice (FastAPI + Socket.IO)

This scaffold provides a starting point for a messaging microservice using FastAPI and python-socketio.

Quick start (dev):

1. Create and activate a virtualenv
2. pip install -r requirements.txt
3. uvicorn main:app --reload --port 8001

WebSocket/Socket.IO server runs on port 8001 by default in this scaffold.

Features:
- HTTP health endpoint
- Socket.IO server with connect/disconnect handlers
- Redis pub/sub integration placeholder (for scaling)

Notes:
- This is a minimal scaffold. Replace in-memory state with Redis or message broker for production.
