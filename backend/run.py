# 1. MUST BE FIRST: Eventlet Monkey Patching
import eventlet
eventlet.monkey_patch()

import os
import sys
import traceback
from app import create_app, socketio

# Initialize the Flask application
flask_app = create_app()

class CORSMiddleware(object):
    """
    The Ultimate CORS Shield (Production Grade).
    Handles all security headers for REST, Socket.IO, and File Uploads.
    """
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        origin = environ.get('HTTP_ORIGIN', '*')
        method = environ.get('REQUEST_METHOD', '')

        # Handle Preflight OPTIONS requests instantly at the WSGI layer
        if method == 'OPTIONS':
            start_response('200 OK', [
                ('Access-Control-Allow-Origin', origin),
                ('Access-Control-Allow-Credentials', 'true'),
                ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH'),
                ('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Workspace-ID, X-Requested-With, bypass-tunnel-reminder'),
                ('Access-Control-Max-Age', '3600'),
                ('Content-Length', '0'),
                ('Content-Type', 'text/plain')
            ])
            return [b'']

        def custom_start_response(status, headers, exc_info=None):
            # Clean existing CORS headers to prevent browser-side 'Multiple Values' errors
            new_headers = [h for h in headers if h[0].lower() not in [
                'access-control-allow-origin', 
                'access-control-allow-credentials',
                'access-control-allow-methods',
                'access-control-allow-headers',
                'access-control-max-age'
            ]]
            
            # Inject master security headers (Reflecting the requester's origin)
            new_headers.append(('Access-Control-Allow-Origin', origin))
            new_headers.append(('Access-Control-Allow-Credentials', 'true'))
            new_headers.append(('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH'))
            new_headers.append(('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Workspace-ID, X-Requested-With, bypass-tunnel-reminder'))
            new_headers.append(('Access-Control-Max-Age', '3600'))
            
            return start_response(status, new_headers, exc_info)

        try:
            # Pass the request through to the Flask/Socket.IO stack
            return self.app(environ, custom_start_response)
        except Exception as e:
            print(f"[CRITICAL] WSGI Stack Crash: {str(e)}")
            traceback.print_exc()
            # Emergency fallback response with CORS headers (so frontend can see the error)
            custom_start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
            return [f"Internal Server Error: {str(e)}".encode('utf-8')]

# Wrap the Flask app (which already contains Socket.IO) in the Shield
app = CORSMiddleware(flask_app)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    print(f"🚀 SCCCS NextGen Master Server starting on port {port}...")
    
    # Initialize background tasks for health checks and message workers
    try:
        from app.routes.health import start_background_tasks
        start_background_tasks()
    except Exception as e:
        print(f"⚠️ Warning: Could not start background tasks: {e}")
    
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', port)), app)
