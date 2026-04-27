# 1. CRITICAL: Eventlet Monkey Patching MUST be first
import eventlet
eventlet.monkey_patch()

import os
from flask_cors import CORS
from app import create_app, socketio

# Initialize the Flask application
flask_app = create_app()

# 2. Configure Global CORS (Pro-Standard Implementation)
# This covers all REST API routes and prevents "Multiple Values" errors.
CORS(flask_app, 
     resources={r"/*": {"origins": "*"}}, 
     supports_credentials=True,
     expose_headers=["Content-Type", "Authorization", "X-Workspace-ID"])

# 3. Ensure Socket.IO uses the same permissions
# (Already handled in app/__init__.py but we reinforce here for stability)
# socketio.init_app is called inside create_app()

# The entry point for Gunicorn (run:app)
# We use the flask_app directly because flask-socketio 
# automatically handles the /socket.io path when running under eventlet.
app = flask_app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    print(f"🚀 SCCCS NextGen High-Speed Server starting on port {port}...")
    
    # Start background workers (Health checks, etc.)
    try:
        from app.routes.health import start_background_tasks
        start_background_tasks()
    except Exception as e:
        print(f"⚠️ Warning: Could not start background tasks: {e}")
    
    # Run using the Socket.IO wrapper for maximum stability
    socketio.run(flask_app, host='0.0.0.0', port=port, debug=False)
