"""
Rate limiting utilities (simple in-memory implementation)
For production, consider using Flask-Limiter or Redis
"""
from functools import wraps
from flask import request, jsonify, g
from datetime import datetime, timedelta
from collections import defaultdict
import threading

# In-memory store for rate limiting
_rate_limit_store = defaultdict(list)
_rate_limit_lock = threading.Lock()

def rate_limit(max_requests: int = 60, window_seconds: int = 60):
    """
    Decorator to rate limit API endpoints
    
    Args:
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client identifier (IP address or user ID)
            client_id = request.remote_addr
            user_id = getattr(g, 'user_id', None) if hasattr(g, 'user_id') else None
            if user_id:
                client_id = f"user_{user_id}"
            
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=window_seconds)
            
            with _rate_limit_lock:
                # Clean old entries
                _rate_limit_store[client_id] = [
                    ts for ts in _rate_limit_store[client_id]
                    if ts > window_start
                ]
                
                # Check if limit exceeded
                if len(_rate_limit_store[client_id]) >= max_requests:
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'message': f'Maximum {max_requests} requests per {window_seconds} seconds',
                        'retry_after': window_seconds
                    }), 429
                
                # Record this request
                _rate_limit_store[client_id].append(now)
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def clear_rate_limits():
    """Clear all rate limit entries (useful for testing)"""
    global _rate_limit_store
    with _rate_limit_lock:
        _rate_limit_store.clear()



