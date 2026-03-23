Local and Public LiveKit Setup

This file explains how to run the system locally and make LiveKit reachable from remote peers (temporary and production options).

1) Environment variables (backend)
- `LIVEKIT_URL` - (optional) The internal LiveKit URL used by server-side API calls (e.g. `ws://livekit:7880` or `http://livekit:7880`).
- `LIVEKIT_PUBLIC_URL` - (recommended) The browser-accessible LiveKit websocket URL that clients should use, e.g. `wss://livekit.example.com:7880` or `ws://example.ngrok.io:7880`.
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` - credentials for server-side token generation.
- `LIVEKIT_PORT` - optional hint port when rewriting internal hostnames (defaults to `7880`).

Priority order used by the backend to return a client URL:
- `LIVEKIT_PUBLIC_URL` from Flask config or env (highest priority)
- Derive from incoming HTTP request host (if available), matching `wss` when the page is HTTPS
- Rewrite docker/internal hostnames (e.g. `ws://livekit:7880`) to `localhost:PORT`
- Fallback to `LIVEKIT_URL` as configured

2) Quick local test (developer machine)
- Start LiveKit container (uses `livekit_docker_compose.yml`):

```powershell
cd C:\Users\PC\Desktop\dd
docker-compose -f livekit_docker_compose.yml up -d
```

- Start backend and frontend locally (separate terminals):

```powershell
cd C:\Users\PC\Desktop\dd\backend
.\start_backend.bat

cd C:\Users\PC\Desktop\dd\frontend
npm run dev
```

- Create a temporary user and request a LiveKit token (PowerShell example):

```powershell
$ts = [int](Get-Date -UFormat %s)
$body = @{ email = "ci_test_$ts@example.com"; password = "Password123!"; username = "ci_test_$ts" } | ConvertTo-Json
$reg = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/register -Headers @{ 'Content-Type' = 'application/json' } -Body $body
$token = $reg.data.access_token
$body2 = @{ room_id = '22' } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/meeting-livekit/token -Headers @{ 'Content-Type'='application/json'; 'Authorization' = "Bearer $token" } -Body $body2
$res | ConvertTo-Json -Depth 5
```

Expect a response similar to:
```
{
  "token": "<livekit-access-token>",
  "url": "ws://localhost:7880",
  "room": "room-22"
}
```

3) Expose local services for remote testing (temporary)
- Use `ngrok` to create public tunnels. NOTE: WebRTC may require TURN/UDP and ngrok `tcp` tunnels are limited — this is only for smoke testing.

Example:
```powershell
ngrok http 5174    # frontend
ngrok http 5000    # backend API
ngrok tcp 7880     # LiveKit TCP (WebSocket) - may not fully support UDP/ICE
```
When using ngrok, set `LIVEKIT_PUBLIC_URL` to the public host returned by ngrok (include protocol):
```
LIVEKIT_PUBLIC_URL="ws://<ngrok-host>:<port>"
```
Restart the backend after changing env vars.

4) Production / recommended
- Deploy a public LiveKit server (managed or self-hosted) with proper domain and TLS so clients can connect via `wss://`.
- Set `LIVEKIT_PUBLIC_URL` to the public wss URL and configure certs / TURN servers for robust NAT traversal.

5) Troubleshooting
- If clients can't join externally, verify:
  - `LIVEKIT_PUBLIC_URL` is set and reachable from the internet
  - Ports for LiveKit are open and not blocked by firewall (UDP for ICE/turn)
  - The returned `url` from `/api/meeting-livekit/token` uses `wss://` when the page is served over HTTPS
  - Backend logs for token generation errors

---
If you'd like, I can attempt to create ngrok tunnels from this machine (if you have ngrok installed) and wire `LIVEKIT_PUBLIC_URL` for a quick remote test — tell me to proceed and I'll do it.