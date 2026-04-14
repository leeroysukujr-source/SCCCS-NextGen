#!/bin/bash
# Standard Production Start Script
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

echo "=== System Boot Sequence Starting ==="
# 1. Synchronize Database Schema
echo "⚒️  Synchronizing database..."
python ensure_tables.py

# 2. Start Application
echo "🚀 Starting web server..."
# We rely on the Render Start Command for the primary execution
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT run:app

