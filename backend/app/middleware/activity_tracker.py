"""
Activity Tracking Middleware
"""
from flask import request, g
from app.utils.analytics import track_activity
from app.utils.audit import log_audit_event
from datetime import datetime

def track_request_activity():
    """Track API request activity"""
    if hasattr(g, 'user_id') and g.user_id:
        # Extract activity type from request
        activity_type = f"{request.method.lower()}_{request.endpoint.replace('.', '_')}"
        
        track_activity(
            user_id=g.user_id,
            activity_type=activity_type,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )

def track_user_action(user_id, action, resource_type=None, resource_id=None, details=None):
    """Track user action for analytics and audit"""
    track_activity(
        user_id=user_id,
        activity_type=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=details,
        ip_address=request.remote_addr if request else None,
        user_agent=request.headers.get('User-Agent') if request else None
    )
    
    log_audit_event(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details
    )

