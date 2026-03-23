# AI Microservice Production Hardening Guide

## Security Checklist

### 1. API Authentication
- [x] Added `X-API-Key` header verification in `ai_service.py` (function `verify_api_key`)
- [x] Enable via `AUTH_ENABLED=true` environment variable
- [x] Set `API_KEY` to a strong secret (e.g., 32+ random characters)
- [ ] Rotate keys regularly (recommend every 90 days)
- [ ] Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) in production

**Example:**
```bash
export AUTH_ENABLED=true
export API_KEY=$(openssl rand -base64 32)
```

### 2. HTTPS / TLS Encryption
- [x] Nginx reverse proxy configured for TLS termination (`nginx.conf`)
- [ ] Generate self-signed certs for testing:
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/server.key -out certs/server.crt -days 365 -nodes
```
- [ ] Use Let's Encrypt in production (via certbot):
```bash
docker run --rm -it -v ./certs:/etc/letsencrypt certbot/certbot certonly \
  --standalone -d yourdomain.com
```

### 3. Rate Limiting
- [x] Configured in Nginx: 60 req/min per IP for `/api/ai/`, 100 req/min for `/ws/`
- [x] Burst allowance to handle spikes
- [ ] Adjust thresholds based on expected load
- [ ] Monitor and alert on rate limit violations

### 4. CORS Configuration
- [x] Configurable via `CORS_ORIGINS` environment variable
- [ ] Set to specific domains in production (never use `*`)
- [ ] Remove `localhost` entries after development

**Example:**
```bash
export CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### 5. Trusted Hosts Validation
- [x] Implemented via `TrustedHostMiddleware` in FastAPI
- [ ] Configure `ALLOWED_HOSTS` to include only your domains

### 6. Input Validation
- [x] Transcript minimum length check (10 chars)
- [x] Pydantic models for request validation
- [ ] Add file upload size limits (if adding file support)
- [ ] Sanitize HTML/JS in user inputs

### 7. Logging & Monitoring
- [x] Structured logging with request IDs in `ai_service.py`
- [ ] Send logs to centralized service (ELK stack, CloudWatch, Datadog)
- [ ] Monitor error rates, latencies, and failures
- [ ] Set up alerts for errors > 5% or latency > 5s

**Example log entry:**
```
[abc-def-123] Summarize request: meeting_id=meeting-1, api_key=test***
[abc-def-123] OpenAI summarization successful
```

### 8. Data Privacy & Retention
- [ ] Implement data retention policies (delete transcripts after 30 days)
- [ ] Encrypt sensitive data at rest (if storing locally)
- [ ] Add user consent tracking for AI processing
- [ ] Provide audit logs of who accessed what data

**Recommended:**
- Never store raw transcripts permanently
- Hash transcript IDs for anonymization
- Comply with GDPR/CCPA (add data deletion endpoints)

### 9. Dependency Updates
- [x] Created requirements-ai.txt with pinned versions
- [ ] Regularly update dependencies (weekly or monthly)
- [ ] Use tools like Dependabot or Snyk to monitor for security issues
- [ ] Test updates in staging before deploying to production

**Update command:**
```bash
pip install --upgrade fastapi uvicorn openai slowapi python-dotenv
```

### 10. Provider-Specific Security

#### OpenAI Integration
- [ ] Rotate API keys periodically
- [ ] Use separate keys for different environments (dev/staging/prod)
- [ ] Monitor API usage and costs
- [ ] Implement request filtering to prevent abuse (no PII, no secrets)
- [ ] Add content moderation (use OpenAI's moderation API)

#### Fallback (Naive Summarization)
- [x] Built-in fallback if OpenAI fails
- [ ] Add monitoring to track fallback usage

### 11. WebSocket Security
- [x] Room-based isolation (`/ws/caption/{room_id}`)
- [ ] Add authentication token to WebSocket upgrade
- [ ] Rate limit message broadcast
- [ ] Validate message JSON schema

### 12. Deployment Hardening
- [x] Docker image created with minimal dependencies
- [ ] Run container as non-root user
- [ ] Set resource limits (CPU, memory)
- [ ] Enable container health checks
- [ ] Use secrets management (not environment variables in compose)

**Example Docker resource limits:**
```yaml
resources:
  limits:
    cpus: '2'
    memory: 2G
  reservations:
    cpus: '1'
    memory: 1G
```

### 13. Monitoring & Observability
- [x] Health check endpoint at `/health`
- [ ] Integrate with monitoring service (Prometheus, New Relic, Datadog)
- [ ] Track key metrics:
  - Request latency (p50, p95, p99)
  - Error rate (5xx errors)
  - Token usage (OpenAI costs)
  - Provider fallback rate
  - WebSocket connection count

### 14. Backup & Disaster Recovery
- [ ] Document backup procedures
- [ ] Test recovery process monthly
- [ ] Keep API keys/secrets in secure vault backup
- [ ] Monitor disk usage for logs

### 15. Incident Response
- [ ] Document runbook for common issues
- [ ] Set up alerting for critical failures
- [ ] Have on-call rotation for production issues
- [ ] Post-incident review process (blameless)

---

## Quick Start (Production-Ready)

### 1. Set Environment Variables
```bash
cat > .env.production << EOF
OPENAI_API_KEY=sk-...your-api-key...
OPENAI_MODEL=gpt-3.5-turbo
AUTH_ENABLED=true
API_KEY=$(openssl rand -base64 32)
CORS_ORIGINS=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
HOST=0.0.0.0
PORT=8001
RELOAD=false
EOF
```

### 2. Generate TLS Certificates
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/server.key \
  -out certs/server.crt -days 365 -nodes \
  -subj "/CN=yourdomain.com"
```

### 3. Deploy with Docker Compose
```bash
docker-compose -f docker-compose.ai.yml up -d
```

### 4. Verify Deployment
```bash
# Check health
curl -k https://localhost/health

# Test API (with auth)
curl -k -X POST https://localhost/api/ai/summarize \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"meeting_id":"test","transcript":"Sample meeting content."}'
```

---

## Monitoring Commands

```bash
# View logs
docker logs -f ai-features-service

# Check container stats
docker stats ai-features-service

# Monitor rate limits (Nginx)
docker logs -f ai-proxy | grep "limiting requests"

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  wss://yourdomain.com/ws/caption/test-room
```

---

## Compliance Checklist

- [ ] GDPR compliant (user consent, data deletion)
- [ ] SOC 2 ready (logging, monitoring, access controls)
- [ ] HIPAA ready (if handling health data: encryption at rest/transit)
- [ ] PCI DSS (if handling payment data)
- [ ] CCPA compliant (data subject rights)

---

## Support & Escalation

For security issues, report privately to: security@yourdomain.com (do not open public issues)

---

**Last updated**: December 8, 2025  
**Status**: Production Ready ✅
