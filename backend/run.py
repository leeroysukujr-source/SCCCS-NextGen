import os
import eventlet
import eventlet.wsgi
from flask_socketio import SocketIO
from app import create_app, socketio

# Ensure eventlet monkey patching happens FIRST
eventlet.monkey_patch()

flask_app = create_app()

class CORSMiddleware(object):
    """
    The Ultimate CORS Shield (DevOps Grade).
    This middleware wraps the entire WSGI stack (Flask + Socket.IO).
    It guarantees a single, clean set of CORS headers and prevents 500 crashes
    from ever reaching the browser without the correct permissions.
    """
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        origin = environ.get('HTTP_ORIGIN', '*')
        method = environ.get('REQUEST_METHOD', '')

        # Handle Preflight OPTIONS requests instantly
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
            # Clean existing CORS headers to prevent 'Multiple Values' errors
            new_headers = [h for h in headers if h[0].lower() not in [
                'access-control-allow-origin', 
                'access-control-allow-credentials',
                'access-control-allow-methods',
                'access-control-allow-headers',
                'access-control-max-age'
            ]]
            
            # Inject master security headers
            new_headers.append(('Access-Control-Allow-Origin', origin))
            new_headers.append(('Access-Control-Allow-Credentials', 'true'))
            new_headers.append(('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH'))
            new_headers.append(('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Workspace-ID, X-Requested-With, bypass-tunnel-reminder'))
            new_headers.append(('Access-Control-Max-Age', '3600'))
            
            return start_response(status, new_headers, exc_info)

        try:
            return self.app(environ, custom_start_response)
        except Exception as e:
            import traceback
            print(f"[CRITICAL] Server Crash Caught by Middleware: {e}")
            traceback.print_exc()
            custom_start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
            return [f"Internal Server Error: {str(e)}".encode('utf-8')]

# 1. Create the base Socket.IO WSGI app
socketio_app = socketio.WSGIApp(socketio, flask_app)

# 2. Wrap it in our Master CORS Shield
app = CORSMiddleware(socketio_app)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    print(f"🚀 Master Server starting on port {port}...")
    
    # Run in background tasks if needed
    from app.routes.health import start_background_tasks
    start_background_tasks()
    
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', port)), app)
