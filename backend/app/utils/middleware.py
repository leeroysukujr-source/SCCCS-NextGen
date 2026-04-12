from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from app.models import User

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
    if user.role == 'super_admin':
        return None

    # Check incoming workspace context
    # Usually passed in headers (X-Workspace-ID) or query params
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
