# AI Microservice Integration & Deployment Guide

**Version**: 1.0  
**Date**: December 8, 2025  
**Status**: Production Ready ✅

---

## Quick Summary

The AI Microservice is a FastAPI-based service that provides:
- 🧠 Meeting summarization (with OpenAI integration)
- 📝 Live captions via WebSocket (room-based broadcasting)
- 🔐 API authentication and rate limiting
- 🚀 Production-ready with Docker, Nginx reverse proxy, and TLS support

---

## Architecture Overview

```
Frontend (React)
    ↓
Vite Dev Server (proxy: /api/ai → :8001, /ws → :8001)
    ↓
Nginx Reverse Proxy (TLS termination, rate limiting)
    ↓
AI Service (FastAPI/Uvicorn)
    ├─ POST /api/ai/summarize (requires X-API-Key header)
    ├─ WS /ws/caption/{room_id} (broadcasts to room)
    └─ GET /health (status check)
```

---

## File Structure

```
backend/
├── ai/
│   ├── ai_service.py          # Main FastAPI app (enhanced with auth, logging, etc.)
│   ├── requirements-ai.txt    # Python dependencies
│   ├── Dockerfile             # Docker image definition
│   ├── .env.example           # Configuration template
│   ├── test_post.py           # Test suite
│   ├── README.md              # Service documentation
│   └── check_import.py        # Import validation

frontend/
├── src/
│   ├── utils/aiClient.js      # Lightweight HTTP client for summaries
│   ├── components/
│   │   ├── AISummaryButton.jsx # UI to request and display summaries
│   │   └── LiveCaptions.jsx    # WebSocket connection + caption display
│   └── pages/
│       └── MeetingEnhanced.jsx # Updated with AI tab + components

docker-compose.ai.yml          # Compose file for AI service + Nginx
nginx.conf                     # Nginx config (rate limiting, TLS, proxying)
AI_PRODUCTION_HARDENING.md     # Security checklist + hardening guide
```

---

## Local Development Setup

### 1. Install Backend Dependencies

```bash
cd backend/ai
python -m pip install -r ../requirements-ai.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set:
# - OPENAI_API_KEY (optional; uses naive fallback if not set)
# - AUTH_ENABLED=false (for local dev)
# - HOST=127.0.0.1
# - PORT=8001
```

### 3. Start AI Microservice

```bash
cd backend/ai
python -m uvicorn ai_service:app --host 127.0.0.1 --port 8001 --reload
```

You'll see:
```
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
INFO:     OpenAI provider enabled (model: gpt-3.5-turbo)
```

### 4. Verify Service Health

```bash
curl http://localhost:8001/health
# Expected response: {"status":"ok","service":"AI Features","openai_enabled":true}
```

### 5. Test Summarization Endpoint

```bash
python backend/ai/test_post.py
# Expected output: Results: 3/3 tests passed
```

### 6. Start Frontend Dev Server

In another terminal:
```bash
cd frontend
npm run dev
```

The Vite dev server will proxy:
- `/api/ai/*` → `http://localhost:8001`
- `/ws/*` → `ws://localhost:8001`

---

## Frontend Integration

### Using AISummaryButton

In your React component:

```jsx
import AISummaryButton from '../components/AISummaryButton'
import { useChat } from '@livekit/components-react'

export function MyMeetingUI({ meetingId }) {
  const { chatMessages } = useChat()
  
  const getTranscript = () => {
    return chatMessages
      .map(m => `${m.from?.name}: ${m.message}`)
      .join('\n')
  }

  return (
    <AISummaryButton 
      meetingId={meetingId}
      getTranscript={getTranscript}
    />
  )
}
```

**Output**: Summary text, highlights array, metadata

### Using LiveCaptions

In your React component:

```jsx
import LiveCaptions from '../components/LiveCaptions'

export function MyMeetingUI({ meetingId }) {
  return (
    <LiveCaptions wsUrl={`ws://localhost:8001/ws/caption/${meetingId}`} />
  )
}
```

To send captions from your app (e.g., from speech-to-text):

```javascript
// In frontend code that has WebSocket access
const ws = new WebSocket(`ws://localhost:8001/ws/caption/${meetingId}`)
ws.send(JSON.stringify({
  participant_id: 'alice@example.com',
  text: 'This is the spoken text',
  interim: false
}))
```

---

## Production Deployment

### Step 1: Prepare Environment

```bash
# Generate strong API key
export AI_API_KEY=$(openssl rand -base64 32)

