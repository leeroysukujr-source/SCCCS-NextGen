#!/bin/bash
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

# STEP 1: Ensure all DB tables exist (handles fresh Neon DB & duplicate index edge cases)
echo "=== Step 1: Ensuring DB schema ==="
python ensure_tables.py || echo "ensure_tables had errors (non-fatal)"

# STEP 2: Seed reference data
echo "=== Step 2: Running seeders ==="
python seed_system_settings.py || echo "seed_system_settings skipped"
python seed_features.py        || echo "seed_features skipped"
python seed_super_admin.py     || echo "seed_super_admin skipped"
echo "Seeders completed."

# STEP 3: Start Gunicorn
echo "=== Step 3: Starting Gunicorn on Port ${PORT:-10000} ==="
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-10000} run:app
