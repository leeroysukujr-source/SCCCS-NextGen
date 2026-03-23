WSL / Docker setup for backend (WebSocket support)

Option A — WSL (recommended for Windows developers):
1. Open WSL (Ubuntu) shell.
2. cd into the backend folder mounted from Windows, e.g.: `cd /mnt/c/Users/PC/Desktop/dd/backend`.
3. Make the helper script executable and run it:

```bash
chmod +x scripts/setup_wsl_backend.sh
./scripts/setup_wsl_backend.sh
```

This will install dependencies (requires sudo), create a venv, install `eventlet` and run `python run.py` with `SOCKETIO_ASYNC_MODE=eventlet` so Socket.IO uses real websockets.

Option B — Docker (no WSL required):

1. Build the backend image (from project root):

```powershell
cd C:\Users\PC\Desktop\dd\backend
docker build -t scccs-backend:dev .
```

2. Run the container mapping port 5000 and mounting source for live development (optional):

```powershell
# without mounts (uses image files)
docker run --rm -p 5000:5000 --env SOCKETIO_ASYNC_MODE=eventlet scccs-backend:dev

# with source mount (edit on host, run inside container)
docker run --rm -p 5000:5000 -v C:\Users\PC\Desktop\dd\backend:/app --env SOCKETIO_ASYNC_MODE=eventlet scccs-backend:dev
```

Notes:
- Use `SOCKETIO_ASYNC_MODE=eventlet` to enable proper websocket transport.
- If you see SSL / eventlet compatibility errors on Windows host, prefer WSL or Docker.
- After backend is running, open the frontend (Vite) and confirm websocket connections succeed.
