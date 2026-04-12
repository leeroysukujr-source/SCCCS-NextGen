from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.models import User
from functools import wraps
from app.services.feature_flags import is_feature_enabled

def jurisdiction_check():
    """
    Middleware to verify cross-tenant isolation.
    Ensures that the request's workspace_id matches the user's authorized workspace.
    """
    # Skip for public routes or pre-auth routes if needed
    if request.endpoint in ['auth.login', 'auth.register', 'health.check']:
        return None

    user_id = get_jwt_identity()
    if not user_id:
        return None

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User context lost"}), 401

    # Super admins are exempt from jurisdictional lockdown
    if user.role == 'super_admin' or user.platform_role == 'SUPER_ADMIN':
        return None

    # Check incoming workspace context
    req_workspace_id = request.headers.get('X-Workspace-ID') or request.args.get('workspace_id')
    
    if req_workspace_id:
        try:
            if int(req_workspace_id) != user.workspace_id:
                return jsonify({
                    "error": "Jurisdiction Breach Detected",
                    "details": "Workspace mismatch. Access denied to unauthorized tenant data."
                }), 403
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid workspace context"}), 400

    return None

def feature_required(feature_name):
    """
    Decorator to check if a specific feature is enabled for the current workspace.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id) if user_id else None
            
            workspace_id = user.workspace_id if user else None
            
            if not is_feature_enabled(feature_name, workspace_id):
                return jsonify({
                    "error": "Feature Disabled",
                    "details": f"The feature '{feature_name}' is not enabled for this workspace."
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def platform_super_admin_required(f):
    """
    Decorator to ensure user is a platform super admin.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.platform_role != 'SUPER_ADMIN':
            return jsonify({"error": "Platform Super Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function
