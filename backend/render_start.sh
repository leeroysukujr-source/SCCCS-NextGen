#!/bin/bash
# Export the eventlet monkey patch before starting gunicorn to avoid thread deadlocks
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

# Automatically seed the database on remote deployment
# Use || true so a DB connection failure doesn't block the server from starting
echo "Running database seeders..."
python seed_system_settings.py || echo "seed_system_settings skipped (DB may not be ready)"
python seed_features.py || echo "seed_features skipped (DB may not be ready)"
echo "Seeders completed."

# Start Gunicorn server binding to Render's allocated dynamic port
echo "Starting Gunicorn on Port ${PORT:-10000}..."
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-10000} run:app
