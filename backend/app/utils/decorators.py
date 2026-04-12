from functools import wraps
from flask import request, jsonify
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

                log = AuditLog(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
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
