#!/bin/bash
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

# STEP 1: Nuclear Blueprint Bootstrap (Fresh isolated schema)
echo "=== Step 1: Running Blueprint Bootstrap ==="
python bootstrap.py || echo "Bootstrap had errors (non-fatal)"

# STEP 2: Seed reference data
echo "=== Step 2: Running seeders ==="
python seed_system_settings.py || echo "seed_system_settings skipped"
python seed_features.py        || echo "seed_features skipped"
python seed_super_admin.py     || echo "seed_super_admin skipped"
echo "Seeders completed."

# STEP 3: Stabilization Delay
# Gives Neon/SQLAlchemy time to settle after the total schema reconstruction
echo "=== Step 3: Stabilization Pause (10s) ==="
sleep 10
echo "Database settled. Starting server..."

# STEP 4: Start Gunicorn
echo "=== Step 3: Starting Gunicorn on Port ${PORT:-10000} ==="
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-10000} run:app
