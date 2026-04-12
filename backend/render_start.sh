#!/bin/bash
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

# NUCLEAR RESET: Phase One (Data Plane Purge)
echo "=== Step 0: Executing Phase One Data Plane Purge ==="
python bootstrap.py

# NUCLEAR RESET: Phase Three (Building 3NF Schema & Branding Migration History)
echo "=== Step 1: Performing 3NF Schema Rebuild (db.create_all) ==="
python -c "from app import create_app, db; app=create_app(); with app.app_context(): db.create_all()"

echo "=== Step 2: Branding Migration History (flask db stamp head) ==="
flask db stamp head || echo "Stamp failed - check if migrations directory is missing"

# STEP 3: Seed reference data (Phase Four)
echo "=== Step 3: Running seeders (RBAC Seeding) ==="
python seed_system_settings.py || echo "seed_system_settings skipped"
python seed_features.py || echo "seed_features skipped"
python seed_super_admin.py || echo "seed_super_admin skipped"

echo "=== Step 4: Starting Gunicorn Server ==="
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT run:app
