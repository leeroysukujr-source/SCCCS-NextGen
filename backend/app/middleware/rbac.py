from functools import wraps
from flask import abort, request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models import User

def check_jurisdiction(resource_workspace_id):
    """
    Core Jurisdiction Logic (Two-Tier Power Structure)
    Instruction: Update the check_jurisdiction decorator to handle the two-tier power structure:
    Tier 1 (SuperAdmin): Global bypass for all endpoints.
    Tier 2 (Workspace Admin): Must match the workspace_id of the resource they are modifying.
    """
    try:
        user_id = get_jwt_identity()
        if not user_id:
            # If verify_jwt_in_request hasn't been called, we might need to do it here
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            
        if not user_id:
            abort(401, "Authentication required")
            
        user = User.query.get(user_id)
        if not user:
            abort(404, "User context lost")

        # Tier 1 (SuperAdmin): Full Jurisdiction Bypass
        is_super = user.role == 'super_admin' or getattr(user, 'platform_role', '') == 'SUPER_ADMIN' or getattr(user, 'is_superadmin', False)
        if is_super:
            return True 

        # Tier 2 (Workspace Admin): Workspace Jurisdiction
        if user.role == 'admin' and user.workspace_id and resource_workspace_id:
            if int(user.workspace_id) == int(resource_workspace_id):
                return True 
        
        abort(403, "Jurisdiction Denied: Unauthorized access to this workspace resource.")
    except Exception as e:
        if hasattr(e, 'code'):
            raise e
        abort(403, f"Jurisdiction Denied: {str(e)}")

def require_jurisdiction(resource_workspace_id=None):
    """
    Decorator to enforce strict "Jurisdiction" access control.
    If resource_workspace_id is not provided, it attempts to extract from URL kwargs.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Resolve the workspace context: prioritized from decorator arg, then URL kwargs, then query/header
            ws_context = resource_workspace_id
            if ws_context is None:
                ws_context = kwargs.get('workspace_id') or kwargs.get('ws_id')
                
            if ws_context is None:
                ws_context = request.args.get('workspace_id') or request.headers.get('X-Workspace-ID')

            try:
                if ws_context:
                    ws_context = int(ws_context)
            except (ValueError, TypeError):
                ws_context = None

            check_jurisdiction(ws_context)
            return f(*args, **kwargs)
        return decorated_function
    return decorator
