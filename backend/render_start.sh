#!/bin/bash
# Export the eventlet monkey patch before starting gunicorn
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

# Seed the database — all scripts use || to prevent crashing gunicorn on failure
echo "Running database seeders..."
python seed_system_settings.py || echo "seed_system_settings skipped"
python seed_features.py        || echo "seed_features skipped"
python seed_super_admin.py     || echo "seed_super_admin skipped"
echo "Seeders completed."

# Start Gunicorn
echo "Starting Gunicorn on Port ${PORT:-10000}..."
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-10000} run:app
