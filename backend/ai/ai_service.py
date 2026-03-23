"""
Lightweight AI microservice prototype for meeting features.
- FastAPI app exposing a `/api/ai/summarize` POST endpoint.
- This is a prototyping scaffold: replace placeholder summarization with a real model (OpenAI, local HF, etc.)

Run locally:
  pip install -r requirements-ai.txt
  uvicorn ai_service:app --host 0.0.0.0 --port 8001 --reload

Security note: In production, put this behind auth (API key / JWT) and TLS.
"""
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Optional, List
import os
import json
import uuid
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Features Service (Production)")

# Trust proxy headers (for reverse proxy behind nginx, etc.)
app.add_middleware(
    TrustedHostMiddleware, allowed_hosts=os.environ.get("ALLOWED_HOSTS", "localhost,localhost:3000,localhost:5173").split(",")
)

# Allow CORS with configurable origins
allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# OpenAI provider setup
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
USE_OPENAI = bool(OPENAI_API_KEY)
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")
if USE_OPENAI:
    try:
        import openai
        openai.api_key = OPENAI_API_KEY
        logger.info(f"OpenAI provider enabled (model: {OPENAI_MODEL})")
    except Exception as e:
        logger.warning(f"OpenAI provider failed to initialize: {e}")
        USE_OPENAI = False


class SummarizeRequest(BaseModel):
    meeting_id: str
    transcript: Optional[str] = None
    mode: Optional[str] = "post"  # "post" or "live"
    brief: Optional[bool] = False
    max_tokens: Optional[int] = 300


class Highlight(BaseModel):
    start: Optional[float]
    end: Optional[float]
    text: str


class SummarizeResponse(BaseModel):
    meeting_id: str
    request_id: str
    summary_text: str
    highlights: List[Highlight] = []
    metrics: dict = {}
    provider: Optional[str] = None


def verify_api_key(x_api_key: str = Header(None)) -> str:
    """Verify API key from header if AUTH_ENABLED is true."""
    auth_enabled = os.environ.get("AUTH_ENABLED", "false").lower() == "true"
    expected_key = os.environ.get("API_KEY")
    if auth_enabled and (not x_api_key or x_api_key != expected_key):
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return x_api_key or "guest"


@app.post("/api/ai/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest, api_key: str = Depends(verify_api_key)):
    request_id = str(uuid.uuid4())
    logger.info(f"[{request_id}] Summarize request: meeting_id={req.meeting_id}, api_key={api_key[:4]}***")
    
    if not req.transcript or len(req.transcript.strip()) < 10:
        raise HTTPException(status_code=400, detail="Transcript required (min 10 chars) for summarization")

    text = req.transcript.strip()
    provider_used = "naive"

    # If provider configured, use it (OpenAI in this example)
    if USE_OPENAI:
        try:
            prompt = f"Summarize the following meeting transcript concisely:\n\n{text}"
            if req.brief:
                prompt = "Provide a 2-3 sentence brief summary of the meeting:\n\n" + text
            
            # Use Chat Completions API (current standard)
            completion = openai.ChatCompletion.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=req.max_tokens,
                temperature=0.3
            )
            summary = completion.choices[0].message.content.strip()
            provider_used = "openai"
            logger.info(f"[{request_id}] OpenAI summarization successful")
        except Exception as e:
            logger.warning(f"[{request_id}] OpenAI failed ({e}), falling back to naive")
            summary = _naive_summary(text, req.brief)
    else:
        summary = _naive_summary(text, req.brief)

    # Extract highlights: sentences containing keywords
    sentences = [s.strip() for s in text.replace('\n', ' ').split('.') if s.strip()]
    keywords = ['action', 'decide', 'follow up', 'deadline', 'todo', 'assign', 'important', 'critical']
    highlights = []
    for i, s in enumerate(sentences):
        low = s.lower()
        for kw in keywords:
            if kw in low:
                highlights.append({"start": None, "end": None, "text": s})
                break

    resp = {
        "meeting_id": req.meeting_id,
        "request_id": request_id,
        "summary_text": summary,
        "highlights": highlights,
        "provider": provider_used,
        "metrics": {"sentences": len(sentences), "brief_mode": req.brief, "transcript_len": len(text)}
    }
    logger.info(f"[{request_id}] Summarize response: {len(highlights)} highlights, provider={provider_used}")
    return resp


def _naive_summary(text: str, brief: bool):
    sentences = [s.strip() for s in text.replace('\n', ' ').split('.') if s.strip()]
    if not sentences:
        return "(no transcribed content)"
    if brief:
        take = sentences[:2]
    else:
        take = sentences[:3] + (sentences[-2:] if len(sentences) > 4 else [])
    return '. '.join(take) + ('.' if take else '')


# WebSocket endpoint for live captions (broadcast to all connected clients)
class CaptionConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        self.active_connections.append((websocket, room_id))
        logger.info(f"Caption client connected: room_id={room_id}")

    def disconnect(self, websocket: WebSocket):
        try:
            self.active_connections = [(ws, rid) for ws, rid in self.active_connections if ws != websocket]
        except Exception:
            pass

    async def broadcast_to_room(self, room_id: str, message: str):
        """Broadcast caption to all clients in the same room."""
        for connection, cid in list(self.active_connections):
            if cid == room_id:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.warning(f"Failed to broadcast caption: {e}")
                    self.disconnect(connection)


caption_manager = CaptionConnectionManager()


@app.websocket("/ws/caption/{room_id}")
async def websocket_caption(ws: WebSocket, room_id: str):
    await caption_manager.connect(ws, room_id)
    try:
        while True:
            data = await ws.receive_text()
            try:
                obj = json.loads(data)
                obj["server_ts"] = int(__import__('time').time() * 1000)
                await caption_manager.broadcast_to_room(room_id, json.dumps(obj))
            except Exception as e:
                logger.error(f"Caption processing error: {e}")
    except WebSocketDisconnect:
        caption_manager.disconnect(ws)
        logger.info(f"Caption client disconnected: room_id={room_id}")


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "ok", "service": "AI Features", "openai_enabled": USE_OPENAI}


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8001"))
    reload = os.environ.get("RELOAD", "false").lower() == "true"
    uvicorn.run(app, host=host, port=port, reload=reload)
