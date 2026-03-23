from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity
from app.models import User, Workspace
from app.utils.roles import is_super_admin, is_workspace_member

def platform_super_admin_required(f):
    """Decorator to ensure user has platform SUPER_ADMIN role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.platform_role != 'SUPER_ADMIN':
            return jsonify({"error": "Platform Super Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function

def workspace_required(f):
    """Decorator to ensure user belongs to the requested workspace"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Workspace ID can be in URL or payload
        workspace_id = kwargs.get('workspace_id') or request.view_args.get('workspace_id')
        if not workspace_id and request.is_json:
            workspace_id = request.json.get('workspace_id')
            
        if not workspace_id:
            return jsonify({"error": "Workspace ID required"}), 400
            
        if not is_workspace_member(user, int(workspace_id)):
            return jsonify({"error": "You do not have access to this workspace"}), 403
            
        return f(*args, **kwargs)
    return decorated_function

def feature_required(feature_name):
    """Decorator to ensure a specific feature is enabled for the context workspace"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Allow OPTIONS requests to pass through for CORS preflight
            if request.method == 'OPTIONS':
                return f(*args, **kwargs)

            # Try to get workspace_id from various sources
            workspace_id = kwargs.get('workspace_id') or request.view_args.get('workspace_id')
            if not workspace_id and request.is_json:
                workspace_id = request.json.get('workspace_id')
            
            # If still no workspace_id, try to get from current user (if logged in)
            if not workspace_id:
                from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
                from app.models import User
                try:
                    verify_jwt_in_request(optional=True)
                    user_id = get_jwt_identity()
                    if user_id:
                        user = User.query.get(user_id)
                        if user:
                            workspace_id = user.workspace_id
                except Exception:
                    pass
            
            from app.services.feature_flags import is_feature_enabled
            if not is_feature_enabled(feature_name, workspace_id):
                return jsonify({"error": f"Feature '{feature_name}' is disabled"}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
