"""
Health check and system status endpoints
"""
from flask import Blueprint, jsonify, current_app
from app import db
from app.models import User, Channel, Class, Room, Message
from datetime import datetime
import sys
import platform
import redis as redis_lib

# Optional imports - gracefully handle missing dependencies
try:
    from botocore.exceptions import ClientError
except Exception:
    ClientError = None

try:
    from app.utils.storage import get_s3_client
except Exception:
    # Storage client not available (boto3/botocore import issues)
    get_s3_client = None

import requests

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'SCCCS Backend API'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503

@health_bp.route('/status', methods=['GET'])
def system_status():
    """Comprehensive system status endpoint"""
    try:
        # Database status
        db_healthy = False
        try:
            db.session.execute(db.text('SELECT 1'))
            db_healthy = True
        except Exception:
            pass
        
        # Get system statistics
        stats = {}
        if db_healthy:
            try:
                stats = {
                    'users': User.query.count(),
                    'channels': Channel.query.count(),
                    'classes': Class.query.count(),
                    'rooms': Room.query.count(),
                    'messages': Message.query.count(),
                }
            except Exception:
                stats = {'error': 'Could not fetch statistics'}
        
        return jsonify({
            'status': 'operational' if db_healthy else 'degraded',
            'database': 'connected' if db_healthy else 'disconnected',
            'redis': 'unknown',
            's3': 'unknown',
            'timestamp': datetime.utcnow().isoformat(),
            'system': {
                'platform': platform.system(),
                'python_version': sys.version.split()[0],
                'architecture': platform.machine()
            },
            'statistics': stats
        }), 200 if db_healthy else 503
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503

@health_bp.route('/ready', methods=['GET'])
def readiness_check():
    """Kubernetes/Docker readiness probe"""
    try:
        # Check database connection
        db.session.execute(db.text('SELECT 1'))
        
        return jsonify({
            'ready': True,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception:
        return jsonify({
            'ready': False,
            'timestamp': datetime.utcnow().isoformat()
        }), 503

@health_bp.route('/live', methods=['GET'])
def liveness_check():
    """Kubernetes/Docker liveness probe - always returns healthy"""
    return jsonify({
        'alive': True,
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@health_bp.route('/socket/health', methods=['GET'])
def socket_health():
    """Best-effort Socket.IO health endpoint.

    Returns whether the Socket.IO server instance appears available and
    includes a best-effort connected clients count when possible.
    """
    try:
        from app import socketio
        server = getattr(socketio, 'server', None)
        clients = None
        if server is not None:
            try:
                # Depending on engine, manager.rooms structure may vary; attempt to count sids
                mgr = getattr(server, 'manager', None)
                if mgr is not None:
                    rooms = getattr(mgr, 'rooms', None)
                    if isinstance(rooms, dict):
                        # rooms: {namespace: {room: set(sids)}} -> count unique sids
                        sids = set()
                        for ns_rooms in rooms.values():
                            for room, sidset in ns_rooms.items():
                                try:
                                    for sid in sidset:
                                        sids.add(sid)
                                except TypeError:
                                    # sidset may be dict keys in some implementations
                                    for sid in sidset:
                                        sids.add(sid)
                        clients = len(sids)
            except Exception:
                clients = None

        return jsonify({
            'socket_server_available': server is not None,
            'connected_clients': clients
        }), 200
    except Exception as e:
        return jsonify({'socket_server_available': False, 'error': str(e)}), 500


@health_bp.route('/infra', methods=['GET'])
def infra_status():
    """Check Redis and S3/MinIO connectivity"""
    result = {'redis': False, 's3': False}
    # Redis
    try:
        r = redis_lib.from_url(current_app.config.get('REDIS_URL'))
        pong = r.ping()
        result['redis'] = True if pong else False
    except Exception as e:
        result['redis_error'] = str(e)

    # S3 (optional)
    try:
        if get_s3_client:
            s3 = get_s3_client()
            bucket = current_app.config.get('S3_BUCKET')
            try:
                s3.head_bucket(Bucket=bucket)
                result['s3'] = True
            except ClientError as ce:
                result['s3_error'] = f"Bucket access error: {str(ce)}"
        else:
            result['s3'] = None
            result['s3_note'] = 'Storage client not available (boto3 import failed)'
    except Exception as e:
        result['s3_error'] = str(e)

    return jsonify(result), 200


@health_bp.route('/api/health/socket/health', methods=['GET'])
def socket_health_api_alias():
    """Alias to support clients that call under `/api/health/...` path."""
    return socket_health()


@health_bp.route('/oauth/google', methods=['GET'])
def google_oauth_check():
    """Check Google OAuth authorization endpoint for redirect URI issues.

    This endpoint will call the local `/api/auth/oauth/google/authorize` endpoint
    to retrieve the generated `auth_url` and `redirect_uri`, then request the
    Google URL and inspect the response for common errors such as
    `redirect_uri_mismatch` or access blocked messages.
    """
    try:
        # Fetch the auth URL from our own authorize endpoint
        auth_meta = requests.get('http://localhost:5000/api/auth/oauth/google/authorize', headers={'Origin': 'http://localhost:5173'}, timeout=10)
        auth_meta.raise_for_status()
        meta = auth_meta.json()
        auth_url = meta.get('auth_url')
        redirect_uri = meta.get('redirect_uri')
    except Exception as e:
        return jsonify({'ok': False, 'error': 'failed_fetch_auth_metadata', 'details': str(e)}), 500

    if not auth_url:
        return jsonify({'ok': False, 'error': 'no_auth_url_returned', 'redirect_uri': redirect_uri}), 500

    try:
        resp = requests.get(auth_url, timeout=15, allow_redirects=True)
    except Exception as e:
        return jsonify({'ok': False, 'error': 'google_request_failed', 'details': str(e), 'redirect_uri': redirect_uri}), 502

    body = (resp.text or '').lower()
    result = {
        'ok': None,
        'status_code': resp.status_code,
        'final_url': resp.url,
        'history': [r.status_code for r in resp.history],
        'redirect_uri': redirect_uri
    }

    if 'redirect_uri_mismatch' in body or ('redirect_uri' in body and 'mismatch' in body):
        result['ok'] = False
        result['error'] = 'redirect_uri_mismatch'
        result['body_snippet'] = resp.text[:800]
        return jsonify(result), 400

    if "this app's request is invalid" in body or 'access blocked' in body:
        result['ok'] = False
        result['error'] = 'access_blocked'
        result['body_snippet'] = resp.text[:800]
        return jsonify(result), 400

    # If we end up on accounts.google.com (sign-in or consent), assume happy path
    if 'accounts.google.com' in resp.url and resp.status_code in (200, 302):
        result['ok'] = True
        return jsonify(result), 200

    # Ambiguous response
    result['ok'] = False
    result['error'] = 'unknown_response'
    result['body_snippet'] = resp.text[:800]
    return jsonify(result), 502