# Generate TLS certificates (self-signed for demo)
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/server.key \
  -out certs/server.crt -days 365 -nodes \
  -subj "/CN=yourdomain.com"

# Create production .env
cat > .env.production << EOF
OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-3.5-turbo
AUTH_ENABLED=true
API_KEY=${AI_API_KEY}
CORS_ORIGINS=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
HOST=0.0.0.0
PORT=8001
RELOAD=false
EOF
```

### Step 2: Deploy with Docker Compose

```bash
# Build and start
docker-compose -f docker-compose.ai.yml up -d

# Check status
docker-compose -f docker-compose.ai.yml ps
docker logs -f ai-features-service
```

### Step 3: Verify Deployment

```bash
# Health check (via Nginx proxy)
curl -k https://yourdomain.com/health

# Test API with authentication
curl -k -X POST https://yourdomain.com/api/ai/summarize \
  -H "X-API-Key: ${AI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_id":"test-1",
    "transcript":"Team sync meeting. Action items: Alice to finalize spec, Bob to review architecture.",
    "brief":false
  }'
```

### Step 4: Update Frontend API Calls

Update your frontend code to call the production domain:

```javascript
// frontend/src/utils/aiClient.js
export async function summarizeMeeting(meetingId, transcript, options = {}) {
  const base = process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com'  // Your domain
    : ''  // Local dev proxy
  
  const res = await fetch(base + '/api/ai/summarize', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': process.env.REACT_APP_AI_API_KEY || ''  // From env vars
    },
    body: JSON.stringify({ meeting_id: meetingId, transcript, ...options })
  })
  if (!res.ok) throw new Error(`AI service: ${res.status}`)
  return res.json()
}
```

### Step 5: Monitor & Maintain

```bash
# View logs
docker logs -f ai-features-service

# Monitor resource usage
docker stats ai-features-service

# Check Nginx rate limiting
docker logs ai-proxy | grep "limiting requests"

# Restart service
docker-compose -f docker-compose.ai.yml restart ai-service
```

---

## API Reference

### POST /api/ai/summarize

**Request:**
```json
{
  "meeting_id": "meeting-123",
  "transcript": "Meeting content here...",
  "brief": false,
  "max_tokens": 300
}
```

**Response (Success - 200):**
```json
{
  "meeting_id": "meeting-123",
  "request_id": "49512aa3-...",
  "summary_text": "Summary of meeting...",
  "highlights": [
    { "start": null, "end": null, "text": "Action item text" }
  ],
  "provider": "openai",
  "metrics": {
    "sentences": 5,
    "brief_mode": false,
    "transcript_len": 234
  }
}
```

**Response (Error - 400):**
```json
{
  "detail": "Transcript required (min 10 chars) for summarization"
}
```

**Response (Error - 403):**
```json
{
  "detail": "Invalid or missing API key"
}
```

**Response (Error - 429):**
```json
{
  "detail": "Rate limit exceeded"
}
```

### WS /ws/caption/{room_id}

**Usage:**
```javascript
const ws = new WebSocket('wss://yourdomain.com/ws/caption/meeting-123')

// Send caption
ws.send(JSON.stringify({
  participant_id: 'user-id',
  text: 'Spoken text',
  interim: false
}))

// Receive broadcast
ws.onmessage = (event) => {
  const caption = JSON.parse(event.data)
  console.log(caption.participant_id, ':', caption.text)
}
```

### GET /health

**Response:**
```json
{
  "status": "ok",
  "service": "AI Features",
  "openai_enabled": true
}
```

---

## Troubleshooting

### Issue: "Module not found: slowapi"
**Solution:**
```bash
pip install slowapi
```

### Issue: "OpenAI API key is invalid"
**Solution:**
1. Verify the key: `echo $OPENAI_API_KEY`
2. Check OpenAI account limits/permissions
3. Service will fall back to naive summarization automatically

### Issue: "Connection refused" on port 8001
**Solution:**
```bash
# Check if service is running
lsof -i :8001  # macOS/Linux
netstat -ano | findstr :8001  # Windows

