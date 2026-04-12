#!/bin/bash
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

# STABILIZATION MODE: Your data is now persistent.
echo "=== Step 1: Aligning Migration State ==="
flask db stamp head || echo "Migration state already aligned."

# PHASE ONE: Surgical Elevation (globalimpactinnovators26@gmail.com)
echo "=== Step 2: Elevating Root SuperAdmin ==="
python elevate_admin.py

# PHASE FOUR: Ensure System Reference Data
echo "=== Step 3: Seeding System Reference Data ==="
python seed_system_settings.py || echo "seed_system_settings skipped"
python seed_features.py || echo "seed_features skipped"

# PHASE FIVE: Production Server Start
echo "=== Step 4: Starting Gunicorn Server ==="
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT run:app
