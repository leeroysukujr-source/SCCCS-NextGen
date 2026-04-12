from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models import User
from functools import wraps
from app.services.feature_flags import is_feature_enabled

def jurisdiction_check():
    """
    Middleware to verify cross-tenant isolation.
    Ensures that the request's workspace_id matches the user's authorized workspace.
    """
    # 1. Skip check for CORS preflight (OPTIONS)
    if request.method == "OPTIONS":
        return None

    # 2. Define Public Routes that don't need a token
    public_endpoints = [
        'auth.login', 
        'auth.register', 
        'auth.firebase_login', 
        'static', 
        'health.check', 
        'health_check'
    ]
    
    if request.endpoint in public_endpoints or not request.endpoint:
        return None

    # 3. Attempt to verify JWT; if it fails, let @jwt_required handles it on the route
    try:
        # verify_jwt_in_request is already called if the route has @jwt_required
        # but since this is a before_request, we check optionally
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if not user_id:
            return None # Not logged in yet, let the route catch it
            
        user = User.query.get(user_id)
        if not user:
            return None # User context lost, let JWT session handling deal with it
            
        # Super admins are exempt from jurisdictional lockdown
        if user.role == 'super_admin' or user.platform_role == 'SUPER_ADMIN':
            return None

        # 4. Check incoming workspace context
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

    except Exception:
        # Verification failed or another error, skip jurisdiction check
        return None

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

def workspace_required(f):
    """
    Decorator to ensure the user has access to the workspace specified in the URL.
    Used for institutional management and jurisdictional data access.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Authentication required"}), 401
            
        # Super admins have global access
        if user.platform_role == 'SUPER_ADMIN':
            return f(*args, **kwargs)
            
        # Check against workspace_id in URL/kwargs
        workspace_id = kwargs.get('workspace_id')
        if workspace_id and int(user.workspace_id) != int(workspace_id):
            return jsonify({
                "error": "Jurisdictional Access Denied",
                "details": "You do not have permission to manage this workspace."
            }), 403
            
        return f(*args, **kwargs)
    return decorated_function

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