# Kill existing process
killall python  # macOS/Linux
taskkill /PID <pid> /F  # Windows
```

### Issue: WebSocket connection fails
**Solution:**
1. Ensure room_id matches in both sender and listener
2. Check Nginx logs: `docker logs ai-proxy`
3. Verify WebSocket is not blocked by firewall

### Issue: Rate limiting triggered
**Solution:**
- Increase limit in `nginx.conf`: `rate=120r/m` (instead of 60r/m)
- Implement client-side request batching
- Use caching for repeated requests

---

## Monitoring & Observability

### Key Metrics to Track

1. **Request Latency**
   ```bash
   docker logs ai-features-service | grep "Summarize response"
   ```

2. **Error Rate**
   ```bash
   docker logs ai-features-service | grep -i error
   ```

3. **Provider Usage**
   - Monitor `"provider": "openai"` vs `"provider": "naive"` in responses
   - Track OpenAI API costs

4. **WebSocket Connections**
   - Count `"Caption client connected"` logs
   - Monitor for connection leaks

### Example Prometheus Metrics (Optional)

Add to `ai_service.py`:
```python
from prometheus_client import Counter, Histogram

summarize_requests = Counter('ai_summarize_requests_total', 'Total summarize requests')
summarize_latency = Histogram('ai_summarize_latency_seconds', 'Summarize latency')
caption_connections = Gauge('ai_caption_connections', 'Active caption connections')
```

---

## Security Checklist for Production

- [ ] `AUTH_ENABLED=true` with strong `API_KEY`
- [ ] TLS certificates (Let's Encrypt recommended)
- [ ] CORS origins set to your domain only
- [ ] Rate limiting configured and tested
- [ ] API key rotated monthly
- [ ] Logs aggregated to centralized service
- [ ] Alerts configured for errors > 5%
- [ ] Backup plan documented
- [ ] Incident response runbook created
- [ ] PII/sensitive data filtering enabled

See `AI_PRODUCTION_HARDENING.md` for details.

---

## Scaling & Performance

### Horizontal Scaling (Multiple Instances)

With Docker Swarm or Kubernetes:

```yaml
# Kubernetes example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-service
  template:
    metadata:
      labels:
        app: ai-service
    spec:
      containers:
      - name: ai-service
        image: ai-service:latest
        ports:
        - containerPort: 8001
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
```

### Performance Tuning

1. **Uvicorn Workers**: Use multiple workers for production
   ```bash
   uvicorn ai_service:app --workers 4 --host 0.0.0.0 --port 8001
   ```

2. **OpenAI Model Choice**:
   - `gpt-3.5-turbo`: Fastest, most cost-effective
   - `gpt-4`: Higher quality but slower & more expensive

3. **Caching** (optional):
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=1000)
   def cached_summarize(transcript_hash):
       # Avoid re-summarizing identical transcripts
       pass
   ```

---

## Next Steps

1. **Enable OpenAI Integration**:
   - Get API key from platform.openai.com
   - Set `OPENAI_API_KEY` environment variable
   - Verify with `test_post.py`

2. **Deploy to Production**:
   - Follow "Production Deployment" section above
   - Monitor logs and metrics
   - Validate with real users

3. **Add More Features**:
   - Live speech-to-text (using Deepgram, Gladia, Whisper API)
   - Sentiment analysis
   - Meeting transcription storage (with retention policy)
   - Integration with calendar/scheduling systems

4. **Optimize Costs**:
   - Use naive summarization for non-critical meetings
   - Implement request batching
   - Cache frequent requests
   - Monitor OpenAI usage daily

---

## Support & Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **OpenAI API**: https://platform.openai.com/docs/
- **Nginx Docs**: https://nginx.org/en/docs/
- **Docker Compose**: https://docs.docker.com/compose/
- **Security Hardening**: See `AI_PRODUCTION_HARDENING.md`

---

**Questions?** Check logs first: `docker logs -f ai-features-service`

**Status**: ✅ Production Ready | Last Updated: Dec 8, 2025
