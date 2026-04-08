#!/bin/bash
# Export the eventlet monkey patch before starting gunicorn to avoid thread deadlocks
# and ensure the app uses the intended async_mode for Socket.IO.
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

# Automatically seed the database on remote deployment
echo "Running database seeders..."
python seed_system_settings.py
python seed_features.py
echo "Seeders completed."

# Start Gunicorn server binding to Render's allocated dynamic port
echo "Starting Gunicorn on Port ${PORT:-10000}..."
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-10000} run:app
