"""
Advanced Security Models
"""
from datetime import datetime, timedelta
from app import db
import secrets
import hashlib

class UserSession(db.Model):
    """Track user sessions for security"""
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    session_token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='sessions')
    
    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(32)
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'is_active': self.is_active,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class TwoFactorAuth(db.Model):
    """Two-Factor Authentication"""
    __tablename__ = 'two_factor_auth'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    secret_key = db.Column(db.String(255), nullable=False)
    is_enabled = db.Column(db.Boolean, default=False)
    backup_codes = db.Column(db.Text)  # JSON array of backup codes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref='two_factor', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'is_enabled': self.is_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class AuditLog(db.Model):
    """Comprehensive audit logging"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    action = db.Column(db.String(100), nullable=False, index=True)  # create, update, delete, login, etc.
    resource_type = db.Column(db.String(50), index=True)  # user, class, channel, file
    resource_id = db.Column(db.Integer)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id'), nullable=True, index=True)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    details_data = db.Column(db.Text)  # JSON string
    status = db.Column(db.String(20), default='success')  # success, failed, error
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    user = db.relationship('User', backref='audit_logs')
    workspace = db.relationship('Workspace', backref='audit_logs')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'System',
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'workspace_id': self.workspace_id,
            'ip_address': self.ip_address,
            'details': json.loads(self.details_data) if self.details_data else {},
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class SecurityEvent(db.Model):
    """Track security-related events"""
    __tablename__ = 'security_events'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    event_type = db.Column(db.String(50), nullable=False, index=True)  # failed_login, suspicious_activity, etc.
    severity = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    details_data = db.Column(db.Text)  # JSON string
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    user = db.relationship('User', backref='security_events')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'user_id': self.user_id,
            'event_type': self.event_type,
            'severity': self.severity,
            'ip_address': self.ip_address,
            'details': json.loads(self.details_data) if self.details_data else {},
            'is_resolved': self.is_resolved,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

