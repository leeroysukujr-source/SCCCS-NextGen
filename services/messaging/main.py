import os
import asyncio
import logging
from fastapi import FastAPI
import socketio

log = logging.getLogger('messaging')

# Async Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@app.get('/health')
async def health():
    return {'status': 'ok'}


@sio.event
async def connect(sid, environ, auth):
    log.info('Client connected: %s', sid)


@sio.event
async def disconnect(sid):
    log.info('Client disconnected: %s', sid)


@sio.event
async def join_room(sid, data):
    room = data.get('room')
    await sio.save_session(sid, {'room': room})
    await sio.enter_room(sid, room)
    await sio.emit('system', {'msg': f'user joined {room}'}, room=room)


@sio.event
async def leave_room(sid, data):
    room = data.get('room')
    await sio.leave_room(sid, room)
    await sio.emit('system', {'msg': f'user left {room}'}, room=room)


@sio.event
async def message(sid, data):
    room = data.get('room')
    text = data.get('text')
    await sio.emit('message', {'text': text, 'sid': sid}, room=room)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(socket_app, host='0.0.0.0', port=int(os.environ.get('PORT', 8001)))
