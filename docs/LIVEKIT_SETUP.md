
# LiveKit Video Conferencing Setup Guide

This project has been upgraded to use **LiveKit** for high-performance, Zoom-like video conferencing.

## Architecture

The system uses a modern WebRTC architecture:
- **Frontend**: React + LiveKit Client SDK (connects to LiveKit SFU)
- **Backend (Flask)**: Generates secure access tokens for meetings.
- **Media Server (LiveKit SFU)**: Handles all video/audio routing, SFU, Simulcast, and adaptive streaming.
- **Database**: Stores room metadata (history, participants) using the existing `rooms` table.

## Prerequisites

1. **Docker & Docker Compose** (Required for the media server)
2. **Node.js 18+**
3. **Python 3.10+**

## Installation

### 1. Start the LiveKit Server
The media server runs in a Docker container.
```bash
# In the project root (where livekit_docker_compose.yml is)
docker-compose -f livekit_docker_compose.yml up -d
```
*Port 7880 (HTTP) and 7881 (TCP/UDP) must be open.*

### 2. Update Backend
The backend now includes `livekit-api`.
```bash
cd backend
pip install -r requirements.txt
python run.py
```
*Env vars `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` default to dev keys. For production, update `.env`.*

### 3. Update Frontend
The frontend uses `@livekit/components-react`.
```bash
cd frontend
npm install
npm run dev
```

## Features

- **High Quality Video**: VP9/AV1 codec support with Simulcast (automatic quality switching).
- **Screensharing**: High FPS screen sharing with audio.
- **Chat**: Integrated real-time chat in the meeting.
- **Pre-Join Screen**: Setup camera/mic before entering.
- **Active Speaker**: Automatic layout adjustment.
- **Network Adaptation**: Handles poor connections gracefully.

## Scaling to Production

To scale to thousands of users:
1. **Deploy LiveKit** to a cloud provider (AWS/GCP) or use **LiveKit Cloud**.
2. **Redis**: Configure LiveKit to use Redis for multi-node mesh networking.
3. **Global Edge**: Deploy LiveKit nodes in multiple regions (US, EU, Asia) and use `latency` based routing.
4. **Load Balancer**: Use HAProxy or AWS ALB in front of the LiveKit nodes.

## Troubleshooting

- **Black Screen?** Ensure UDP ports 50000-60000 are open on the firewall.
- **Connection Error?** Check if `LIVEKIT_URL` in backend matches the Docker container address (default `ws://localhost:7880`).
