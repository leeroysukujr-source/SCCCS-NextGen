# AI Microservice (Prototype)

This is a lightweight prototype AI microservice for meeting features:
- Summarization endpoint: `POST /api/ai/summarize`
- WebSocket captions: `ws://<host>:8001/ws/caption` (echo prototype)

Quick start (local):

```powershell
cd c:\Users\PC\Desktop\dd\backend\ai
python -m pip install -r requirements-ai.txt
uvicorn ai_service:app --host 0.0.0.0 --port 8001 --reload
```

Notes:
- To enable OpenAI provider-backed summarization, set `OPENAI_API_KEY` in environment.
- The WebSocket endpoint is a simple broadcast/echo prototype and should be extended for production.
- For production, secure the endpoints with API keys / JWT and enable TLS.
