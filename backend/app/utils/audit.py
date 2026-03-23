"""
Audit Logging Utilities
"""
from datetime import datetime
from flask import request
from app import db
from app.models.security import AuditLog, SecurityEvent
import json

def log_audit_event(user_id, action, resource_type=None, resource_id=None, 
                   details=None, status='success', workspace_id=None):
    """Log an audit event"""
    try:
        # Infer workspace_id if not provided
        if not workspace_id and user_id:
            from app.models import User
            user = User.query.get(user_id)
            if user:
                workspace_id = user.workspace_id

        audit = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            workspace_id=workspace_id,
            ip_address=request.remote_addr if request else None,
            user_agent=request.headers.get('User-Agent') if request else None,
            details_data=json.dumps(details) if details else None,
            status=status
        )
        db.session.add(audit)
        db.session.commit()
        return audit
    except Exception as e:
        db.session.rollback()
        print(f"Error logging audit event: {e}")
        return None

def log_security_event(user_id, event_type, severity='medium', details=None):
    """Log a security-related event"""
    try:
        event = SecurityEvent(
            user_id=user_id,
            event_type=event_type,
            severity=severity,
            ip_address=request.remote_addr if request else None,
            user_agent=request.headers.get('User-Agent') if request else None,
            details=json.dumps(details) if details else None
        )
        db.session.add(event)
        db.session.commit()
        return event
    except Exception as e:
        db.session.rollback()
        print(f"Error logging security event: {e}")
        return None

def get_audit_logs(user_id=None, resource_type=None, action=None, limit=100):
    """Get audit logs with filters"""
    query = AuditLog.query
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if action:
        query = query.filter(AuditLog.action == action)
    
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()

