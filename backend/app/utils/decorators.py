from functools import wraps
from flask import request, jsonify, abort
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models.security import AuditLog
from app.models import User
import json

def audit_logger(action, resource_type):
    """
    Decorator to log critical actions to the audit_logs table.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            response = f(*args, **kwargs)
            
            # Only log successful or specifically tracked operations
            if isinstance(response, tuple):
                status_code = response[1]
            else:
                status_code = 200

            if 200 <= status_code < 300:
                user_id = get_jwt_identity()
                user = User.query.get(user_id) if user_id else None
                
                # Extract resource_id from kwargs if present (e.g., assignment_id)
                resource_id = None
                for key, value in kwargs.items():
                    if 'id' in key:
                        resource_id = value
                        break
                
                # Basic resource_id for audits
                res_id = resource_id if resource_id else None

                log = AuditLog(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=res_id,
                    workspace_id=user.workspace_id if user else None,
                    ip_address=request.remote_addr,
                    user_agent=request.user_agent.string,
                    details_data=json.dumps({
                        "method": request.method,
                        "path": request.path,
                        "args": dict(request.args),
                        "status_code": status_code
                    }),
                    status='success'
                )
                db.session.add(log)
                db.session.commit()
            
            return response
        return decorated_function
    return decorator

def permission_required(permission_name):
    """
    Decorator to verify if the current user has a specific permission.
    Supports granular RBAC within the jurisdictional workspace context.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({"error": "Authentication required"}), 401
                
            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User context not found"}), 404
                
            # Super Admin bypasses all specific permission checks
            if user.platform_role == 'SUPER_ADMIN':
                return f(*args, **kwargs)
                
            # Check user role permissions
            # Note: This logic assumes a relationship or set of roles/permissions on the User model
            has_permission = False
            
            # Check primary role permissions
            if hasattr(user, 'role_obj') and user.role_obj:
                for p in user.role_obj.permissions:
                    if p.name == permission_name:
                        has_permission = True
                        break
            
            # Check secondary roles if they exist
            if not has_permission and hasattr(user, 'roles'):
                for role in user.roles:
                    for p in role.permissions:
                        if p.name == permission_name:
                            has_permission = True
                            break
                            
            if not has_permission:
                return jsonify({
                    "error": "Forbidden",
                    "details": f"Missing required permission: {permission_name}"
                }), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
