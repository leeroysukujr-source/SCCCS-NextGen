#!/bin/bash
export SOCKETIO_ASYNC_MODE=eventlet
export LIVEKIT_AUTOSTART=false

# PHASE ONE: Data Plane Purge (Neon PostgreSQL)
echo "=== Step 0: Executing Phase One Data Plane Purge ==="
python bootstrap.py

# PHASE TWO: Manual Table Creation (3NF SQLAlchemy core)
echo "=== Step 1: Force-Creating Tables (db.create_all) ==="
python -c "from app import create_app, db; app=create_app(); with app.app_context(): db.create_all(); print('✅ ALL TABLES CREATED MANUALLY')"

# PHASE THREE: Migration Alignment
echo "=== Step 2: Aligning Migration History (flask db stamp head) ==="
flask db stamp head || echo "Stamp failed - check if migrations directory is missing"

# PHASE FOUR: SuperAdmin & RBAC Injection
echo "=== Step 3: Injecting SuperAdmin (globalimpactinnovators26@gmail.com) ==="
flask seed-superadmin --email globalimpactinnovators26@gmail.com --role SUPER_ADMIN

echo "=== Step 4: Seeding System Reference Data ==="
python seed_system_settings.py || echo "seed_system_settings skipped"
python seed_features.py || echo "seed_features skipped"

# PHASE FIVE: Server Initialization
echo "=== Step 5: Handoff to Gunicorn ==="
exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT run:app
