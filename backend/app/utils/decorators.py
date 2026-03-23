from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models import User

def permission_required(permission_name):
    """
    Decorator to enforce RBAC permissions.
    Expects JWT token to be present.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            if not user_id:
               return jsonify({'error': 'Unauthorized'}), 401
            
            user = User.query.get(user_id)
            if not user:
               return jsonify({'error': 'User not found'}), 404
               
            if not user.has_permission(permission_name):
                return jsonify({'error': 'Forbidden: Insufficient permissions'}), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator
